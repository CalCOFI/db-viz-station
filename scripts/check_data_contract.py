#!/usr/bin/env python3
"""Assert that public/data/*.json carries the columns public/app.js indexes on.

Nothing else in this repo checks that a build script's output and the front-end
loader still agree, and the failure mode is silent on both sides. build_stations.sql
emitted taxon_coverage.json without a dataset_key column while app.js indexed it as
`r.dataset_key + '::' + r.aphia_id`; every one of 27,909 rows landed under the
literal string "undefined::<aphia_id>", no lookup ever matched, and the page loaded
clean while fetching 3.4 MB to do nothing. No test, no console error, no visual
symptom — every taxon just quietly reported dataset-wide station counts, which is
the exact bug the file was added to fix.

So: name the contract, and fail the build when either side drifts from it. This is
deliberately a shape check, not a data-quality check — it answers "can app.js index
this file?", not "are the numbers right".

    python3 scripts/check_data_contract.py

Exits non-zero and prints every violation (not just the first) on failure.
"""

import gzip
import json
import sys
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "public" / "data"

# file -> (required keys, whether app.js can run without the file at all).
# `optional` mirrors app.js's tolerant `.then(r => r.ok ? r.json() : [])` pattern:
# those files may be absent (a fork, a preview, a deploy predating the artifact),
# but when present they must carry the full column set.
CONTRACT = {
    "stations.json": {
        "keys": {"grid_key", "station_id", "lat", "lon", "datasets"},
        "optional": False,
    },
    "variables.json": {
        "keys": {"variable_id", "dataset_key", "variable_type", "name",
                 "display_name", "aphia_id"},
        "optional": False,
    },
    # indexed as dataset_key + '::' + aphia_id, with `years` feeding the year slider
    "taxon_coverage.json.gz": {
        "keys": {"dataset_key", "grid_key", "aphia_id", "years"},
        "optional": True,
    },
    "datasets_meta.json": {
        "keys": {"dataset_key", "dataset_name", "url"},
        "optional": True,
    },
    "decades.json": {
        "keys": {"dataset_key", "station_id", "decade"},
        "optional": True,
    },
    "bottle_cast_coverage.json": {
        "keys": {"grid_key", "subset"},
        "optional": True,
    },
    "bathymetry.json": {
        "keys": {"grid_key"},
        "optional": True,
    },
}

# Cross-file referential checks: a key in one file that must resolve in another.
# Catches the drift that column presence alone cannot — e.g. a coverage file
# frozen under a dataset_key the release has since renamed, which reads as a
# perfectly well-formed file whose every lookup misses.
JOINS = [
    ("taxon_coverage.json.gz", "grid_key", "stations.json", "grid_key"),
    ("decades.json", "station_id", "stations.json", "station_id"),
    ("bottle_cast_coverage.json", "grid_key", "stations.json", "grid_key"),
]


def load(name):
    p = DATA / name
    if not p.exists():
        return None
    raw = gzip.decompress(p.read_bytes()) if name.endswith(".gz") else p.read_bytes()
    return json.loads(raw)


def main():
    errors, notes = [], []
    loaded = {}

    for name, spec in CONTRACT.items():
        rows = load(name)
        if rows is None:
            if spec["optional"]:
                notes.append(f"absent (optional): {name}")
            else:
                errors.append(f"{name}: MISSING — app.js cannot start without it")
            continue
        if not isinstance(rows, list) or not rows:
            errors.append(f"{name}: expected a non-empty JSON array")
            continue
        loaded[name] = rows
        present = set(rows[0].keys())
        missing = spec["keys"] - present
        if missing:
            errors.append(
                f"{name}: missing {sorted(missing)} — present: {sorted(present)}"
            )
        # a column that is present but null on every row indexes just as badly
        for key in spec["keys"] & present:
            if all(r.get(key) is None for r in rows):
                errors.append(f"{name}: column '{key}' is null on all {len(rows)} rows")

    for src, src_key, dst, dst_key in JOINS:
        if src not in loaded or dst not in loaded:
            continue
        # A null join key and a mismatched one are different bugs — the first is a
        # row that was never gridded, the second a row keyed to something the
        # release renamed — so report them apart rather than as one "e.g. None".
        n_null = sum(1 for r in loaded[src] if r.get(src_key) is None)
        if n_null:
            errors.append(
                f"{src}: {n_null} row(s) have a null {src_key} and can never "
                f"match a {dst} record"
            )
        target = {r.get(dst_key) for r in loaded[dst]}
        orphans = {r.get(src_key) for r in loaded[src] if r.get(src_key) is not None} - target
        if orphans:
            sample = sorted(str(o) for o in orphans)[:5]
            errors.append(
                f"{src}.{src_key} has {len(orphans)} value(s) absent from "
                f"{dst}.{dst_key}, e.g. {sample}"
            )

    # version.json is not a row array, so it sits outside CONTRACT — but it is
    # what every data URL's cache-busting key is built from (app.js dataUrl()).
    # Missing `built` silently degrades the key back to release-only, which is
    # the stale-data bug it exists to prevent.
    ver = DATA / "version.json"
    if not ver.exists():
        notes.append("absent (optional): version.json — data URLs will not be cache-busted")
    else:
        v = json.loads(ver.read_text())
        for field in ("release", "built"):
            if not v.get(field):
                errors.append(f"version.json: missing '{field}' — dataUrl() cache key degrades")

    for n in notes:
        print(f"  note: {n}")
    if errors:
        print(f"\nFAIL — {len(errors)} data-contract violation(s):", file=sys.stderr)
        for e in errors:
            print(f"  - {e}", file=sys.stderr)
        return 1
    print(f"\nOK — {len(loaded)} data file(s) match the contract app.js indexes on")
    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Assert build_stations_local.sql still mirrors build_stations.sql.

build_stations_local.sql exists for one contributor's environment (Windows
Application Control refusing DuckDB's spatial extension DLL) and is by design a
copy of build_stations.sql with a different `grid` derivation. Everything from
the `obs` table down — the coverage, cruise, and taxon logic that actually
shapes the published JSON — is supposed to be identical, and nothing enforced
that: PR #15 already had to mirror the cruises.json split into both files by
hand, and a change applied to only one of them would ship different data
depending on which machine ran the build, with no error anywhere.

So: same guard pattern as check_data_contract.py. Comments and whitespace may
differ freely (the local file explains itself at length); the SQL may not.
Statements are compared comment-stripped and whitespace-normalized, from the
first `CREATE TEMP TABLE obs` statement to end of file. Everything before that
anchor — headers, extension loading, the r() macro, the `grid` table — is the
documented divergence and is not compared.

    python3 scripts/check_local_variant.py

Exits non-zero naming the first differing statement on drift.
"""

import re
import sys
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
CANONICAL = SCRIPTS / "build_stations.sql"
LOCAL = SCRIPTS / "build_stations_local.sql"

ANCHOR = "CREATE TEMP TABLE obs"
# if the anchored tail doesn't write all three artifacts, the anchor grabbed
# the wrong region and equality would be vacuous — fail loudly instead
EXPECTED_TARGETS = ["stations.json", "cruises.json", "taxon_coverage.json"]


def statements(path):
    """Comment-stripped, whitespace-normalized SQL statements, in order."""
    text = path.read_text()
    out, i, n = [], 0, len(text)
    in_str = in_line_comment = in_block_comment = False
    while i < n:
        c = text[i]
        nxt = text[i + 1] if i + 1 < n else ""
        if in_line_comment:
            if c == "\n":
                in_line_comment = False
                out.append(" ")
        elif in_block_comment:
            if c == "*" and nxt == "/":
                in_block_comment = False
                i += 1
        elif in_str:
            out.append(c)
            if c == "'":
                if nxt == "'":  # escaped quote inside a string
                    out.append(nxt)
                    i += 1
                else:
                    in_str = False
        elif c == "-" and nxt == "-":
            in_line_comment = True
        elif c == "/" and nxt == "*":
            in_block_comment = True
            i += 1
        elif c == "'":
            in_str = True
            out.append(c)
        else:
            out.append(c)
        i += 1
    stripped = "".join(out)
    # ';' never appears inside these files' string literals (the scanner above
    # keeps strings intact, so a future one would only over-split and fail
    # loudly, not pass silently)
    stmts = [re.sub(r"\s+", " ", s).strip() for s in stripped.split(";")]
    return [s for s in stmts if s]


def shared_tail(stmts, name):
    for idx, s in enumerate(stmts):
        if s.upper().startswith(ANCHOR.upper()):
            return stmts[idx:]
    sys.exit(f"FAIL — {name}: no '{ANCHOR}' statement; the anchor this check "
             f"compares from is gone, update scripts/check_local_variant.py")


def main():
    a = shared_tail(statements(CANONICAL), CANONICAL.name)
    b = shared_tail(statements(LOCAL), LOCAL.name)
    joined = " ".join(a)
    for t in EXPECTED_TARGETS:
        if t not in joined:
            sys.exit(f"FAIL — {CANONICAL.name}'s shared tail no longer writes "
                     f"{t}; anchor region is wrong, update this check")
    for i, (sa, sb) in enumerate(zip(a, b)):
        if sa != sb:
            print(f"FAIL — statement {i + 1} after the '{ANCHOR}' anchor "
                  f"differs:", file=sys.stderr)
            print(f"  {CANONICAL.name}: {sa[:200]}", file=sys.stderr)
            print(f"  {LOCAL.name}:     {sb[:200]}", file=sys.stderr)
            print("The two files must stay mirrored below the grid table — "
                  "apply the change to both.", file=sys.stderr)
            return 1
    if len(a) != len(b):
        longer = CANONICAL.name if len(a) > len(b) else LOCAL.name
        print(f"FAIL — {longer} has {abs(len(a) - len(b))} extra statement(s) "
              f"after the shared ones; apply the change to both files.",
              file=sys.stderr)
        return 1
    print(f"OK — {len(a)} shared statements match between "
          f"{CANONICAL.name} and {LOCAL.name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

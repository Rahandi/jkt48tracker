"""Load a MySQL dump (gz) into the backend's SQLite database.

Usage: python load_dump.py DUMP.sql.gz   (run from the directory where jkt48tracker.db should live;
PYTHONPATH must include the backend dir so the models can be imported)
"""
import gzip
import re
import sys

from sqlalchemy import text

from database import database
from models.base import metadata
import models.member, models.theater_schedule, models.theater_schedule_member, models.contribution  # noqa: F401

ESCAPES = {"n": "\n", "r": "\r", "t": "\t", "0": "\0", "b": "\b", "Z": "\x1a"}


def parse_values(s: str, i: int):
    """Parse '(..),(..),...;' starting at s[i]; return list of row tuples and the end index."""
    rows = []
    n = len(s)
    while i < n:
        while s[i] in " \n,":
            i += 1
        if s[i] == ";":
            return rows, i + 1
        assert s[i] == "(", s[i : i + 40]
        i += 1
        row = []
        while True:
            c = s[i]
            if c == "'":
                i += 1
                buf = []
                while True:
                    c = s[i]
                    if c == "\\":
                        nxt = s[i + 1]
                        buf.append(ESCAPES.get(nxt, nxt))
                        i += 2
                    elif c == "'":
                        if s[i + 1] == "'":
                            buf.append("'")
                            i += 2
                        else:
                            i += 1
                            break
                    else:
                        buf.append(c)
                        i += 1
                row.append("".join(buf))
            else:
                m = re.compile(r"[^,)]+").match(s, i)
                tok = m.group(0)
                i = m.end()
                if tok == "NULL":
                    row.append(None)
                elif re.fullmatch(r"-?\d+", tok):
                    row.append(int(tok))
                elif re.fullmatch(r"-?\d*\.\d+(e[+-]?\d+)?", tok, re.I):
                    row.append(float(tok))
                else:
                    row.append(tok)
            if s[i] == ",":
                i += 1
                continue
            assert s[i] == ")", s[i : i + 40]
            i += 1
            break
        rows.append(tuple(row))
    return rows, i


def main(path: str):
    sql = gzip.open(path, "rt", encoding="utf-8").read()
    # column order per table, from the dump's own CREATE TABLE statements
    cols = {}
    for m in re.finditer(r"CREATE TABLE `(\w+)` \((.*?)\n\) ENGINE", sql, re.S):
        cols[m.group(1)] = re.findall(r"^\s+`(\w+)`", m.group(2), re.M)

    metadata.drop_all(database.engine)
    metadata.create_all(database.engine)

    counts = {}
    with database.engine.begin() as conn:
        for m in re.finditer(r"INSERT INTO `(\w+)`(?: \([^)]*\))? VALUES ", sql):
            table = m.group(1)
            rows, _ = parse_values(sql, m.end())
            names = cols[table]
            existing = {r[1] for r in conn.execute(text(f'PRAGMA table_info("{table}")')).fetchall()}
            if not existing:  # e.g. alembic_version: not an app model, not needed
                continue
            use = [(k, n) for k, n in enumerate(names) if n in existing]
            q = text(
                f'INSERT INTO "{table}" ({",".join(n for _, n in use)}) '
                f'VALUES ({",".join(":" + n for _, n in use)})'
            )
            conn.execute(q, [{n: r[k] for k, n in use} for r in rows])
            counts[table] = counts.get(table, 0) + len(rows)
    print("loaded rows:", counts)


if __name__ == "__main__":
    main(sys.argv[1])

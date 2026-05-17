"""
Snapshot and verify member show counts.

  --save   Fetch current stats from the API and write tool/checkpoint.json
  --check  Compare current stats against the saved checkpoint; exits 1 if any count decreased

Usage:
  python3 tool/checkpoint.py --save
  python3 tool/checkpoint.py --check
"""
import json
import os
import sys
from datetime import datetime, timezone, timedelta

import requests
from dotenv import load_dotenv

load_dotenv()

sys.path.insert(0, os.path.dirname(__file__))
from tweet_shows import PUBLIC_API_URL

CHECKPOINT_PATH = os.path.join(os.path.dirname(__file__), "checkpoint.json")
WIB = timezone(timedelta(hours=7))


def _fetch_stats() -> dict[str, dict]:
    res = requests.get(f"{PUBLIC_API_URL}/theater-schedules/member-stats", timeout=10)
    res.raise_for_status()
    return {
        r["jkt48_id"]: {"name": r["name"], "show_count": r["show_count"]}
        for r in res.json()
        if r.get("jkt48_id")
    }


def save():
    members = _fetch_stats()
    checkpoint = {
        "saved_at": datetime.now(WIB).isoformat(),
        "members": members,
    }
    with open(CHECKPOINT_PATH, "w") as f:
        json.dump(checkpoint, f, indent=2, ensure_ascii=False)
    print(f"Saved {len(members)} members to {CHECKPOINT_PATH}")
    print(f"Timestamp: {checkpoint['saved_at']}")


def check():
    if not os.path.exists(CHECKPOINT_PATH):
        print(f"No checkpoint found at {CHECKPOINT_PATH}. Run --save first.", file=sys.stderr)
        sys.exit(1)

    with open(CHECKPOINT_PATH) as f:
        checkpoint = json.load(f)

    saved_at = checkpoint["saved_at"]
    saved = checkpoint["members"]
    current = _fetch_stats()

    decreased = []
    increased = []
    missing = []
    new_members = []

    for jkt48_id, snap in saved.items():
        if jkt48_id not in current:
            missing.append((jkt48_id, snap["name"], snap["show_count"]))
            continue
        delta = current[jkt48_id]["show_count"] - snap["show_count"]
        if delta < 0:
            decreased.append((jkt48_id, snap["name"], snap["show_count"], current[jkt48_id]["show_count"], delta))
        elif delta > 0:
            increased.append((jkt48_id, snap["name"], snap["show_count"], current[jkt48_id]["show_count"], delta))

    for jkt48_id, info in current.items():
        if jkt48_id not in saved:
            new_members.append((jkt48_id, info["name"], info["show_count"]))

    print(f"Checkpoint from: {saved_at}")
    print(f"Checked {len(saved)} saved members against {len(current)} current members")
    print()

    if decreased:
        print(f"ERRORS — {len(decreased)} member(s) with DECREASED count:")
        for jkt48_id, name, old, new, delta in decreased:
            print(f"  ✗ {name} ({jkt48_id}): {old} → {new} ({delta})")
        print()

    if missing:
        print(f"WARNINGS — {len(missing)} member(s) missing from current API:")
        for jkt48_id, name, count in missing:
            print(f"  ? {name} ({jkt48_id}): was {count}")
        print()

    if increased:
        print(f"INFO — {len(increased)} member(s) with increased count:")
        for jkt48_id, name, old, new, delta in increased:
            print(f"  + {name}: {old} → {new} (+{delta})")
        print()

    if new_members:
        print(f"INFO — {len(new_members)} new member(s) not in checkpoint:")
        for jkt48_id, name, count in new_members:
            print(f"  + {name} ({jkt48_id}): {count}")
        print()

    if not decreased and not missing:
        print("OK — no decreases or missing members detected.")

    sys.exit(1 if decreased else 0)


if __name__ == "__main__":
    if "--save" in sys.argv:
        save()
    elif "--check" in sys.argv:
        check()
    else:
        print(__doc__)
        sys.exit(1)

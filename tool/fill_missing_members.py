"""
Re-fetches member data for all past shows that currently have 0 members.
Groups by month to minimise API calls to jkt48.com.
"""
import os
import re
import time
from collections import defaultdict

import requests
from dotenv import load_dotenv

load_dotenv()

BASE_URL = "https://jkt48.com"
BACKEND_URL = os.getenv("INTERNAL_API_URL", "http://localhost:8000/internal")
API_KEY = os.getenv("INTERNAL_API_KEY", "")
PUBLIC_URL = os.getenv("PUBLIC_API_URL", "http://localhost:8000/api")


def _make_jkt48_id(name: str, member_id: int) -> str:
    slug = re.sub(r"\s+", "-", name.lower().strip())
    return f"{slug}-{member_id}"


def get_missing_shows() -> list[dict]:
    """Fetch all past shows with 0 members from our own API."""
    shows = []
    offset = 0
    limit = 200
    while True:
        resp = requests.get(
            f"{PUBLIC_URL}/theater-schedules/",
            params={"past": "true", "no_members": "true", "limit": limit, "offset": offset},
            timeout=30,
        )
        resp.raise_for_status()
        batch = resp.json()
        if not batch:
            break
        shows.extend(batch)
        if len(batch) < limit:
            break
        offset += limit
    return shows


def get_month_links(year: int, month: int) -> dict[str, str]:
    """Returns {schedule_id: link} for all SHOW entries in a given month."""
    resp = requests.get(
        f"{BASE_URL}/api/v1/schedules",
        params={"lang": "id", "month": month, "year": year},
        timeout=15,
    )
    resp.raise_for_status()
    result = {}
    for item in resp.json().get("data", []):
        if item.get("type") == "SHOW":
            result[str(item["schedule_id"])] = item.get("link", "")
    return result


def fetch_members(link: str) -> list[dict]:
    resp = requests.get(
        f"{BASE_URL}/api/v1/schedules/{link}",
        params={"lang": "id"},
        timeout=20,
    )
    resp.raise_for_status()
    data = resp.json().get("data", {})
    return [
        {"name": m["name"], "jkt48_id": _make_jkt48_id(m["name"], m["member_id"])}
        for m in data.get("jkt48_member", [])
    ]


def sync_show(jkt48_schedule_id: str, members: list[dict]) -> None:
    resp = requests.post(
        f"{BACKEND_URL}/theater-schedules/sync",
        json=[{"jkt48_schedule_id": jkt48_schedule_id, "members": members}],
        headers={"X-API-Key": API_KEY},
        timeout=30,
    )
    resp.raise_for_status()


def main():
    print("Fetching shows with missing members...")
    shows = get_missing_shows()
    print(f"Found {len(shows)} shows to check.\n")

    # Group by (year, month) so we can batch the schedule-list API calls
    by_month: dict[tuple, list[dict]] = defaultdict(list)
    for s in shows:
        if not s.get("show_date"):
            continue
        y, m, _ = s["show_date"].split("-")
        by_month[(int(y), int(m))].append(s)

    filled = 0
    still_empty = 0
    errors = 0

    for (year, month), month_shows in sorted(by_month.items()):
        print(f"{year}-{month:02d}: {len(month_shows)} missing shows", end="", flush=True)
        try:
            links = get_month_links(year, month)
        except Exception as e:
            print(f" — schedule list error: {e}")
            errors += len(month_shows)
            continue
        time.sleep(0.4)

        for s in month_shows:
            sid = s["jkt48_schedule_id"]
            link = links.get(sid)
            if not link:
                print(f"\n  [{sid}] no link in API (skipped)")
                still_empty += 1
                continue

            try:
                members = fetch_members(link)
                time.sleep(0.8)
            except Exception as e:
                print(f"\n  [{sid}] detail error: {e}")
                errors += 1
                continue

            if not members:
                still_empty += 1
                continue

            try:
                sync_show(sid, members)
                print(f"\n  [{sid}] {s['show_date']} {s['setlist_name']} → {len(members)} members synced")
                filled += 1
            except Exception as e:
                print(f"\n  [{sid}] sync error: {e}")
                errors += 1

        print()

    print(f"\nDone. Filled: {filled}, Still empty: {still_empty}, Errors: {errors}")


if __name__ == "__main__":
    main()

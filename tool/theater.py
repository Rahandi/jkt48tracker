import os
import re
import time
from datetime import date, datetime, timedelta, timezone

import requests
from dotenv import load_dotenv

load_dotenv()

BASE_URL = "https://jkt48.com"
INTERNAL_API_URL = os.getenv("INTERNAL_API_URL", "http://localhost:8000/internal")
INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "")

# Earliest data available in the JKT48 API.
DEFAULT_START_YEAR = int(os.getenv("SYNC_START_YEAR", "2011"))
DEFAULT_START_MONTH = int(os.getenv("SYNC_START_MONTH", "12"))

# How many months ahead of today to include.
MONTHS_FORWARD = int(os.getenv("SYNC_MONTHS_FORWARD", "2"))

WIB = timezone(timedelta(hours=7))


def _month_range() -> list[tuple[int, int]]:
    start = date(DEFAULT_START_YEAR, DEFAULT_START_MONTH, 1)
    today = date.today()
    end_m = today.month + MONTHS_FORWARD
    end_y = today.year
    while end_m > 12:
        end_m -= 12
        end_y += 1
    end = date(end_y, end_m, 1)

    months = []
    cur = start
    while cur <= end:
        months.append((cur.year, cur.month))
        m = cur.month + 1
        y = cur.year
        if m > 12:
            m = 1
            y += 1
        cur = date(y, m, 1)
    return months


def _parse_show_date(iso: str) -> str:
    """Convert ISO UTC datetime → WIB date string (YYYY-MM-DD)."""
    dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    return dt.astimezone(WIB).date().isoformat()


def _make_jkt48_id(name: str, member_id: int) -> str:
    slug = re.sub(r"\s+", "-", name.lower().strip())
    return f"{slug}-{member_id}"


def _fetch_schedules(month: int, year: int) -> list[dict]:
    resp = requests.get(
        f"{BASE_URL}/api/v1/schedules",
        params={"lang": "id", "month": month, "year": year},
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json().get("data", [])


def _fetch_detail(link: str, retries: int = 4) -> dict:
    for attempt in range(retries):
        try:
            resp = requests.get(
                f"{BASE_URL}/api/v1/schedules/{link}",
                params={"lang": "id"},
                timeout=20,
            )
            resp.raise_for_status()
            return resp.json().get("data", {})
        except Exception:
            if attempt == retries - 1:
                raise
            time.sleep(3.0 * (attempt + 1))


def _sync_one(schedule: dict) -> None:
    resp = requests.post(
        f"{INTERNAL_API_URL}/theater-schedules/sync",
        json=[schedule],
        headers={"X-API-Key": INTERNAL_API_KEY},
        timeout=30,
    )
    resp.raise_for_status()


def sync_members() -> None:
    """Fetch current member roster from JKT48 API and sync team + profile data."""
    resp = requests.get(f"{BASE_URL}/api/v1/members", params={"lang": "id"}, timeout=15)
    resp.raise_for_status()
    raw = resp.json().get("data", [])

    members = []
    for m in raw:
        team = m.get("type", "")
        jkt48_id = _make_jkt48_id(m["name"], m["jkt48_member_id"])
        members.append({
            "jkt48_id": jkt48_id,
            "name": m["name"],
            "nickname": m.get("nickname") or None,
            "image_url": m.get("photo") or None,
            "team": team,
        })

    post = requests.post(
        f"{INTERNAL_API_URL}/members/sync",
        json=members,
        headers={"X-API-Key": INTERNAL_API_KEY},
        timeout=30,
    )
    post.raise_for_status()
    print(f"Member sync: {post.json()['synced']} members updated (teams synced)")


def run() -> None:
    months = _month_range()
    print(f"Fetching {len(months)} months ({months[0][0]}-{months[0][1]:02d} → {months[-1][0]}-{months[-1][1]:02d})...")

    all_items: list[dict] = []
    seen_ids: set[str] = set()

    for year, month in months:
        print(f"  {year}-{month:02d}", end="", flush=True)
        try:
            items = _fetch_schedules(month, year)
        except Exception as e:
            print(f" ERROR: {e}")
            continue
        new = 0
        for item in items:
            if item.get("type") != "SHOW":
                continue
            sid = str(item["schedule_id"])
            if sid not in seen_ids:
                seen_ids.add(sid)
                all_items.append(item)
                new += 1
        print(f" → {new} shows")
        time.sleep(0.4)

    total = len(all_items)
    print(f"\nFound {total} shows total. Fetching details and syncing one-by-one...")

    synced = 0
    failed = 0
    for i, item in enumerate(all_items, 1):
        show_date = _parse_show_date(item["date"])
        show_time = item["start_time"][:5]

        try:
            detail = _fetch_detail(item["link"])
        except Exception as e:
            print(f"  [{i}/{total}] {show_date} - {item['title']} | detail error: {e}")
            failed += 1
            continue

        # List API start_time is unreliable for older shows ("00:00:00"); detail is authoritative.
        detail_time = detail.get("start_time", "")
        if detail_time:
            show_time = detail_time[:5]

        members = [
            {"name": m["name"], "jkt48_id": _make_jkt48_id(m["name"], m["member_id"])}
            for m in detail.get("jkt48_member", [])
        ]

        bday_names = detail.get("birthday_member_name") or []
        seitansai = ", ".join(bday_names) if bday_names else None

        schedule = {
            "jkt48_schedule_id": str(item["schedule_id"]),
            "show_date": show_date,
            "show_time": show_time,
            "setlist_name": item["title"],
            "seitansai_members": seitansai,
            "members": members,
        }

        try:
            _sync_one(schedule)
            synced += 1
            print(f"  [{i}/{total}] {show_date} {show_time} - {item['title']} | members: {len(members)} | OK")
        except Exception as e:
            failed += 1
            print(f"  [{i}/{total}] {show_date} {show_time} - {item['title']} | sync error: {e}")

        time.sleep(1.0)

    print(f"\nDone. Synced: {synced}, Failed: {failed}, Total: {total}")


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "sync-members":
        sync_members()
    else:
        run()

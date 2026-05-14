"""
Creates shadow TheaterSchedule entries for the gap between a member's real
show total and what we have tracked in the database.

Shadow entries have jkt48_schedule_id starting with "shd" and no show_date,
so they are excluded from public theater listings but count toward the
member's total show count.

Real totals sourced from @jehaes_ (2026-05-10), recognized as the official
reference record by JKT48 members themselves.

Run: python tool/sync_shadow_shows.py
"""
import os
import time
import requests
from dotenv import load_dotenv

load_dotenv()

BACKEND_URL = os.getenv("INTERNAL_API_URL", "http://localhost:8000/internal")
API_KEY = os.getenv("INTERNAL_API_KEY", "")
PUBLIC_URL = os.getenv("PUBLIC_API_URL", "http://localhost:8000/api")

# Official show totals: {tweet_nickname: real_total}
REAL_TOTALS: dict[str, int] = {
    "Feni": 740,
    "Jessi": 456,
    "Muthe": 417,
    "Eli": 386,
    "Olla": 381,
    "Freya": 381,
    "Lulu": 378,
    "Oniel": 361,
    "Christy": 357,
    "Gita": 355,
    "Fiony": 349,
    "Marsha": 301,
    "Kathrina": 298,
    "Indah": 254,
    "Lia": 222,
    "Raisha": 188,
    "Danella": 185,
    "Ella": 185,
    "Lyn": 183,
    "Cathy": 176,
    "Gracie": 170,
    "Michie": 164,
    "Daisy": 160,
    "Greesel": 160,
    "Chelsea": 157,
    "Cynthia": 148,
    "Gendis": 140,
    "Anindya": 138,
    "Alya": 130,
    "Oline": 117,
    "Elin": 115,
    "Trisha": 113,
    "Kimmy": 107,
    "Fritzy": 100,
    "Lily": 99,
    "Nayla": 99,
    "Erine": 98,
    "Nachia": 95,
    "Nala": 89,
    "Aralie": 86,
    "Delynn": 81,
    "Levi": 80,
    "Lana": 78,
    "Ribka": 74,
    "Intan": 46,
    "Ekin": 42,
    "Auwia": 39,
    "Virgi": 38,
    "Giaa": 35,
    "Mikaela": 28,
    "Rilly": 28,
    "Maira": 26,
    "Jemima": 25,
    "Fahira": 3,
    "Heidi": 3,
    "Ralyne": 3,
    "Carissa": 2,
    "Rara": 2,
    "Sona": 2,
    "Fera": 1,
    "Bella": 1,
    "Maxine": 1,
    "Jazzy": 1,
}


def build_nickname_lookup(members: list[dict]) -> dict[str, dict]:
    """Returns {lower_nickname: member_dict}."""
    lookup: dict[str, dict] = {}
    for m in members:
        if m.get("nickname"):
            lookup[m["nickname"].lower()] = m
        lookup[m["name"].lower()] = m
    return lookup


def get_current_show_counts() -> dict[str, int]:
    """Returns {jkt48_id: current_count} from member-stats endpoint (past + shadow only)."""
    resp = requests.get(f"{PUBLIC_URL}/theater-schedules/member-stats", timeout=15)
    resp.raise_for_status()
    return {r["jkt48_id"]: r["show_count"] for r in resp.json() if r.get("jkt48_id")}


def get_existing_shadow_count(jkt48_id: str) -> int:
    """Returns how many shadow entries already exist for this member (total - tracked)."""
    resp = requests.get(f"{PUBLIC_URL}/members/{jkt48_id}/theater-stats", timeout=15)
    if not resp.ok:
        return 0
    data = resp.json()
    total = data.get("total", 0)
    tracked = data.get("tracked", 0)
    return max(0, total - tracked)


def main():
    print("Fetching members...")
    resp = requests.get(f"{PUBLIC_URL}/members/", timeout=15)
    resp.raise_for_status()
    members = resp.json()
    nickname_lookup = build_nickname_lookup(members)
    print(f"  {len(members)} members loaded.\n")

    print("Fetching current show counts (includes existing shadow entries)...")
    current_counts = get_current_show_counts()
    print(f"  {len(current_counts)} members with tracked shows.\n")

    # Find the highest existing shadow ID to continue from
    print("Finding next shadow ID...")
    resp = requests.get(f"{PUBLIC_URL}/theater-schedules/member-stats", timeout=15)
    # We'll determine next_n from a simple starting point; the sync endpoint
    # is idempotent by jkt48_schedule_id so re-runs won't duplicate
    # Use a high starting counter per member to avoid collisions
    next_n = 1

    # Check existing shadow schedules by looking for the highest existing shd ID
    # We approximate by starting at a safe offset if re-running
    # (The sync endpoint upserts, so exact starting point doesn't matter for correctness,
    # but we want to avoid unnecessary upserts of existing entries)

    total_created = 0
    total_skipped = 0

    # Assign deterministic shadow IDs per member: shd{member_index:04d}{slot:04d}
    # This guarantees idempotency across re-runs
    sorted_members = sorted(
        [(nick, m) for nick, m in nickname_lookup.items() if nick in {n.lower() for n in REAL_TOTALS}],
        key=lambda x: x[1]["jkt48_id"],
    )
    # Deduplicate (nickname + name both point to same member)
    seen_ids: set[str] = set()
    member_entries: list[tuple[str, dict, int]] = []
    for tweet_nick, real_total in REAL_TOTALS.items():
        m = nickname_lookup.get(tweet_nick.lower())
        if not m:
            print(f"  ⚠ Could not resolve: {tweet_nick}")
            continue
        if m["jkt48_id"] in seen_ids:
            continue
        seen_ids.add(m["jkt48_id"])
        member_entries.append((tweet_nick, m, real_total))

    for member_idx, (tweet_nick, member, real_total) in enumerate(member_entries):
        jkt48_id = member["jkt48_id"]
        current = current_counts.get(jkt48_id, 0)
        gap = real_total - current

        if gap <= 0:
            print(f"  {tweet_nick:12s} {real_total:4d} shows — no gap, skipping")
            total_skipped += 1
            continue

        existing_shadows = get_existing_shadow_count(jkt48_id)
        next_slot = existing_shadows + 1
        print(f"  {tweet_nick:12s} {real_total:4d} shows — current {current} (shadows: {existing_shadows}), creating {gap} more (slots {next_slot}–{next_slot + gap - 1})")

        batch: list[dict] = []
        for slot in range(next_slot, next_slot + gap):
            shadow_id = f"shd{member_idx:04d}{slot:04d}"
            batch.append({
                "jkt48_schedule_id": shadow_id,
                "members": [{"name": member["name"], "jkt48_id": jkt48_id}],
            })

        # Send in chunks of 50
        for i in range(0, len(batch), 50):
            chunk = batch[i:i + 50]
            resp = requests.post(
                f"{BACKEND_URL}/theater-schedules/sync",
                json=chunk,
                headers={"X-API-Key": API_KEY},
                timeout=60,
            )
            resp.raise_for_status()
            time.sleep(0.1)

        total_created += gap

    print(f"\nDone. Shadow entries created: {total_created}, Members skipped (no gap): {total_skipped}")


if __name__ == "__main__":
    main()

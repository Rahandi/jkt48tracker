"""
Syncs official total show counts to the members table.
Counts sourced from @jehaes_ (2026-05-10), recognized as the reference record by JKT48 members themselves.
Matches by nickname (case-insensitive), falls back to manual jkt48_id map for names that differ.

Run: python tool/sync_member_show_counts.py
"""
import os
import requests
from dotenv import load_dotenv

load_dotenv()

BACKEND_URL = os.getenv("INTERNAL_API_URL", "http://localhost:8000/internal")
API_KEY = os.getenv("INTERNAL_API_KEY", "")
PUBLIC_URL = os.getenv("PUBLIC_API_URL", "http://localhost:8000/api")

# Official show counts: {nickname: total_show_count}
# Source: @jehaes_ on X (Twitter), 2026-05-10 — recognized by JKT48 members as the reference record
FAN_TRACKER: dict[str, int] = {
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

# Manual overrides: tweet nickname → jkt48_id
# For members whose DB nickname differs from the tweet shortname
MANUAL_MAP: dict[str, str] = {
    # Add overrides here if the nickname lookup fails for any entry
    # e.g. "Olla": "member-jkt48-id",
}


def build_lookup(members: list[dict]) -> dict[str, str]:
    """Returns {lower_nickname: jkt48_id} and {lower_name: jkt48_id}."""
    lookup: dict[str, str] = {}
    for m in members:
        if m.get("nickname"):
            lookup[m["nickname"].lower()] = m["jkt48_id"]
        lookup[m["name"].lower()] = m["jkt48_id"]
    return lookup


def main():
    print("Fetching members from API...")
    resp = requests.get(f"{PUBLIC_URL}/members/", timeout=15)
    resp.raise_for_status()
    members = resp.json()
    print(f"  {len(members)} members loaded.\n")

    lookup = build_lookup(members)

    payload: list[dict] = []
    unresolved: list[str] = []

    for tweet_nick, count in FAN_TRACKER.items():
        jkt48_id = MANUAL_MAP.get(tweet_nick) or lookup.get(tweet_nick.lower())
        if jkt48_id:
            payload.append({"jkt48_id": jkt48_id, "total_show_count": count})
            print(f"  {tweet_nick:12s} → {jkt48_id:30s} = {count}")
        else:
            unresolved.append(tweet_nick)
            print(f"  {tweet_nick:12s} → ??? (unresolved)")

    print(f"\nResolved: {len(payload)}, Unresolved: {len(unresolved)}")
    if unresolved:
        print(f"  Unresolved: {', '.join(unresolved)}")
        print("  Add manual jkt48_id overrides to MANUAL_MAP and re-run.")

    if not payload:
        print("Nothing to update.")
        return

    print(f"\nPosting {len(payload)} updates to backend...")
    resp = requests.post(
        f"{BACKEND_URL}/members/bulk-update-show-counts",
        json=payload,
        headers={"X-API-Key": API_KEY},
        timeout=30,
    )
    resp.raise_for_status()
    result = resp.json()
    print(f"Done. Updated: {result['updated']}")


if __name__ == "__main__":
    main()

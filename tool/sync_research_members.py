"""
Syncs theater show member lists sourced from fan sites / internet research.
Resolves names → jkt48_ids from the local members DB; stores name-only for
graduated members not in the current roster (jkt48_id stays null).

Sources: zetizens.id, IDN Times, overseasidol.com, AKB48 Wiki, Jawapos, Facebook
"""
import os
import sys
import time

import requests
from dotenv import load_dotenv

load_dotenv()

BACKEND_URL = os.getenv("INTERNAL_API_URL", "http://localhost:8000/internal")
API_KEY = os.getenv("INTERNAL_API_KEY", "")
PUBLIC_URL = os.getenv("PUBLIC_API_URL", "http://localhost:8000/api")

# ---------------------------------------------------------------------------
# Research data: {jkt48_schedule_id: [member_name, ...]}
# ---------------------------------------------------------------------------
SHOWS: dict[str, list[str]] = {
    # 2026-05-02 Pajama Drive (Gen 13 & 14 debut)
    # Source: zetizens.id
    "7131": [
        "Jemima Evodie", "Nur Intan", "Bong Aprilli", "Jacqueline Immanuela",
        "Humaira Ramadhani", "Astrella Virgiananda", "Sona Kalyana", "Fahira Putri",
        "Ralyne Van Irwan", "Carissa Dini", "Fatimah Azzahra", "Heidi Suyangga",
    ],

    # 2026-04-25 ITADAKI♥LOVE (Team Love Shonichi)
    # Source: IDN Times, overseasidol.com
    "7122": [
        "Alya Amanda", "Celline Thefani", "Fiony Alveria", "Fritzy Rosmerian",
        "Grace Octaviani", "Indah Cahya", "Aurellia", "Aurhel Alana",
        "Hillary Abigail", "Michelle Alexandra", "Nayla Suji", "Jazzlyn Trisha",
    ],

    # 2026-04-18 DREAM BAKUDAN (Team Dream Shonichi)
    # Source: IDN Times, overseasidol.com
    "7118": [
        "Marsha Lenathea", "Freya Jayawardana", "Greesella Adhalia", "Gita Sekar Andarini",
        "Gabriela Abigail", "Febriola Sinambela", "Oline Manuel", "Helisma Putri",
        "Adeline Wijaya", "Nina Tutachia", "Jesslyn Elly", "Shabilqis Naila",
    ],

    # 2026-04-11 PASSION 200% (Team Passion Shonichi)
    # Source: Jawapos, overseasidol.com
    "7079": [
        "Angelina Christy", "Victoria Kimberly", "Mutiara Azzahra", "Kathrina Irene",
        "Lulu Salsabila", "Michelle Levia", "Catherina Vallencia", "Abigail Rachel",
        "Dena Natalia", "Raisha Syifa", "Jessica Chandra", "Cornelia Vanisa",
    ],

    # 2025-11-21 KIRA KIRA GIRLS (Shonichi)
    # Source: JKT48 official Twitter
    "6925": [
        "Adeline Wijaya", "Catherina Vallencia", "Victoria Kimberly", "Letycia Moreen",
        "Nina Tutachia", "Oline Manuel", "Jazzlyn Trisha",
        "Aulia Riza", "Jacqueline Immanuela", "Hagia Sopia", "Nur Intan", "Jemima Evodie",
    ],

    # 2025-11-29 KIRA KIRA GIRLS
    # Source: JKT48 official Twitter
    "6931": [
        "Catherina Vallencia", "Astrella Virgiananda", "Nayla Suji", "Ribka Budiman",
        "Bong Aprilli", "Shabilqis Naila", "Victoria Kimberly", "Humaira Ramadhani",
        "Abigail Rachel", "Michelle Levia", "Nina Tutachia", "Mikaela Kusjanto",
    ],

    # 2025-11-30 KIRA KIRA GIRLS (same rotation as 11-21)
    # Source: JKT48 official Twitter
    "6933": [
        "Adeline Wijaya", "Catherina Vallencia", "Victoria Kimberly", "Letycia Moreen",
        "Nina Tutachia", "Oline Manuel", "Jazzlyn Trisha",
        "Aulia Riza", "Jacqueline Immanuela", "Hagia Sopia", "Nur Intan", "Jemima Evodie",
    ],

    # 2025-02-02 Sambil Menggandeng Erat Tanganku (Show 3)
    # Source: zetizens.id
    "6710": [
        "Michelle Alexandra", "Mutiara Azzahra", "Fiony Alveria", "Oline Manuel",
        "Indah Cahya", "Kathrina Irene", "Alya Amanda", "Cathleen Nixie",
        "Gendis Mayrannisa", "Grace Octaviani", "Shania Gracia",
    ],

    # 2025-02-01 Sambil Menggandeng Erat Tanganku (Show 1, earlier show)
    # Source: zetizens.id
    "6708": [
        "Freya Jayawardana", "Angelina Christy", "Febriola Sinambela", "Fiony Alveria",
        "Lulu Salsabila", "Jesslyn Elly", "Alya Amanda", "Cynthia Yaputera",
        "Celline Thefani", "Greesella Adhalia", "Shania Gracia", "Indira Seruni",
    ],

    # 2025-02-01 Sambil Menggandeng Erat Tanganku (Show 2, later show)
    # Source: Facebook f48g.media, zetizens.id
    "6709": [
        "Gabriela Abigail", "Gita Sekar Andarini", "Jessica Chandra", "Helisma Putri",
        "Marsha Lenathea", "Aurellia", "Raisha Syifa", "Alya Amanda",
        "Chelsea Davina", "Dena Natalia", "Gendis Mayrannisa", "Grace Octaviani",
    ],

    # 2024-05-30 Pajama Drive (Gen 11+12 Trainee, Shonichi)
    # Source: IDN Times
    "6503": [
        "Michelle Alexandra", "Alya Amanda", "Chelsea Davina", "Dena Natalia",
        "Anindya Ramadhani", "Cynthia Yaputera", "Jazzlyn Trisha", "Nayla Suji",
        "Michelle Levia", "Abigail Rachel", "Nina Tutachia", "Regina Wilian",
    ],

    # 2024-05-31 Pajama Drive (Gen 11+12 Trainee, Day 2)
    # Source: IDN Times
    "6504": [
        "Fritzy Rosmerian", "Cathleen Nixie", "Gendis Mayrannisa", "Celline Thefani",
        "Desy Natalia", "Victoria Kimberly", "Aurhel Alana", "Hillary Abigail",
        "Adeline Wijaya", "Catherina Vallencia", "Shabilqis Naila", "Oline Manuel",
    ],

    # 2024-06-28 JKT48 Theater Sementara Yogyakarta (Cara Meminum Ramune team)
    # Source: AKB48 Wiki, zetizens.id
    "6551": [
        "Angelina Christy", "Febriola Sinambela", "Fiony Alveria", "Gabriela Abigail",
        "Gita Sekar Andarini", "Grace Octaviani", "Helisma Putri", "Jesslyn Elly",
        "Marsha Lenathea", "Flora Shafiq", "Reva Fidela", "Shania Gracia",
    ],

    # 2024-06-29 JKT48 Theater Sementara Yogyakarta shows (Cara Meminum Ramune team)
    "6544": [
        "Angelina Christy", "Febriola Sinambela", "Fiony Alveria", "Gabriela Abigail",
        "Gita Sekar Andarini", "Grace Octaviani", "Helisma Putri", "Jesslyn Elly",
        "Marsha Lenathea", "Flora Shafiq", "Reva Fidela", "Shania Gracia",
    ],
    "6552": [
        "Angelina Christy", "Febriola Sinambela", "Fiony Alveria", "Gabriela Abigail",
        "Gita Sekar Andarini", "Grace Octaviani", "Helisma Putri", "Jesslyn Elly",
        "Marsha Lenathea", "Flora Shafiq", "Reva Fidela", "Shania Gracia",
    ],

    # 2024-06-30 JKT48 Theater Sementara Yogyakarta (Cara Meminum Ramune team)
    "6545": [
        "Angelina Christy", "Febriola Sinambela", "Fiony Alveria", "Gabriela Abigail",
        "Gita Sekar Andarini", "Grace Octaviani", "Helisma Putri", "Jesslyn Elly",
        "Marsha Lenathea", "Flora Shafiq", "Reva Fidela", "Shania Gracia",
    ],
    "6557": [
        "Angelina Christy", "Febriola Sinambela", "Fiony Alveria", "Gabriela Abigail",
        "Gita Sekar Andarini", "Grace Octaviani", "Helisma Putri", "Jesslyn Elly",
        "Marsha Lenathea", "Flora Shafiq", "Reva Fidela", "Shania Gracia",
    ],

    # 2024-07-03 JKT48 Theater Sementara Yogyakarta (Aturan Anti Cinta team)
    "6546": [
        "Aurellia", "Cornelia Vanisa", "Feni Fitriyanti", "Freya Jayawardana",
        "Greesella Adhalia", "Indah Cahya", "Jessica Chandra", "Kathrina Irene",
        "Lulu Salsabila", "Mutiara Azzahra", "Raisha Syifa", "Azizi Asadel",
    ],
    "6558": [
        "Aurellia", "Cornelia Vanisa", "Feni Fitriyanti", "Freya Jayawardana",
        "Greesella Adhalia", "Indah Cahya", "Jessica Chandra", "Kathrina Irene",
        "Lulu Salsabila", "Mutiara Azzahra", "Raisha Syifa", "Azizi Asadel",
    ],

    # 2024-07-04 JKT48 Theater Sementara Yogyakarta (Aturan Anti Cinta team)
    "6547": [
        "Aurellia", "Cornelia Vanisa", "Feni Fitriyanti", "Freya Jayawardana",
        "Greesella Adhalia", "Indah Cahya", "Jessica Chandra", "Kathrina Irene",
        "Lulu Salsabila", "Mutiara Azzahra", "Raisha Syifa", "Azizi Asadel",
    ],
    "6559": [
        "Aurellia", "Cornelia Vanisa", "Feni Fitriyanti", "Freya Jayawardana",
        "Greesella Adhalia", "Indah Cahya", "Jessica Chandra", "Kathrina Irene",
        "Lulu Salsabila", "Mutiara Azzahra", "Raisha Syifa", "Azizi Asadel",
    ],
}


def build_name_lookup() -> dict[str, str]:
    """Returns {lower_name_or_nickname: jkt48_id} from the members API."""
    resp = requests.get(f"{PUBLIC_URL}/members/", timeout=15)
    resp.raise_for_status()
    lookup: dict[str, str] = {}
    for m in resp.json():
        lookup[m["name"].lower()] = m["jkt48_id"]
        if m.get("nickname"):
            lookup[m["nickname"].lower()] = m["jkt48_id"]
    return lookup


def resolve(name: str, lookup: dict[str, str]) -> dict:
    jkt48_id = lookup.get(name.lower())
    return {"name": name, "jkt48_id": jkt48_id}


def sync_show(jkt48_schedule_id: str, members: list[dict]) -> None:
    resp = requests.post(
        f"{BACKEND_URL}/theater-schedules/sync",
        json=[{"jkt48_schedule_id": jkt48_schedule_id, "members": members}],
        headers={"X-API-Key": API_KEY},
        timeout=30,
    )
    resp.raise_for_status()


def main():
    print("Loading member lookup table...")
    lookup = build_name_lookup()
    print(f"  {len(lookup)} name/nickname entries loaded.\n")

    synced = 0
    failed = 0

    for sid, names in SHOWS.items():
        members = [resolve(n, lookup) for n in names]
        resolved = [m for m in members if m["jkt48_id"]]
        unresolved = [m["name"] for m in members if not m["jkt48_id"]]

        try:
            sync_show(sid, members)
            tag = f"({len(resolved)}/{len(members)} resolved)"
            if unresolved:
                tag += f"  ⚠ unresolved: {', '.join(unresolved)}"
            print(f"  [{sid}] OK {tag}")
            synced += 1
        except Exception as e:
            print(f"  [{sid}] ERROR: {e}")
            failed += 1

        time.sleep(0.3)

    print(f"\nDone. Synced: {synced}, Failed: {failed}")


if __name__ == "__main__":
    main()

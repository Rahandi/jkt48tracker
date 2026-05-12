"""
Second batch of researcher-sourced theater show member lists.

Sources:
- AKB48 Fandom Wiki (team rosters, shonichi lineups)
- Arsip Wota blog (arsipwota.blogspot.com)
- IDN Times, overseasidol.com

NOTE: For 2021 team-based shows, the team roster is applied to all shows of
that setlist in that era. Teams had 16-17 members rotating per show; without
per-show records the full roster is stored. Shows marked TEAM_ROSTER may be
off by 1-2 members compared to any specific night's exact lineup.
"""
import os
import time

import requests
from dotenv import load_dotenv

load_dotenv()

BACKEND_URL = os.getenv("INTERNAL_API_URL", "http://localhost:8000/internal")
API_KEY = os.getenv("INTERNAL_API_KEY", "")
PUBLIC_URL = os.getenv("PUBLIC_API_URL", "http://localhost:8000/api")

# ---------------------------------------------------------------------------
# 2021 era team rosters (fixed composition per setlist)
# ---------------------------------------------------------------------------

# Team T — "Fly! Team T" setlist (Aug 22 2020 – Mar 12 2021)
# 17 members, 16 per show (rotation unknown per show)
# Source: AKB48 Fandom Wiki
FLY_TEAM_T = [
    "Amirah Fatin", "Aninditha Rahma Cahyadi", "Aurel Mayori",
    "Cornelia Vanisa", "Dhea Angelia", "Febriola Sinambela",
    "Fiony Alveria", "Flora Shafiqa Riyadi", "Freya Jayawardana",
    "Jessica Chandra", "Jesslyn Callista", "Lulu Salsabila",
    "Nyimas Ratu Rafa", "Reva Fidela Adel Pantjoro", "Tan Zhi Hui Celine",
    "Umega Maulana", "Viona Fadrin",
]

# Team J — "Fajar Sang Idola" setlist (Mar 3 2019 – Mar 14 2021)
# 15 confirmed performing members
# Source: AKB48 Fandom Wiki
FAJAR_SANG_IDOLA_2021 = [
    "Ariella Calista Ichwan", "Cindy Hapsari Maharani Pujiantoro Putri",
    "Diani Amalia Ramadhani", "Eve Antoinette Ichwan", "Feni Fitriyanti",
    "Fransisca Saraswati Puspa Dewi", "Frieska Anastasia Laksani",
    "Gabriela Margareth Warouw", "Michelle Christo Kusnadi",
    "Nadila Cindi Wantari", "Ni Made Ayu Vania Aurellia",
    "Riska Amelia Putri", "Rona Anggreani", "Sania Julia Montolalu",
    "Sinka Juliani",
]

# Team KIII — "Cara Meminum Ramune" (Nov 15 2020 – Mar 13 2021)
# Source: AKB48 Fandom Wiki, original session research
CARA_MEMINUM_RAMUNE_2021 = [
    "Anastasya Narwastu Tety Handuran", "Angelina Christy",
    "Aninditha Rahma Cahyadi", "Beby Chaesara Anadila",
    "Fidly Immanda Azzahra", "Gita Sekar Andarini", "Helisma Putri",
    "Jinan Safa Safira", "Kandiya Rafa Maulidita",
    "Maria Genoveva Natalia Desy Purnamasari Gunawan", "Mutiara Azzahra",
    "Nurhayati", "Shani Indira Natio", "Shania Gracia",
    "Yessica Tamara", "Zahra Nur Khaula",
]

# Academy Class A — "Pajama Drive" trainee setlist (Feb 2020 – Mar 11 2021)
# 17 members, 16 per show
# Source: AKB48 Fandom Wiki
PAJAMA_DRIVE_2021_ACADEMY = [
    "Anastasya Narwastu Tety Handuran", "Angelina Christy", "Aurel Mayori",
    "Eve Antoinette Ichwan", "Freya Jayawardana", "Gabriel Angelina",
    "Gita Sekar Andarini", "Graciella Ruth Wiranto", "Helisma Putri",
    "Jessica Chandra", "Jesslyn Callista", "Mutiara Azzahra",
    "Nabila Fitriana", "Riska Amelia Putri", "Shalza Grasita",
    "Viona Fadrin", "Yessica Tamara",
]

# ONE era — "Gadis Gadis Remaja" Show 2 lineup (confirmed HIGH confidence)
# Source: Facebook SanBaesi fan recap
GADIS_GADIS_REMAJA_SHOW2 = [
    "Aninditha Rahma Cahyadi", "Ariella Calista Ichwan", "Cornelia Vanisa",
    "Dhea Angelia", "Fiony Alveria", "Gabriela Margareth Warouw",
    "Gita Sekar Andarini", "Helisma Putri", "Indah Cahya",
    "Jessica Chandra", "Jesslyn Callista", "Kathrina Irene",
    "Shani Indira Natio", "Tan Zhi Hui Celine", "Yessica Tamara",
    "Zahra Nur Khaula",
]

# ONE era — "Tunas di Balik Seragam" shonichi-based lineup (14 confirmed members)
# Source: AKB48 Fandom Wiki unit song credits
TUNAS_SERAGAM_2021 = [
    "Angelina Christy", "Aninditha Rahma Cahyadi", "Cornelia Vanisa",
    "Feni Fitriyanti", "Freya Jayawardana", "Gabriela Margareth Warouw",
    "Jessica Chandra", "Jinan Safa Safira", "Kathrina Irene",
    "Marsha Lenathea", "Shani Indira Natio", "Shania Gracia",
    "Tan Zhi Hui Celine", "Yessica Tamara",
]

# ---------------------------------------------------------------------------
# 2017 era team rosters
# ---------------------------------------------------------------------------

# Team T 3rd Stage — "Matahari Milikku" (Jul 8 – Dec 9, 2017)
# Source: AKB48 Fandom Wiki Shonichi lineup
MATAHARI_MILIKKU_2017 = [
    "Adhisty Zara", "Cindy Hapsari Maharani Pujiantoro Putri",
    "Citra Ayu Pranajaya Wibrado", "Elizabeth Gloria Setiawan",
    "Eve Antoinette Ichwan", "Jinan Safa Safira", "Made Devi Ranita Ningtara",
    "Melati Putri Rahel Sesilia", "Melody Nurramdhani Laksani", "Nurhayati",
    "Puti Nadhira Azalia", "Regina Angelina", "Ruth Damayanti Sitanggang",
    "Tan Zhi Hui Celine", "Violeta Burhan",
]

# Team KIII — "B•E•L•I•E•V•E Show" (Dec 8 2016 – Feb 27 2018)
# Source: AKB48 Fandom Wiki Shonichi lineup
BELIEVE_SHOW_2017 = [
    "Alicia Chanzia", "Aninditha Rahma Cahyadi", "Ayana Shahab",
    "Beby Chaesara Anadila", "Cindy Yuvia", "Fransisca Saraswati Puspa Dewi",
    "Maria Genoveva Natalia Desy Purnamasari Gunawan", "Natalia",
    "Ni Made Ayu Vania Aurellia", "Ratu Vienny Fitrilya", "Rina Chikano",
    "Rona Anggreani", "Shani Indira Natio", "Shania Gracia",
    "Shinta Naomi", "Sonia Natalia",
]

# Team J 4th Stage — "Sekarang Sedang Jatuh Cinta" (May 19 2017 – Mar 1 2019)
# Source: AKB48 Fandom Wiki Shonichi lineup
SEKARANG_JATUH_CINTA_2017 = [
    "Cindy Hapsari Maharani Pujiantoro Putri", "Della Delila",
    "Devi Kinal Putri", "Dwi Putri Bonita", "Feni Fitriyanti",
    "Gabriela Margareth Warouw", "Michelle Christo Kusnadi", "Nurhayati",
    "Priscillia Sari Dewi", "Riskha Fairunissa", "Saktia Oktapyani",
    "Shania Junianatha", "Sinka Juliani", "Stephanie Pricilla Indarto Putri",
    "Syahfira Angela Nurhaliza", "Thalia Ivanka Elizabeth",
]

# Gen 11 full roster for Ingin Bertemu shows (14 members, 12 per show rotate)
# Source: AKB48 Fandom Wiki Gen 11 roster
INGIN_BERTEMU_GEN11_FULL = [
    "Alya Amanda", "Anindya Ramadhani", "Aulia Asyira", "Cathleen Nixie",
    "Celline Thefani", "Chelsea Davina", "Cynthia Yaputera", "Dena Natalia",
    "Desy Natalia", "Gendis Mayrannisa", "Grace Octaviani",
    "Greesella Adhalia", "Jeane Victoria", "Michelle Alexandra",
]
# Shonichi (Apr 30): Anindya confirmed absent → 13 members
INGIN_BERTEMU_SHONICHI = [m for m in INGIN_BERTEMU_GEN11_FULL if m != "Anindya Ramadhani"]

# Gen 10 remaining members for May 4 2023 Pajama Drive (pre-promotion)
# Source: AKB48 Fandom Wiki Gen 10 roster (7 active after Alia Giselle resigned Apr 2023)
PAJAMA_DRIVE_2023_GEN10 = [
    "Amanda Sukma", "Aurellia", "Callista Alifia",
    "Gabriela Abigail", "Indira Putri Seruni", "Jesslyn Elly", "Raisha Syifa",
]

# ---------------------------------------------------------------------------
# Show → member mapping
# ---------------------------------------------------------------------------
SHOWS: dict[str, list[str]] = {
    # ---- 2022-03-12 BANZAI JKT48 ----
    # HIGH confidence — full 16-member list confirmed
    # Source: Arsip Wota blog
    "6012": [
        "Angelina Christy", "Aninditha Rahma Cahyadi", "Azizi Shafaa Asadel",
        "Cindy Hapsari Maharani Pujiantoro Putri", "Feni Fitriyanti",
        "Fiony Alveria", "Fransisca Saraswati Puspa Dewi",
        "Freya Jayawardana", "Gabriela Margareth Warouw", "Jessica Chandra",
        "Jinan Safa Safira", "Marsha Lenathea", "Mutiara Azzahra",
        "Shani Indira Natio", "Shania Gracia", "Tan Zhi Hui Celine",
    ],

    # ---- 2023-01-15 Cara Meminum Ramune (4th Stage Shonichi) ----
    # HIGH confidence — full 16-member list confirmed
    # Source: Arsip Wota / Bilibili Finland Miracle video
    "6176": [
        "Angelina Christy", "Azizi Shafaa Asadel", "Celline Thefani",
        "Feni Fitriyanti", "Fiony Alveria", "Fransisca Saraswati Puspa Dewi",
        "Freya Jayawardana", "Jessica Chandra", "Jinan Safa Safira",
        "Kathrina Irene", "Marsha Lenathea", "Mutiara Azzahra",
        "Shani Indira Natio", "Shania Gracia", "Tan Zhi Hui Celine",
        "Cornelia Vanisa",
    ],

    # ---- 2023-04-30 Ingin Bertemu (Gen 11 Shonichi) ----
    # Anindya confirmed absent; 13 of 14 Gen 11 members
    "6243": INGIN_BERTEMU_SHONICHI,

    # ---- 2023-05-05 Ingin Bertemu ----
    # Full 14-member pool (exact 2 absent unknown)
    "6247": INGIN_BERTEMU_GEN11_FULL,

    # ---- 2023-07-16 Ingin Bertemu ----
    # Full 14-member pool (exact rotation unknown)
    "6296": INGIN_BERTEMU_GEN11_FULL,

    # ---- 2023-05-04 Pajama Drive (Gen 10, last show before promotion) ----
    # 7 remaining Gen 10 trainees
    "6246": PAJAMA_DRIVE_2023_GEN10,

    # ---- 2021-03-28 Gadis Gadis Remaja (Show 2) ----
    # HIGH confidence — 16 members confirmed
    # Source: Facebook SanBaesi fan recap
    "5847": GADIS_GADIS_REMAJA_SHOW2,

    # ---- 2021 Fly! Team T shows ----
    "5798": FLY_TEAM_T,  # 2021-01-30
    "5803": FLY_TEAM_T,  # 2021-02-06
    "5812": FLY_TEAM_T,  # 2021-02-14
    "5815": FLY_TEAM_T,  # 2021-02-18
    "5816": FLY_TEAM_T,  # 2021-02-19
    "5823": FLY_TEAM_T,  # 2021-03-03
    "5828": FLY_TEAM_T,  # 2021-03-07
    "5832": FLY_TEAM_T,  # 2021-03-12 (final show)

    # ---- 2021 Fajar Sang Idola shows (Team J) ----
    "5755": FAJAR_SANG_IDOLA_2021,  # 2021-01-03
    "5801": FAJAR_SANG_IDOLA_2021,  # 2021-01-31
    "5805": FAJAR_SANG_IDOLA_2021,  # 2021-02-07
    "5808": FAJAR_SANG_IDOLA_2021,  # 2021-02-11
    "5810": FAJAR_SANG_IDOLA_2021,  # 2021-02-13
    "5817": FAJAR_SANG_IDOLA_2021,  # 2021-02-20
    "5820": FAJAR_SANG_IDOLA_2021,  # 2021-02-24
    "5824": FAJAR_SANG_IDOLA_2021,  # 2021-03-04
    "5826": FAJAR_SANG_IDOLA_2021,  # 2021-03-06
    "5834": FAJAR_SANG_IDOLA_2021,  # 2021-03-14 (final show)

    # ---- 2021 Cara Meminum Ramune shows (Team KIII) ----
    "5799": CARA_MEMINUM_RAMUNE_2021,  # 2021-01-30
    "5804": CARA_MEMINUM_RAMUNE_2021,  # 2021-02-07
    "5811": CARA_MEMINUM_RAMUNE_2021,  # 2021-02-14
    "5814": CARA_MEMINUM_RAMUNE_2021,  # 2021-02-17
    "5818": CARA_MEMINUM_RAMUNE_2021,  # 2021-02-21
    "5825": CARA_MEMINUM_RAMUNE_2021,  # 2021-03-05
    "5829": CARA_MEMINUM_RAMUNE_2021,  # 2021-03-07
    "5833": CARA_MEMINUM_RAMUNE_2021,  # 2021-03-13

    # ---- 2021 Pajama Drive shows (Academy Class A / Gen 9 trainees) ----
    "5754": PAJAMA_DRIVE_2021_ACADEMY,  # 2021-01-03
    "5800": PAJAMA_DRIVE_2021_ACADEMY,  # 2021-01-31
    "5802": PAJAMA_DRIVE_2021_ACADEMY,  # 2021-02-05
    "5807": PAJAMA_DRIVE_2021_ACADEMY,  # 2021-02-10
    "5809": PAJAMA_DRIVE_2021_ACADEMY,  # 2021-02-12
    "5819": PAJAMA_DRIVE_2021_ACADEMY,  # 2021-02-23
    "5827": PAJAMA_DRIVE_2021_ACADEMY,  # 2021-03-06
    "5831": PAJAMA_DRIVE_2021_ACADEMY,  # 2021-03-11

    # ---- 2021 Tunas di Balik Seragam (ONE era, May 2021) ----
    "5919": TUNAS_SERAGAM_2021,  # 2021-05-29
    "5920": TUNAS_SERAGAM_2021,  # 2021-05-29

    # ---- 2017 Matahari Milikku shows (Team T 3rd Stage) ----
    "3538": MATAHARI_MILIKKU_2017,  # 2017-07-08
    "3548": MATAHARI_MILIKKU_2017,  # 2017-07-11
    "3570": MATAHARI_MILIKKU_2017,  # 2017-07-19
    "3618": MATAHARI_MILIKKU_2017,  # 2017-08-10
    "3621": MATAHARI_MILIKKU_2017,  # 2017-08-12
    "3633": MATAHARI_MILIKKU_2017,  # 2017-08-19
    "3635": SEKARANG_JATUH_CINTA_2017,  # 2017-08-20 Sekarang Sedang Jatuh Cinta
    "3636": MATAHARI_MILIKKU_2017,  # 2017-08-20 Matahari
    "3645": MATAHARI_MILIKKU_2017,  # 2017-08-26
    "3646": MATAHARI_MILIKKU_2017,  # 2017-08-26
    "3661": MATAHARI_MILIKKU_2017,  # 2017-09-02

    # ---- 2017 Team KIII B•E•L•I•E•V•E Show ----
    "3604": BELIEVE_SHOW_2017,  # 2017-08-06
    "3620": BELIEVE_SHOW_2017,  # 2017-08-12
    "3623": BELIEVE_SHOW_2017,  # 2017-08-13
    "3634": BELIEVE_SHOW_2017,  # 2017-08-19
    "3642": BELIEVE_SHOW_2017,  # 2017-08-22
    "3647": BELIEVE_SHOW_2017,  # 2017-08-27
    "3660": BELIEVE_SHOW_2017,  # 2017-09-02

    # ---- 2017 Sekarang Sedang Jatuh Cinta (Team J 4th Stage) ----
    "3445": SEKARANG_JATUH_CINTA_2017,  # 2017-05-19
    "3619": SEKARANG_JATUH_CINTA_2017,  # 2017-08-11
    "3622": SEKARANG_JATUH_CINTA_2017,  # 2017-08-13
    "3632": SEKARANG_JATUH_CINTA_2017,  # 2017-08-18
    "3648": SEKARANG_JATUH_CINTA_2017,  # 2017-08-27

    # ---- 2017-03-12 Aturan Anti Cinta ----
    # No specific 2017 Aturan Anti Cinta team data found; skipping
}


def build_name_lookup() -> dict[str, str]:
    resp = requests.get(f"{PUBLIC_URL}/members/", timeout=15)
    resp.raise_for_status()
    lookup: dict[str, str] = {}
    for m in resp.json():
        lookup[m["name"].lower()] = m["jkt48_id"]
        if m.get("nickname"):
            lookup[m["nickname"].lower()] = m["jkt48_id"]
    return lookup


def resolve(name: str, lookup: dict[str, str]) -> dict:
    return {"name": name, "jkt48_id": lookup.get(name.lower())}


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
        resolved = sum(1 for m in members if m["jkt48_id"])
        unresolved = [m["name"] for m in members if not m["jkt48_id"]]

        try:
            sync_show(sid, members)
            tag = f"({resolved}/{len(members)} resolved)"
            if unresolved:
                tag += f"  ⚠ unresolved: {', '.join(unresolved)}"
            print(f"  [{sid}] OK {tag}")
            synced += 1
        except Exception as e:
            print(f"  [{sid}] ERROR: {e}")
            failed += 1

        time.sleep(0.2)

    print(f"\nDone. Synced: {synced}, Failed: {failed}")


if __name__ == "__main__":
    main()

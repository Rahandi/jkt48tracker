import asyncio
import os
import random
import re
import time
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import nodriver
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv

load_dotenv()

BASE_URL = "https://jkt48.com"
INTERNAL_API_URL = os.getenv("INTERNAL_API_URL", "http://localhost:8000/internal")
INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "")

INDONESIAN_MONTHS = {
    "januari": 1, "februari": 2, "maret": 3, "april": 4,
    "mei": 5, "juni": 6, "juli": 7, "agustus": 8,
    "september": 9, "oktober": 10, "november": 11, "desember": 12,
}

_CHROME_CANDIDATES = [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/snap/chromium/current/usr/lib/chromium-browser/chrome",
]


def _delay(min_s: float = 1.5, max_s: float = 3.5):
    time.sleep(random.uniform(min_s, max_s))


def _parse_dob(raw: str) -> str | None:
    try:
        parts = raw.strip().split()
        if len(parts) != 3:
            return None
        day, month_id, year = parts
        month = INDONESIAN_MONTHS.get(month_id.lower())
        if not month:
            return None
        return f"{year}-{month:02d}-{int(day):02d}"
    except Exception:
        return None


def _parse_height(raw: str) -> int | None:
    try:
        return int(re.search(r"\d+", raw).group())  # type: ignore[union-attr]
    except Exception:
        return None


def _find_chrome() -> str | None:
    for path in _CHROME_CANDIDATES:
        if os.path.exists(path):
            return path
    return None


async def _make_browser() -> nodriver.Browser:
    config = nodriver.Config()
    config.sandbox = False
    config.add_argument("--disable-dev-shm-usage")
    chrome = _find_chrome()
    if chrome:
        config.browser_executable_path = Path(chrome)  # type: ignore[assignment]
    return await nodriver.start(config=config)


async def scrape_member_list(page: nodriver.Tab) -> list[dict]:
    await page.get(f"{BASE_URL}/member")
    await asyncio.sleep(5)  # wait for Cloudflare challenge to resolve

    # Retry waiting for member cards to appear (Cloudflare may take several seconds)
    for attempt in range(3):
        try:
            await page.select("a.member-card", timeout=20)
            break
        except Exception:
            if attempt == 2:
                current_url = await page.evaluate("window.location.href")
                print(f"  Timeout waiting for member cards on attempt {attempt + 1}, url={current_url}")
                # print first 500 chars of page for debugging
                content_preview = (await page.get_content())[:500]
                print(f"  Page preview: {content_preview}")
                raise
            print(f"  Retry {attempt + 1} waiting for member cards...")
            await asyncio.sleep(10)

    soup = BeautifulSoup(await page.get_content(), "lxml")
    cards = soup.find_all("a", class_="member-card")

    members = []
    for card in cards:
        href = str(card.get("href", ""))
        params = parse_qs(urlparse(href).query)
        jkt48_id = params.get("member", [""])[0]
        if not jkt48_id:
            continue

        imgs = card.find_all("img")
        member_img = imgs[1] if len(imgs) > 1 else (imgs[0] if imgs else None)
        image_url = str(member_img.get("src", "")).strip() if member_img else None

        name_el = card.find("p")
        name = name_el.get_text(strip=True) if name_el else jkt48_id

        members.append({
            "jkt48_id": jkt48_id,
            "name": name,
            "image_url": image_url,
            "_detail_path": href,
        })

    print(f"Found {len(members)} members")
    return members


async def scrape_member_detail(page: nodriver.Tab, detail_path: str) -> dict:
    await page.get(f"{BASE_URL}{detail_path}")
    try:
        await page.select("div.space-y-1")
    except Exception:
        print(f"  Timeout on detail: {detail_path}")
        return {}

    soup = BeautifulSoup(await page.get_content(), "lxml")
    detail: dict = {}

    # Extract nickname from "(Name)" pattern in the name header area
    for p in soup.find_all("p"):
        text = p.get_text(strip=True)
        m = re.match(r"^\((.+)\)$", text)
        if m:
            detail["nickname"] = m.group(1)
            break

    # Extract profile fields from label/value pairs in div.space-y-1
    field_map = {
        "Tanggal Lahir": "dob",
        "Tinggi": "height",
        "Golongan Darah": "blood_type",
        "Horoskop": "horoscope",
        "Twitter": "twitter",
        "Instagram": "instagram",
    }

    for row in soup.find_all("div", class_="space-y-1"):
        ps = row.find_all("p")
        if len(ps) < 2:
            continue
        label_raw = ps[0].get_text(strip=True).rstrip(":").strip()
        value_raw = ps[1].get_text(strip=True)
        if not value_raw:
            continue

        field = field_map.get(label_raw)
        if field == "dob":
            detail["dob"] = _parse_dob(value_raw)
        elif field == "height":
            detail["height"] = _parse_height(value_raw)
        elif field in field_map.values():
            detail[field] = value_raw

    return detail


def sync_to_api(members: list[dict]) -> None:
    response = requests.post(
        f"{INTERNAL_API_URL}/members/sync",
        json=members,
        headers={"X-API-Key": INTERNAL_API_KEY},
        timeout=30,
    )
    response.raise_for_status()
    result = response.json()
    print(f"Synced {result['synced']} members to API")


async def main() -> None:
    browser = await _make_browser()
    try:
        page = await browser.get("about:blank")
        members = await scrape_member_list(page)
        full_members = []

        for i, member in enumerate(members, 1):
            detail_path = member.pop("_detail_path")
            print(f"  [{i}/{len(members)}] {member['name']}")
            _delay()
            detail = await scrape_member_detail(page, detail_path)
            full_members.append({**member, **detail})

        sync_to_api(full_members)
    finally:
        browser.stop()


def run() -> None:
    asyncio.run(main())


if __name__ == "__main__":
    run()

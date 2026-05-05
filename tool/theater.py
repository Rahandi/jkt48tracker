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


def _parse_date(raw: str) -> str | None:
    """Parse Indonesian date string like 'Sabtu, 10 Mei 2026' -> 'YYYY-MM-DD'."""
    try:
        # Strip leading day-of-week prefix (e.g. "Sabtu, ")
        cleaned = re.sub(r"^[^,]+,\s*", "", raw.strip())
        parts = cleaned.strip().split()
        if len(parts) != 3:
            return None
        day, month_id, year = parts
        month = INDONESIAN_MONTHS.get(month_id.lower())
        if not month:
            return None
        return f"{year}-{month:02d}-{int(day):02d}"
    except Exception:
        return None


def _parse_time(raw: str) -> str | None:
    """Parse time string like '13.00 WIB' or '13:00' -> 'HH:MM'."""
    try:
        m = re.search(r"(\d{1,2})[.:](\d{2})", raw)
        if m:
            return f"{int(m.group(1)):02d}:{m.group(2)}"
        return None
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


async def _wait_for_cloudflare(page: nodriver.Tab, selector: str, timeout: int = 20) -> bool:
    """Wait for a selector with retries after Cloudflare challenge."""
    for attempt in range(3):
        try:
            await page.select(selector, timeout=timeout)
            return True
        except Exception:
            if attempt == 2:
                current_url = await page.evaluate("window.location.href")
                print(f"  Timeout waiting for '{selector}' on attempt {attempt + 1}, url={current_url}")
                return False
            print(f"  Retry {attempt + 1} waiting for '{selector}'...")
            await asyncio.sleep(10)
    return False


def _extract_schedule_id(href: str) -> str | None:
    """Extract numeric schedule ID from a /theater/schedule/id/{id} URL."""
    m = re.search(r"/theater/schedule/id/(\d+)", href)
    return m.group(1) if m else None


def _extract_member_id(href: str) -> str | None:
    """Extract member jkt48_id from a /member?member={id} URL."""
    params = parse_qs(urlparse(href).query)
    return params.get("member", [None])[0]


async def scrape_theater_schedule(page: nodriver.Tab) -> list[dict]:
    """Scrape the theater schedule list page for upcoming shows."""
    await page.get(f"{BASE_URL}/theater/schedule?lang=id")
    await asyncio.sleep(5)  # wait for Cloudflare challenge to resolve

    found = await _wait_for_cloudflare(page, ".table-pink__scroll")
    if not found:
        content_preview = (await page.get_content())[:500]
        print(f"  Could not find schedule table. Page preview: {content_preview}")
        return []

    soup = BeautifulSoup(await page.get_content(), "lxml")
    schedules = []

    # Each .table-pink__scroll wraps a table; look at all of them
    scroll_divs = soup.find_all(
        "div", class_=lambda c: c and "table-pink__scroll" in c.split()
    )

    for wrap in scroll_divs:
        table = wrap.find("table")
        if not table:
            continue
        tbody = table.find("tbody")
        if not tbody:
            continue

        for row in tbody.find_all("tr"):
            cells = row.find_all("td")
            if not cells:
                continue

            # Find a link to a detail page within this row
            jkt48_schedule_id = None
            detail_path = None
            setlist_name = None

            for cell in cells:
                for a_tag in cell.find_all("a", href=True):
                    href = str(a_tag["href"])
                    sid = _extract_schedule_id(href)
                    if sid:
                        jkt48_schedule_id = sid
                        # Normalise path: keep only the path portion
                        parsed = urlparse(href)
                        detail_path = parsed.path + (f"?{parsed.query}" if parsed.query else "")
                        setlist_name = a_tag.get_text(strip=True) or None
                        break
                if jkt48_schedule_id:
                    break

            if not jkt48_schedule_id:
                continue

            # Extract date and time from the first cell that contains date-like text
            show_date = None
            show_time = None
            for cell in cells:
                text_lines = cell.get_text(separator="\n", strip=True).split("\n")
                for line in text_lines:
                    if not show_date and re.search(r"\d{4}", line):
                        show_date = _parse_date(line)
                    if not show_time and re.search(r"\d{1,2}[.:]\d{2}", line):
                        show_time = _parse_time(line)
                if show_date:
                    break

            # If setlist not found from link text, try the cell adjacent to date cell
            if not setlist_name and len(cells) >= 2:
                setlist_name = cells[1].get_text(strip=True) or None

            schedules.append({
                "jkt48_schedule_id": jkt48_schedule_id,
                "show_date": show_date,
                "show_time": show_time,
                "setlist_name": setlist_name,
                "_detail_path": detail_path,
            })

    print(f"Found {len(schedules)} scheduled shows")
    return schedules


async def scrape_schedule_detail(page: nodriver.Tab, detail_path: str) -> dict:
    """Scrape a show's detail page to get the participating member list."""
    url = f"{BASE_URL}{detail_path}" if detail_path.startswith("/") else f"{BASE_URL}/{detail_path}"
    await page.get(url)

    found = await _wait_for_cloudflare(page, ".table-pink__scroll")
    if not found:
        print(f"  Timeout on detail: {detail_path}")
        return {}

    soup = BeautifulSoup(await page.get_content(), "lxml")
    members = []

    scroll_divs = soup.find_all(
        "div", class_=lambda c: c and "table-pink__scroll" in c.split()
    )

    # Collect all tables; the member list table contains <a> tags linking to /member pages
    for wrap in scroll_divs:
        for table in wrap.find_all("table"):
            tbody = table.find("tbody")
            if not tbody:
                continue
            for row in tbody.find_all("tr"):
                for a_tag in row.find_all("a", href=True):
                    href = str(a_tag["href"])
                    name = a_tag.get_text(strip=True)
                    if not name:
                        continue
                    jkt48_id = _extract_member_id(href)
                    members.append({"name": name, "jkt48_id": jkt48_id})

    return {"members": members}


def sync_to_api(schedules: list[dict]) -> None:
    response = requests.post(
        f"{INTERNAL_API_URL}/theater-schedules/sync",
        json=schedules,
        headers={"X-API-Key": INTERNAL_API_KEY},
        timeout=30,
    )
    response.raise_for_status()
    result = response.json()
    print(f"Synced {result['synced']} theater schedules to API")


async def main() -> None:
    browser = await _make_browser()
    try:
        page = await browser.get("about:blank")
        schedules = await scrape_theater_schedule(page)
        full_schedules = []

        for i, schedule in enumerate(schedules, 1):
            detail_path = schedule.pop("_detail_path")
            print(f"  [{i}/{len(schedules)}] {schedule.get('show_date')} - {schedule.get('setlist_name')}")
            _delay()
            detail = await scrape_schedule_detail(page, detail_path)
            full_schedules.append({**schedule, **detail})

        sync_to_api(full_schedules)
    finally:
        browser.stop()


def run() -> None:
    asyncio.run(main())


if __name__ == "__main__":
    run()

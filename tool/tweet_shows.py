"""
Auto-tweet past theater shows that haven't been posted yet.

Generates a show summary card image and posts it to Twitter/X.

Run manually:   python tool/tweet_shows.py
Run via cron:   */30 * * * * cd ~/jkt48tracker && set -a && source .env && set +a && INTERNAL_API_URL=http://localhost:8000/internal python3 tool/tweet_shows.py >> ~/jkt48tracker/tool/tweet_shows.log 2>&1

Required env vars:
  INTERNAL_API_URL            backend internal API base (default: http://localhost:8000/internal)
  INTERNAL_API_KEY            shared secret for internal endpoints
  PUBLIC_API_URL              backend public API base (default: http://localhost:8000/api)
  PUBLIC_SITE_URL             frontend URL for show links (default: https://jkt48tracker.com)
  TWITTER_API_KEY             Twitter/X consumer key
  TWITTER_API_SECRET          Twitter/X consumer secret
  TWITTER_ACCESS_TOKEN        access token for the posting account
  TWITTER_ACCESS_TOKEN_SECRET access token secret
"""
import io
import os
import sys
import tempfile
from datetime import datetime

import requests
import tweepy
from dotenv import load_dotenv
from PIL import Image, ImageDraw, ImageFont, ImageOps

load_dotenv()

INTERNAL_API_URL = os.getenv("INTERNAL_API_URL", "http://localhost:8000/internal")
INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "")
PUBLIC_API_URL = os.getenv("PUBLIC_API_URL", "http://localhost:8000/api")
PUBLIC_SITE_URL = os.getenv("PUBLIC_SITE_URL", "https://jkt48tracker.com")

TWITTER_API_KEY = os.getenv("TWITTER_API_KEY", "")
TWITTER_API_SECRET = os.getenv("TWITTER_API_SECRET", "")
TWITTER_ACCESS_TOKEN = os.getenv("TWITTER_ACCESS_TOKEN", "")
TWITTER_ACCESS_TOKEN_SECRET = os.getenv("TWITTER_ACCESS_TOKEN_SECRET", "")

# ── Image constants ────────────────────────────────────────────────────────────

W, H = 1200, 675
PAD = 70

BG         = "#f7f3f4"
ACCENT     = "#e4002b"
TEXT_PRI   = "#100608"
TEXT_SEC   = "#7a5c62"
TEXT_DIM   = "#7a5c62"
DIVIDER    = "#ddd0d3"

FONT_PATHS = {
    "regular": [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
    ],
    "bold": [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
    ],
}


def _font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    for path in FONT_PATHS["bold" if bold else "regular"]:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def _text_width(draw: ImageDraw.ImageDraw, text: str, font) -> int:
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0]


def _fit_font(draw, text: str, max_width: int, bold: bool = False,
              max_size: int = 58, min_size: int = 28) -> ImageFont.FreeTypeFont:
    for size in range(max_size, min_size - 1, -2):
        f = _font(size, bold=bold)
        if _text_width(draw, text, f) <= max_width:
            return f
    return _font(min_size, bold=bold)


def _format_date(iso_date: str) -> str:
    return datetime.strptime(iso_date, "%Y-%m-%d").strftime("%B %-d, %Y")


def generate_show_image(show: dict, stat_lookup: dict[str, int], image_url_lookup: dict[str, str] | None = None) -> str:
    members = show.get("members", [])
    sorted_members = sorted(
        members,
        key=lambda m: stat_lookup.get(m.get("jkt48_id") or "", 0),
        reverse=True,
    )

    # ── Pre-measure layout ────────────────────────────────────────────────────
    _probe  = ImageDraw.Draw(Image.new("RGB", (W, 100)))
    setlist    = show.get("setlist_name") or "JKT48 Theater Show"
    title_font = _fit_font(_probe, setlist, W - PAD * 2, bold=True)
    title_bottom = _probe.textbbox((PAD, 108), setlist, font=title_font)[3]
    _meta_h      = _probe.textbbox((0, 0), "Ay", font=_font(26))[3]
    date_y       = title_bottom + 10
    divider_y    = date_y + _meta_h + 20
    member_start = divider_y + 18 + 26 + 14   # label height + gap

    avatar_size = 32
    row_h       = 50
    footer_h    = 90
    canvas_h    = max(H, member_start + len(sorted_members) * row_h + footer_h)

    img  = Image.new("RGB", (W, canvas_h), BG)
    draw = ImageDraw.Draw(img)

    # Left accent bar
    draw.rectangle([0, 0, 7, canvas_h], fill=ACCENT)

    # ── Header: red dot + brand name ──────────────────────────────────────────
    dot_x, dot_y = PAD + 9, 62
    draw.ellipse([dot_x - 9, dot_y - 9, dot_x + 9, dot_y + 9], fill=ACCENT)
    draw.text((PAD + 26, 46), "JKT48Tracker", font=_font(28, bold=True), fill=TEXT_PRI)

    # ── Show name ─────────────────────────────────────────────────────────────
    draw.text((PAD, 108), setlist, font=title_font, fill=TEXT_PRI)

    # ── Date · time (right-aligned, below title) ──────────────────────────────
    date_str = _format_date(show["show_date"]) if show.get("show_date") else ""
    time_str = f"{show['show_time']} WIB" if show.get("show_time") else ""
    meta = " · ".join(filter(None, [date_str, time_str]))
    font_meta = _font(26)
    meta_w = draw.textbbox((0, 0), meta, font=font_meta)[2]
    draw.text((PAD, date_y), meta, font=font_meta, fill=TEXT_SEC)

    # ── Divider ───────────────────────────────────────────────────────────────
    draw.rectangle([PAD, divider_y, W - PAD, divider_y + 2], fill=DIVIDER)

    # ── Members label ─────────────────────────────────────────────────────────
    draw.text((PAD, divider_y + 18), f"PERFORMING MEMBERS ({len(members)})",
              font=_font(18), fill=TEXT_SEC)

    # ── Member list (single column, sorted by show count desc) ────────────────
    font_name  = _font(24)
    font_count = _font(24)
    name_x     = PAD + avatar_size + 12
    y = member_start
    for m in sorted_members:
        jkt48_id = m.get("jkt48_id") or ""
        count    = stat_lookup.get(jkt48_id, None)

        # avatar
        avatar = None
        if image_url_lookup and jkt48_id and jkt48_id in image_url_lookup:
            avatar = _fetch_avatar(image_url_lookup[jkt48_id])
        avatar_y = y + (row_h - avatar_size) // 2
        if avatar:
            img.paste(avatar, (PAD, avatar_y), avatar)
        else:
            draw.ellipse([PAD, avatar_y, PAD + avatar_size, avatar_y + avatar_size], fill=DIVIDER)
        draw.ellipse(
            [PAD, avatar_y, PAD + avatar_size, avatar_y + avatar_size],
            outline=DIVIDER, width=2,
        )

        text_y = y + (row_h - 24) // 2
        draw.text((name_x, text_y), m["name"], font=font_name, fill=TEXT_PRI)
        if count is not None:
            count_text = f"{count} shows"
            tw = _text_width(draw, count_text, font_count)
            draw.text((W - PAD - tw, text_y), count_text, font=font_count, fill=TEXT_SEC)
        y += row_h

    # ── Footer ────────────────────────────────────────────────────────────────
    footer_y = canvas_h - footer_h
    draw.rectangle([PAD, footer_y, W - PAD, footer_y + 2], fill=DIVIDER)
    font_footer = _font(20)
    draw.text((PAD, footer_y + 16), PUBLIC_SITE_URL.replace("https://", ""),
              font=font_footer, fill=TEXT_DIM)
    hashtag = "#JKT48"
    tw = _text_width(draw, hashtag, font_footer)
    draw.text((W - PAD - tw, footer_y + 16), hashtag, font=font_footer, fill=TEXT_DIM)

    tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
    img.save(tmp.name, format="PNG")
    tmp.close()
    return tmp.name


AVATAR_SIZE = 32


def _fetch_avatar(image_url: str) -> Image.Image | None:
    try:
        res = requests.get(image_url, timeout=5)
        res.raise_for_status()
        img = Image.open(io.BytesIO(res.content)).convert("RGBA")
        # crop to square anchored toward the top so heads aren't clipped
        img = ImageOps.fit(img, (AVATAR_SIZE, AVATAR_SIZE), Image.LANCZOS, centering=(0.5, 0.15))
        # circular mask
        mask = Image.new("L", (AVATAR_SIZE, AVATAR_SIZE), 0)
        ImageDraw.Draw(mask).ellipse([0, 0, AVATAR_SIZE, AVATAR_SIZE], fill=255)
        img.putalpha(mask)
        return img
    except Exception:
        return None


def _get_member_image_urls() -> dict[str, str]:
    try:
        res = requests.get(f"{PUBLIC_API_URL}/members", timeout=10)
        res.raise_for_status()
        return {m["jkt48_id"]: m["image_url"] for m in res.json() if m.get("jkt48_id") and m.get("image_url")}
    except Exception:
        return {}


# ── API helpers ───────────────────────────────────────────────────────────────

def _get_untweeted() -> list[dict]:
    res = requests.get(
        f"{INTERNAL_API_URL}/theater-schedules/untweeted",
        headers={"X-Api-Key": INTERNAL_API_KEY},
        timeout=10,
    )
    res.raise_for_status()
    return res.json()


def _get_member_stats() -> dict[str, int]:
    res = requests.get(f"{PUBLIC_API_URL}/theater-schedules/member-stats", timeout=10)
    res.raise_for_status()
    return {s["jkt48_id"]: s["show_count"] for s in res.json() if s.get("jkt48_id")}


def _mark_tweeted(show_id: int) -> None:
    res = requests.post(
        f"{INTERNAL_API_URL}/theater-schedules/{show_id}/mark-tweeted",
        headers={"X-Api-Key": INTERNAL_API_KEY},
        timeout=10,
    )
    res.raise_for_status()


def _twitter_client() -> tweepy.Client:
    return tweepy.Client(
        consumer_key=TWITTER_API_KEY,
        consumer_secret=TWITTER_API_SECRET,
        access_token=TWITTER_ACCESS_TOKEN,
        access_token_secret=TWITTER_ACCESS_TOKEN_SECRET,
    )


def _twitter_api() -> tweepy.API:
    auth = tweepy.OAuth1UserHandler(
        TWITTER_API_KEY, TWITTER_API_SECRET,
        TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET,
    )
    return tweepy.API(auth)


# ── Main ──────────────────────────────────────────────────────────────────────

def _get_latest_past_show() -> dict | None:
    res = requests.get(f"{PUBLIC_API_URL}/theater-schedules/?past=true&limit=1", timeout=10)
    res.raise_for_status()
    items = res.json()
    return items[0] if items else None


def main():
    mark_only = "--mark-only" in sys.argv
    preview   = "--preview" in sys.argv

    if not mark_only and not preview:
        missing = [k for k in (
            "TWITTER_API_KEY", "TWITTER_API_SECRET",
            "TWITTER_ACCESS_TOKEN", "TWITTER_ACCESS_TOKEN_SECRET",
        ) if not os.getenv(k)]
        if missing:
            print(f"Missing Twitter env vars: {', '.join(missing)}", file=sys.stderr)
            sys.exit(1)

    if preview:
        show = _get_latest_past_show()
        if not show:
            print("No past shows found.")
            return
        stat_lookup      = _get_member_stats()
        image_url_lookup = _get_member_image_urls()
        img_path = generate_show_image(show, stat_lookup, image_url_lookup)
        import shutil
        dest = os.path.join(os.path.dirname(__file__), "..", "show_preview.png")
        shutil.copy(img_path, dest)
        os.unlink(img_path)
        print(f"Preview saved to: {os.path.abspath(dest)}")
        return

    shows = _get_untweeted()
    if not shows:
        print("No untweeted shows.")
        return

    stat_lookup      = _get_member_stats()
    image_url_lookup = _get_member_image_urls()
    client = None if mark_only else _twitter_client()
    api    = None if mark_only else _twitter_api()

    for show in shows:
        label = show.get("setlist_name") or f"show #{show['id']}"
        try:
            if not mark_only:
                img_path = generate_show_image(show, stat_lookup, image_url_lookup)
                try:
                    media = api.media_upload(filename=img_path)
                    date_str = _format_date(show["show_date"]) if show.get("show_date") else ""
                    caption = "#JKT48 #JKT48Tracker #JKT48ShowTheater"
                    client.create_tweet(text=caption, media_ids=[media.media_id_string])
                    print(f"Tweeted: {label} ({show.get('show_date')} {show.get('show_time')})")
                finally:
                    os.unlink(img_path)
            else:
                print(f"Marking (no tweet): {label} ({show.get('show_date')} {show.get('show_time')})")

            _mark_tweeted(show["id"])
        except Exception as e:
            print(f"Failed for show {show['id']}: {e}", file=sys.stderr)


if __name__ == "__main__":
    main()

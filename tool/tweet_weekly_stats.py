"""
Post a weekly theater stats image to Twitter/X.

Runs nightly. If no shows occurred today, exits silently.
Use --preview to generate weekly_preview.png locally without posting.

Run manually:   python tool/tweet_weekly_stats.py --preview
Run via cron:   0 16 * * * cd ~/jkt48tracker && set -a && source .env && set +a && INTERNAL_API_URL=http://localhost:8000/internal python3 tool/tweet_weekly_stats.py >> ~/jkt48tracker/tool/tweet_weekly_stats.log 2>&1

Required env vars: same as tweet_shows.py
"""
import os
import sys
import tempfile
from datetime import date, timedelta

import requests
from dotenv import load_dotenv
from PIL import Image, ImageDraw, ImageOps

load_dotenv()

# ── Re-use config + helpers from tweet_shows ──────────────────────────────────

sys.path.insert(0, os.path.dirname(__file__))

from tweet_shows import (
    PUBLIC_API_URL, PUBLIC_SITE_URL,
    TWITTER_API_KEY, TWITTER_API_SECRET,
    TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET,
    W, PAD,
    BG, ACCENT, TEXT_PRI, TEXT_SEC, TEXT_DIM, DIVIDER,
    _font, _fit_font, _text_width, _format_date,
    _fetch_avatar, _get_member_image_urls,
    _twitter_client, _twitter_api,
    AVATAR_SIZE,
)


# ── Image generation ──────────────────────────────────────────────────────────

def generate_weekly_image(
    members: list[dict],        # [{name, jkt48_id, week_count, total_count}]
    image_url_lookup: dict[str, str],
    date_range_str: str,        # e.g. "May 10 – May 16, 2026"
) -> str:
    row_h    = 44
    col_gap  = 30          # gap between the two columns
    footer_h = 90
    col_w    = (W - PAD * 2 - col_gap) // 2

    # Pre-measure header height
    _probe       = ImageDraw.Draw(Image.new("RGB", (W, 100)))
    title_font   = _font(52, bold=True)
    title_bottom = _probe.textbbox((PAD, 108), "Weekly Theater Stats", font=title_font)[3]
    sub_h        = _probe.textbbox((0, 0), "Ay", font=_font(26))[3]
    date_y       = title_bottom + 10
    divider_y    = date_y + sub_h + 20
    label_y      = divider_y + 18
    member_start = label_y + 26 + 14

    n_rows   = (len(members) + 1) // 2
    canvas_h = max(675, member_start + n_rows * row_h + footer_h)
    img  = Image.new("RGB", (W, canvas_h), BG)
    draw = ImageDraw.Draw(img)

    # Left accent bar
    draw.rectangle([0, 0, 7, canvas_h], fill=ACCENT)

    # Header: red dot + brand
    dot_x, dot_y = PAD + 9, 62
    draw.ellipse([dot_x - 9, dot_y - 9, dot_x + 9, dot_y + 9], fill=ACCENT)
    draw.text((PAD + 26, 46), "JKT48Tracker", font=_font(28, bold=True), fill=TEXT_PRI)

    # Title
    draw.text((PAD, 108), "Weekly Theater Stats", font=title_font, fill=TEXT_PRI)

    # Date range
    draw.text((PAD, date_y), date_range_str, font=_font(26), fill=TEXT_SEC)

    # Divider + label
    draw.rectangle([PAD, divider_y, W - PAD, divider_y + 2], fill=DIVIDER)
    draw.text((PAD, label_y), f"ALL MEMBERS ({len(members)})", font=_font(18), fill=TEXT_SEC)

    # Two-column member grid
    font_name  = _font(19)
    font_count = _font(17)
    col_origins = [PAD, PAD + col_w + col_gap]

    for idx, m in enumerate(members):
        row     = idx // 2
        col_idx = idx % 2
        col_x   = col_origins[col_idx]
        y       = member_start + row * row_h

        jkt48_id   = m.get("jkt48_id") or ""
        week_n     = m["week_count"]
        total_n    = m["total_count"]
        name_color = TEXT_PRI if week_n > 0 else TEXT_SEC

        # Avatar
        avatar = None
        if jkt48_id and jkt48_id in image_url_lookup:
            avatar = _fetch_avatar(image_url_lookup[jkt48_id])
        avatar_y = y + (row_h - AVATAR_SIZE) // 2
        if avatar:
            img.paste(avatar, (col_x, avatar_y), avatar)
        else:
            draw.ellipse([col_x, avatar_y, col_x + AVATAR_SIZE, avatar_y + AVATAR_SIZE], fill=DIVIDER)
        draw.ellipse([col_x, avatar_y, col_x + AVATAR_SIZE, avatar_y + AVATAR_SIZE], outline=DIVIDER, width=2)

        text_y = y + (row_h - 19) // 2
        name_x = col_x + AVATAR_SIZE + 8
        draw.text((name_x, text_y), m["name"], font=font_name, fill=name_color)

        # Stat right-aligned within column
        stat = f"{week_n}w · {total_n}"
        tw   = _text_width(draw, stat, font_count)
        col_right = col_x + col_w
        draw.text((col_right - tw, text_y + 1), stat, font=font_count, fill=TEXT_SEC)

    # Footer
    footer_y = canvas_h - footer_h
    draw.rectangle([PAD, footer_y, W - PAD, footer_y + 2], fill=DIVIDER)
    font_footer = _font(20)
    draw.text((PAD, footer_y + 16), PUBLIC_SITE_URL.replace("https://", ""), font=font_footer, fill=TEXT_DIM)
    hashtag = "#JKT48"
    tw = _text_width(draw, hashtag, font_footer)
    draw.text((W - PAD - tw, footer_y + 16), hashtag, font=font_footer, fill=TEXT_DIM)

    tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
    img.save(tmp.name, format="PNG")
    tmp.close()
    return tmp.name


# ── API helpers ───────────────────────────────────────────────────────────────

def _get_all_members() -> list[dict]:
    res = requests.get(f"{PUBLIC_API_URL}/members", timeout=10)
    res.raise_for_status()
    return [
        m for m in res.json()
        if not m.get("deleted_at") and m.get("team") != "JKT48_VIRTUAL"
    ]


def _get_weekly_stats(days: int = 7) -> dict[str, int]:
    res = requests.get(f"{PUBLIC_API_URL}/theater-schedules/member-stats?days={days}", timeout=10)
    res.raise_for_status()
    return {s["jkt48_id"]: s["show_count"] for s in res.json() if s.get("jkt48_id")}


def _get_cumulative_stats() -> dict[str, int]:
    res = requests.get(f"{PUBLIC_API_URL}/theater-schedules/member-stats", timeout=10)
    res.raise_for_status()
    return {s["jkt48_id"]: s["show_count"] for s in res.json() if s.get("jkt48_id")}


def _get_todays_show_count() -> int:
    today = date.today().isoformat()
    res = requests.get(
        f"{PUBLIC_API_URL}/theater-schedules?past=true&limit=10",
        timeout=10,
    )
    res.raise_for_status()
    return sum(1 for s in res.json() if s.get("show_date") == today)


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    preview = "--preview" in sys.argv

    if not preview:
        missing = [k for k in (
            "TWITTER_API_KEY", "TWITTER_API_SECRET",
            "TWITTER_ACCESS_TOKEN", "TWITTER_ACCESS_TOKEN_SECRET",
        ) if not os.getenv(k)]
        if missing:
            print(f"Missing Twitter env vars: {', '.join(missing)}", file=sys.stderr)
            sys.exit(1)

    # Check if any shows happened today (skipped in preview mode)
    if not preview:
        today_count = _get_todays_show_count()
        if today_count == 0:
            print("No shows today — skipping weekly stats post.")
            return

    # Date range: last 7 days
    today      = date.today()
    week_start = today - timedelta(days=6)
    date_range = f"{week_start.strftime('%b %-d')} – {today.strftime('%b %-d, %Y')}"

    # Fetch data
    all_members      = _get_all_members()
    weekly_lookup    = _get_weekly_stats(days=7)
    cumulative_lookup = _get_cumulative_stats()
    image_url_lookup = _get_member_image_urls()

    # Merge and sort
    merged = []
    for m in all_members:
        jkt48_id = m.get("jkt48_id") or ""
        merged.append({
            "name":        m["name"],
            "jkt48_id":    jkt48_id,
            "week_count":  weekly_lookup.get(jkt48_id, 0),
            "total_count": cumulative_lookup.get(jkt48_id, 0),
        })
    merged.sort(key=lambda m: (-m["week_count"], -m["total_count"]))

    print(f"Generating weekly stats image for {date_range} ({len(merged)} members)...")
    img_path = generate_weekly_image(merged, image_url_lookup, date_range)

    if preview:
        import shutil
        dest = os.path.join(os.path.dirname(__file__), "..", "weekly_preview.png")
        shutil.copy(img_path, dest)
        os.unlink(img_path)
        print(f"Preview saved to: {os.path.abspath(dest)}")
        return

    try:
        api    = _twitter_api()
        client = _twitter_client()
        media  = api.media_upload(filename=img_path)
        caption = f"JKT48 Weekly Theater Stats | {date_range}\n\n#JKT48 #JKT48Tracker_Theater"
        client.create_tweet(text=caption, media_ids=[media.media_id_string])
        print(f"Tweeted weekly stats for {date_range}")
    finally:
        os.unlink(img_path)


if __name__ == "__main__":
    main()

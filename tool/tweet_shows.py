"""
Auto-tweet past theater shows that haven't been posted yet.

Finds shows that ended >150 min ago and have no tweeted_at timestamp,
posts a tweet for each, then marks them as tweeted.

Run manually:   python tool/tweet_shows.py
Run via cron:   */30 * * * * cd /app && python tool/tweet_shows.py >> /var/log/tweet_shows.log 2>&1

Required env vars:
  INTERNAL_API_URL      backend internal API base (default: http://localhost:8000/internal)
  INTERNAL_API_KEY      shared secret for internal endpoints
  PUBLIC_API_URL        backend public API base (default: http://localhost:8000/api)
  PUBLIC_SITE_URL       frontend URL for show links (default: https://jkt48tracker.com)
  TWITTER_API_KEY           Twitter/X consumer key
  TWITTER_API_SECRET        Twitter/X consumer secret
  TWITTER_ACCESS_TOKEN      access token for the posting account
  TWITTER_ACCESS_TOKEN_SECRET  access token secret
"""
import os
import sys
from datetime import datetime

import requests
import tweepy
from dotenv import load_dotenv

load_dotenv()

INTERNAL_API_URL = os.getenv("INTERNAL_API_URL", "http://localhost:8000/internal")
INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "")
PUBLIC_API_URL = os.getenv("PUBLIC_API_URL", "http://localhost:8000/api")
PUBLIC_SITE_URL = os.getenv("PUBLIC_SITE_URL", "https://jkt48tracker.com")

TWITTER_API_KEY = os.getenv("TWITTER_API_KEY", "")
TWITTER_API_SECRET = os.getenv("TWITTER_API_SECRET", "")
TWITTER_ACCESS_TOKEN = os.getenv("TWITTER_ACCESS_TOKEN", "")
TWITTER_ACCESS_TOKEN_SECRET = os.getenv("TWITTER_ACCESS_TOKEN_SECRET", "")

# Twitter counts any URL as 23 chars regardless of actual length
TWITTER_URL_LENGTH = 23
MAX_TWEET = 280


def _format_date(iso_date: str) -> str:
    return datetime.strptime(iso_date, "%Y-%m-%d").strftime("%B %-d, %Y")


def _build_tweet(show: dict, stat_lookup: dict[str, int], page_url: str) -> str:
    header_parts = [
        show.get("setlist_name") or "JKT48 Theater Show",
        _format_date(show["show_date"]) if show.get("show_date") else None,
        f"{show['show_time']} WIB" if show.get("show_time") else None,
    ]
    header = " | ".join(p for p in header_parts if p)

    members = show.get("members", [])
    sorted_members = sorted(
        members,
        key=lambda m: stat_lookup.get(m.get("jkt48_id") or "", 0),
        reverse=True,
    )

    intro = f"{header}\n\nMembers:\n"
    # Placeholder of TWITTER_URL_LENGTH spaces to correctly measure the char budget
    footer = "\n\n" + " " * TWITTER_URL_LENGTH

    member_body = ""
    truncated = 0
    for i, m in enumerate(sorted_members):
        count = stat_lookup.get(m.get("jkt48_id") or "", None)
        line = f"{m['name']} ({count} shows)\n" if count is not None else f"{m['name']}\n"
        if len(intro + member_body + line + footer) > MAX_TWEET:
            truncated = len(sorted_members) - i
            break
        member_body += line

    if truncated:
        member_body += f"...and {truncated} more"

    return intro + member_body + f"\n\n{page_url}"


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


def main():
    missing = [k for k in ("TWITTER_API_KEY", "TWITTER_API_SECRET", "TWITTER_ACCESS_TOKEN", "TWITTER_ACCESS_TOKEN_SECRET") if not os.getenv(k)]
    if missing:
        print(f"Missing Twitter env vars: {', '.join(missing)}", file=sys.stderr)
        sys.exit(1)

    shows = _get_untweeted()
    if not shows:
        print("No untweeted shows.")
        return

    stat_lookup = _get_member_stats()
    client = _twitter_client()

    for show in shows:
        page_url = f"{PUBLIC_SITE_URL}/theater/{show['id']}"
        tweet_text = _build_tweet(show, stat_lookup, page_url)

        try:
            client.create_tweet(text=tweet_text)
            _mark_tweeted(show["id"])
            label = show.get("setlist_name") or f"show #{show['id']}"
            print(f"Tweeted: {label} ({show.get('show_date')} {show.get('show_time')})")
        except Exception as e:
            print(f"Failed to tweet show {show['id']}: {e}", file=sys.stderr)


if __name__ == "__main__":
    main()

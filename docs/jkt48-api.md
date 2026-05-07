# JKT48 Public API

Base URL: `https://jkt48.com`

All endpoints accept a `lang` query param (`id` for Indonesian, `en` for English).  
All responses wrap data in `{ "status": bool, "message": str, "data": ... }`.

---

## Schedules

### List schedules by month

```
GET /api/v1/schedules?lang=id&month={month}&year={year}
```

Returns all shows and events for the given month/year. **Historical data is available from December 2011** (the earliest month with data in the API).

**Response `data`** — array of:

| Field | Type | Notes |
|---|---|---|
| `schedule_id` | int | Unique show ID |
| `link` | string | Slug used for detail lookup (see note below) |
| `date` | string | UTC ISO 8601. Represents **midnight WIB** (UTC+7); convert to local date by adding 7 h |
| `start_time` | string | `"HH:MM:SS"`. **Unreliable for older shows** — may be `"00:00:00"`. Use detail API instead |
| `end_time` | string | `"HH:MM:SS"` |
| `type` | string | `"SHOW"` or `"EVENT"` |
| `title` | string | Setlist / event name |
| `jkt48_member_type` | string | `"JKT48"`, `"LOVE"`, `"DREAM"`, `"PASSION"`, `"TRAINEE"` |
| `birthday_member` | string\|null | `"BIRTHDAY"` if a member birthday show, else `null` |
| `reference_code` | string | Ticket reference code (e.g. `"SHC5F2"`) |

**`link` format:**
- Newer shows (≈ 2026+): `{reference_code_lowercase}-{title-slug}` → `shc5f2-cara-meminum-ramune`
- Older shows: `{schedule_id}{title-slug}` (no separator) → `7538sambil-menggandeng-erat-tanganku`

**Date handling example:**
```python
from datetime import datetime, timezone, timedelta
WIB = timezone(timedelta(hours=7))
dt = datetime.fromisoformat("2025-10-31T17:00:00.000Z".replace("Z", "+00:00"))
show_date = dt.astimezone(WIB).date().isoformat()  # → "2025-11-01"
```

---

### Get schedule detail

```
GET /api/v1/schedules/{link}?lang=id
```

**Response `data`:**

| Field | Type | Notes |
|---|---|---|
| `code` | string | Reference code |
| `theater_show_id` | int | Internal theater ID |
| `date` | string | Same UTC ISO format as list |
| `start_time` | string | `"HH:MM"` — **authoritative**; use this over list API |
| `end_time` | string | `"HH:MM"` |
| `reception_start_time` | string | Gate open time `"HH:MM:SS"` |
| `title` | string | Setlist name |
| `set_list` | string | Internal setlist code (e.g. `"SL_8"`) |
| `jkt48_member_type` | string | Same as list |
| `default_price` | int | Ticket price in IDR |
| `total_quota` | int | Total ticket quota |
| `jkt48_member` | array | Performing members (see below) |
| `sales_period` | array | Ticket sale windows (OFC raffle, general, etc.) |

**`jkt48_member` items:**

| Field | Type | Notes |
|---|---|---|
| `name` | string | Member display name |
| `type` | string | Team type: `"LOVE"`, `"DREAM"`, `"PASSION"`, `"TRAINEE"` |
| `member_id` | int | Numeric member ID; maps to `jkt48_member_id` in member API |

To construct the `jkt48_id` used in this project:
```python
import re
slug = re.sub(r"\s+", "-", name.lower().strip())
jkt48_id = f"{slug}-{member_id}"  # e.g. "alya-amanda-13"
```

---

## Members

### List all members

```
GET /api/v1/members?lang=id
```

Returns all 68 active members.

**Response `data`** — array of:

| Field | Type | Notes |
|---|---|---|
| `jkt48_member_id` | int | Numeric ID; used for detail lookup and `jkt48_id` construction |
| `name` | string | Full name |
| `nickname` | string | Stage nickname |
| `code` | string | Uppercase underscore code (e.g. `"ALYA_AMANDA"`) |
| `type` | string | Team type |
| `photo` | string | Profile photo URL |

### Get member detail

```
GET /api/v1/members/{jkt48_member_id}?lang=id
```

| Field | Type |
|---|---|
| `name`, `nickname`, `code`, `type` | string |
| `birth_date` | string (UTC ISO) |
| `birth_place`, `blood_type`, `horoscope` | string |
| `body_height` | string (cm) |
| `twitter_account`, `instagram_account`, `tiktok_account` | string |
| `photo_1`, `photo_2`, `photo_3` | string (full URL) |
| `photo` | string (relative path under `/api/v1/storages/media/`) |

---

## Media / Storage

```
GET /api/v1/storages/media/{path}
```

Serves images and videos. Paths appear in member `photo` fields and other assets.  
Full URLs are constructed as `https://jkt48.com/api/v1/storages/media/{path}`.

---

## Menu

```
GET /api/v1/menu?lang=id
```

Returns site navigation structure (not useful for data scraping).

---

## Notes

- No authentication required for any of the above endpoints.
- No explicit rate limit documented; add a short delay (≥ 300 ms) between requests to be polite.
- The website itself is a Nuxt.js SPA; all data is loaded via these API calls — no browser automation needed.

# JKT48 Tracker — Claude Context

Fan-built site tracking all JKT48 theater shows, member stats, and schedules since 2011.

## Stack

| Layer | Tech |
|-------|------|
| Backend | FastAPI (Python 3.12), SQLAlchemy ORM, Alembic |
| Database | MySQL 8 (Docker), SQLite fallback for local |
| Frontend | Next.js 16 App Router, React 19, Tailwind CSS v4 |
| Infra | Docker Compose, GCP e2-small (`asia-southeast1-a`) |
| CI/CD | GitHub Actions → GHCR → Watchtower (backend + frontend auto-deploy) |

## Repo Layout

```
backend/          FastAPI app
  models/         SQLAlchemy ORM models (soft deletes: deleted_at unix int)
  repositories/   Raw DB queries
  services/       Business logic wrapping repos
  routes/         Public API (/api) + Internal API (/internal, X-API-Key auth)
  migrations/     Alembic migration chain

frontend/src/app/ Next.js App Router pages
  page.tsx        Homepage: hero, birthdays, top performers, charts, shows
  members/        Member list + [jkt48_id] detail
  theater/        Schedule list + [id] show detail
  setlists/       Setlist list + [name] detail
  _components/    Client components (TopPerformers, etc.)

tool/             Standalone Python scripts (run on host or via Docker)
  theater.py      Scrapes jkt48.com → syncs shows to backend
  member.py       Scrapes jkt48.com/member (headless Chrome via nodriver)
  tweet_daily_stats.py   Posts daily member stats image to Twitter
  tweet_shows.py  Show tweet card generator (cron disabled; kept for manual use)
  Dockerfile.tweet       Lightweight image for tweet scripts

local/            Local dev Docker Compose (make build/up/down/migrate)
docs/             jkt48.com API reference
docker-compose.yml  Production Docker Compose (deployed to GCP)
Makefile          Local dev shortcuts
```

## Local Dev

```bash
make build    # docker compose build
make up       # docker compose up -d
make migrate  # run Alembic migrations
make logs     # tail backend logs
```

Frontend runs separately: `cd frontend && npm run dev`

## Production Deployment

**Server:** GCP `jkt48tracker`, zone `asia-southeast1-a`
**SSH:** `gcloud compute ssh jkt48tracker --zone=asia-southeast1-a`
**Files live at:** `~/jkt48tracker/`

- Backend + frontend: GitHub Actions builds Docker images → pushes to GHCR → Watchtower auto-pulls every 5 min
- Tool scripts: `gcloud compute scp tool/<file>.py jkt48tracker:~/jkt48tracker/tool/` (no git on server)
- Tweet script runs via: `docker pull ghcr.io/rahandi/jkt48tracker-tools:latest && docker run --rm --env-file ~/jkt48tracker/.env ...`

**Crontab on server:**
```
0 17 * * *  /home/rahandi/jkt48tracker/tool/scrape.sh         # data sync
0 16 * * *  docker pull ... && docker run ... tweet_daily_stats.py  # 23:00 WIB
```

## Key Patterns

**Backend:**
- All models have `deleted_at` (unix int, null = active) — always filter `deleted_at.is_(None)`
- `jkt48_id` format: `slug-name-{numeric_id}` e.g. `freya-jaegar-123`
- Internal API requires `X-Api-Key` header matching `INTERNAL_API_KEY` env var
- Schema changes need an Alembic migration; new sync fields need explicit Pydantic model declaration

**Frontend:**
- `fetch()` calls use `{ cache: "no-store" }` for schedule data (avoid stale shows)
- Setlist names can contain special chars (♥) — always `encodeURIComponent` in Links, `decodeURIComponent` in params
- After API shape changes, delete `frontend/.next` to clear disk cache
- Circular avatars use `object-cover object-[center_15%]` to avoid cropping heads

**Twitter automation:**
- No URLs in tweet captions — costs $0.20/tweet vs $0.015 without
- Daily stats: caption = `#JKT48 #JKT48Tracker #JKT48RekapTheater`
- Show card: caption = `#JKT48 #JKT48Tracker #JKT48ShowTheater`
- Image design: light theme (`#f7f3f4` bg, `#e4002b` accent), circular 32px avatars
- Tools Docker image: `ghcr.io/rahandi/jkt48tracker-tools:latest` — rebuilt by CI on changes to `tool/tweet_*.py` or `tool/Dockerfile.tweet`

## Member Teams

`LOVE`, `DREAM`, `PASSION`, `TRAINEE`, `JKT48_VIRTUAL` (virtual — excluded from stats/tweets)

## API Quick Reference

```
GET /api/members/                          list members (?team=)
GET /api/members/{jkt48_id}                member detail
GET /api/members/upcoming-birthdays?days=30
GET /api/theater-schedules/               list shows (?upcoming/past/ongoing/team/setlist_name)
GET /api/theater-schedules/member-stats   [{jkt48_id, name, show_count}] (?days=N for window)
GET /api/theater-schedules/{id}           show detail with members + related shows
POST /internal/members/sync               upsert members (X-Api-Key)
POST /internal/theater-schedules/sync     upsert shows (X-Api-Key)
```

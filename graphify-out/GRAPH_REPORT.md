# Graph Report - .  (2026-05-05)

## Corpus Check
- Corpus is ~3,929 words - fits in a single context window. You may not need a graph.

## Summary
- 169 nodes · 167 edges · 33 communities (24 shown, 9 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.77)
- Token cost: 1,684 input · 976 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Frontend UI Components|Frontend UI Components]]
- [[_COMMUNITY_Member Data Access Layer|Member Data Access Layer]]
- [[_COMMUNITY_Internal API & Auth|Internal API & Auth]]
- [[_COMMUNITY_Frontend Pages & Utils|Frontend Pages & Utils]]
- [[_COMMUNITY_Member Model & Sync|Member Model & Sync]]
- [[_COMMUNITY_Selenium Web Scraper|Selenium Web Scraper]]
- [[_COMMUNITY_Database & Migration Env|Database & Migration Env]]
- [[_COMMUNITY_ORM Base Models|ORM Base Models]]
- [[_COMMUNITY_Database Session|Database Session]]
- [[_COMMUNITY_Alembic Migration Chain|Alembic Migration Chain]]
- [[_COMMUNITY_FastAPI Router Tree|FastAPI Router Tree]]
- [[_COMMUNITY_Static UI Assets|Static UI Assets]]
- [[_COMMUNITY_Schema Type Migration|Schema Type Migration]]
- [[_COMMUNITY_Empty Revision|Empty Revision]]
- [[_COMMUNITY_Column Width Migration|Column Width Migration]]
- [[_COMMUNITY_Create Members Table|Create Members Table]]
- [[_COMMUNITY_Add Member Fields|Add Member Fields]]
- [[_COMMUNITY_Repository CRUD Ops|Repository CRUD Ops]]
- [[_COMMUNITY_Member Lookup Routes|Member Lookup Routes]]
- [[_COMMUNITY_Vercel Brand Assets|Vercel Brand Assets]]
- [[_COMMUNITY_Next.js Brand Assets|Next.js Brand Assets]]
- [[_COMMUNITY_Root Layout Component|Root Layout Component]]
- [[_COMMUNITY_Globe Icon Asset|Globe Icon Asset]]

## God Nodes (most connected - your core abstractions)
1. `MemberRepository` - 12 edges
2. `MemberService` - 8 edges
3. `cn class name utility` - 8 edges
4. `main()` - 7 edges
5. `Member` - 5 edges
6. `MemberService` - 5 edges
7. `HomePage Next.js Page` - 5 edges
8. `MemberPage Next.js Page` - 5 edges
9. `scrape_member_detail()` - 4 edges
10. `sync_members()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `MemberSyncItem` --semantically_similar_to--> `scrape_member_detail`  [INFERRED] [semantically similar]
  backend/routes/internal/member_routes.py → tool/member.py
- `Docker Compose Service Topology` --rationale_for--> `sync_members endpoint`  [INFERRED]
  local/docker-compose.yaml → backend/routes/internal/member_routes.py
- `getMembers fetch function` --shares_data_with--> `MemberService.get_all`  [INFERRED]
  frontend/src/app/page.tsx → backend/services/member_service.py
- `getMember fetch function` --shares_data_with--> `MemberService.get_by_jkt48_id`  [INFERRED]
  frontend/src/app/members/[jkt48_id]/page.tsx → backend/services/member_service.py
- `sync_to_api` --calls--> `sync_members()`  [INFERRED]
  tool/member.py → backend/routes/internal/member_routes.py

## Hyperedges (group relationships)
- **Scraper → Internal API → DB sync pipeline** — member_sync_to_api, internal_member_routes_sync_members, member_repository_upsert [INFERRED 0.95]
- **Alembic migration chain for members table** — migration_a8f6ced321a1, migration_2e27d245d57c, migration_c1d2e3f4a5b6, migration_d2e3f4a5b6c7, migration_e3f4a5b6c7d8 [EXTRACTED 1.00]
- **FastAPI router hierarchy: app → api/internal → member routes** — main_app, routes_routes_router, internal_routes_router, member_routes_router, internal_member_routes_router [EXTRACTED 1.00]
- **Member Sync Data Flow: Route -> Service -> Repository -> DB** — member_routes_sync_members, member_service_sync, member_member [INFERRED 0.95]
- **Frontend Member Display Pipeline: fetch -> render -> UI components** — page_getmembers, page_homepage, card_card, badge_badge [INFERRED 0.85]
- **Member Detail Page Pipeline: fetch -> format -> display** — memberpage_getmember, memberpage_memberpage, utils_formatdate, utils_calcage [INFERRED 0.85]

## Communities (33 total, 9 thin omitted)

### Community 0 - "Frontend UI Components"
Cohesion: 0.12
Nodes (18): Badge UI Component, badgeVariants CVA config, Card UI Component, CardAction UI Component, CardContent UI Component, CardDescription UI Component, CardFooter UI Component, CardHeader UI Component (+10 more)

### Community 2 - "Internal API & Auth"
Cohesion: 0.14
Nodes (13): BaseModel, require_api_key(), MemberSyncItem, MemberSyncItem, sync_members(), _make_browser, _parse_dob, _parse_height (+5 more)

### Community 3 - "Frontend Pages & Utils"
Cohesion: 0.16
Nodes (4): calcAge(), cn(), formatDate(), Badge()

### Community 4 - "Member Model & Sync"
Cohesion: 0.18
Nodes (12): Upsert-based Member Sync Pattern, Base SQLAlchemy Model, _now timestamp function, Docker Compose Service Topology, Member ORM Model, MemberSyncItem, sync_members endpoint, MemberService.get_all (+4 more)

### Community 5 - "Selenium Web Scraper"
Cohesion: 0.35
Nodes (10): _delay(), _find_chrome(), main(), _make_browser(), _parse_dob(), _parse_height(), run(), scrape_member_detail() (+2 more)

### Community 6 - "Database & Migration Env"
Cohesion: 0.33
Nodes (6): Database, get_session (module-level), Run migrations in 'offline' mode.      This configures the context with just a U, Run migrations in 'online' mode.      In this scenario we need to create an Engi, run_migrations_offline(), run_migrations_online()

### Community 7 - "ORM Base Models"
Cohesion: 0.33
Nodes (3): Base, Base, Member

### Community 9 - "Alembic Migration Chain"
Cohesion: 0.4
Nodes (5): Migration: empty (revises a8f6ced321a1), Migration: create members table, Migration: add jkt48_id and image_url to members, Migration: widen jkt48_id to 50 chars, Migration: change dob to DATE, add index on deleted_at

### Community 10 - "FastAPI Router Tree"
Cohesion: 0.4
Nodes (5): Internal Member Routes Router, Internal Router (/internal prefix), FastAPI app, Member Routes Router (/members prefix), API Router (/api prefix)

### Community 11 - "Static UI Assets"
Cohesion: 0.6
Nodes (5): File / Document Icon (SVG), Frontend Public Static Assets, Next.js Frontend Application, Browser/Application Window UI Concept, Window / Browser Window Icon

### Community 18 - "Repository CRUD Ops"
Cohesion: 0.67
Nodes (3): MemberRepository.create, MemberRepository.update, MemberRepository.upsert

### Community 19 - "Member Lookup Routes"
Cohesion: 0.67
Nodes (3): MemberRepository, get_member endpoint, get_members endpoint

### Community 20 - "Vercel Brand Assets"
Cohesion: 1.0
Nodes (3): Frontend Public Directory, Vercel, Vercel Logo (SVG)

### Community 21 - "Next.js Brand Assets"
Cohesion: 1.0
Nodes (3): Frontend Public Assets Directory, Next.js Wordmark SVG, Next.js Brand / Logo

## Knowledge Gaps
- **36 isolated node(s):** `Run migrations in 'offline' mode.      This configures the context with just a U`, `Run migrations in 'online' mode.      In this scenario we need to create an Engi`, `change dob to DATE, add index on deleted_at  Revision ID: e3f4a5b6c7d8 Revises:`, `empty message  Revision ID: 2e27d245d57c Revises: a8f6ced321a1 Create Date: 2025`, `widen jkt48_id to 50 chars  Revision ID: d2e3f4a5b6c7 Revises: c1d2e3f4a5b6 Crea` (+31 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MemberService` connect `Member Data Access Layer` to `Internal API & Auth`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `MemberRepository` connect `Member Data Access Layer` to `ORM Base Models`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `MemberSyncItem` connect `Internal API & Auth` to `Member Data Access Layer`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `MemberRepository` (e.g. with `Member` and `MemberService`) actually correct?**
  _`MemberRepository` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `MemberService` (e.g. with `MemberSyncItem` and `MemberRepository`) actually correct?**
  _`MemberService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `Member` (e.g. with `MemberRepository` and `Base`) actually correct?**
  _`Member` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Run migrations in 'offline' mode.      This configures the context with just a U`, `Run migrations in 'online' mode.      In this scenario we need to create an Engi`, `change dob to DATE, add index on deleted_at  Revision ID: e3f4a5b6c7d8 Revises:` to the rest of the system?**
  _36 weakly-connected nodes found - possible documentation gaps or missing edges._
# Architecture Decision: Tech Stack (v1)

## Decision Date
2026-02-11

## Context
Guild Ads v1 requires:
- Low-latency ad serving API with multi-step selection logic
- Web dashboard for advertisers and publishers
- Background jobs for reporting aggregation and creative validation
- Auth for two user types (advertisers, publishers)
- Asset storage for creative images

## Decision
**Hybrid stack: Supabase + Render**

| Layer | Service | Rationale |
|-------|---------|-----------|
| Database | Supabase Postgres | Familiar, RLS for multi-tenant security, good tooling |
| Auth | Supabase Auth | Built-in, handles both user types, magic links + OAuth ready |
| Asset Storage | Supabase Storage | CDN integration, simple API, co-located with DB |
| API Server | Render Web Service | Full control over ad serving logic, supports background workers |
| Background Jobs | Render Background Workers + Cron | Reporting aggregation, creative linting, billing reconciliation |
| Web App | Render (or Vercel) | Dashboard + marketing site, Next.js |

## Alternatives Considered

### All-Supabase (Edge Functions)
- **Rejected because:** Edge functions have cold starts and execution limits; ad serving logic is multi-step and benefits from persistent connections; no native background worker support.

### All-Render (with managed Postgres)
- **Rejected because:** Loses Supabase's auth, RLS, and dashboard tooling that accelerate development.

### Supabase + Vercel
- **Viable alternative** if we prefer serverless. Vercel Cron covers scheduled jobs. May revisit if Render proves unnecessary.

## Consequences
- Two services to manage (Supabase project + Render services)
- API server needs Supabase client library for DB access
- Need to keep Supabase connection pooling in mind (use `@supabase/supabase-js` with service role key for server)
- Render handles horizontal scaling when needed

## Repository Structure
```
Guild-Ads/
├── docs/                    # Documentation (this folder)
├── apps/
│   ├── api/                 # Render web service (Node.js/TypeScript)
│   └── web/                 # Next.js dashboard + marketing
├── packages/
│   └── shared/              # Shared types, constants, utils
├── supabase/
│   ├── migrations/          # SQL migrations
│   ├── seed.sql             # Dev seed data
│   └── config.toml          # Supabase local config
└── sdk/
    └── ios/                 # iOS SDK (separate, later)
```

## Services Overview

### API Server (`apps/api`)
- **Runtime:** Node.js 20+ with TypeScript
- **Framework:** Hono (lightweight, fast, good for APIs)
- **Endpoints:**
  - `POST /v1/serve` — ad decision
  - `POST /v1/impression` — log render event
  - `GET /r/:ad_id` — click redirect
  - `POST /v1/conversions` — optional conversion ping
- **Deploy:** Render Web Service

### Web App (`apps/web`)
- **Framework:** Next.js 14+ (App Router)
- **Auth:** Supabase Auth (via `@supabase/ssr`)
- **Sections:**
  - `/` — Marketing/landing
  - `/login`, `/signup` — Auth flows
  - `/dashboard/advertiser/*` — Campaign management, reporting
  - `/dashboard/publisher/*` — App/placement management, earnings
  - `/admin/*` — Internal moderation (later)
- **Deploy:** Render Static Site or Vercel

### Background Workers
- **Reporting aggregation:** Daily job rolls up raw events into aggregate tables
- **Creative linting:** Validates uploaded assets (dimensions, file size, safe content)
- **Billing reconciliation:** Weekly job for payout calculations
- **Deploy:** Render Background Workers + Cron Jobs

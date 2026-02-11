# Backend API (v1)

## Goals
- Serve sponsor cards to eligible placements
- Collect impression/click events safely (signed + deduped)
- Support advertiser campaigns: buying slots, uploading creatives, reporting
- Support publisher reporting and payouts

## Guiding constraints
- No user identifiers
- Contextual selection only
- Auditability and transparency

## Core endpoints (v1)
- `POST /v1/serve` — returns an ad decision for a placement
- `POST /v1/impression` — logs a render event (deduped)
- `GET  /r/{ad_id}` — click redirect; logs click and redirects to destination
- `POST /v1/conversions` (optional) — aggregate conversion ping via ephemeral token

## Supporting services
- Creative validation (“ad lint”)
- Fraud checks (basic)
- Billing and receipts
- Reporting aggregation jobs

Docs:
- `docs/50-api/serve-endpoint.md`
- `docs/50-api/events.md`
- `docs/60-reporting/metrics.md`

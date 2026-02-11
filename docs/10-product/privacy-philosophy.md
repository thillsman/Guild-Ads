# Privacy Philosophy

## Core commitment
This network does **not** do behavioral advertising.

No:
- device identifiers
- cross-app user tracking
- retargeting
- lookalike audiences
- third-party pixels

## What we do instead (contextual)
- Ads are selected using contextual signals:
  - app + placement category
  - optional publisher-supplied tags (e.g., “podcasts”, “markdown”)
  - coarse locale signals (language/region), optional
- Frequency caps and pacing happen **on-device**, not server-side via user IDs.

## Reporting (aggregate)
- Advertisers see: spend, impressions, clicks, CTR, top bundles/categories, and (optionally) top apps if publishers opt in.
- Publishers see: revenue, fill rate, eCPM-like aggregates, placement performance.
- We apply thresholds to avoid small-number re-identification risks (e.g., do not show rows <5 conversions).

## Optional conversion measurement (opt-in)
- Redeem codes (simple, indie-friendly)
- Optional “conversion ping” using ephemeral tokens:
  - click redirect mints a token valid for ~24h
  - advertiser sends token back on conversion event
  - only aggregate results are reported

See: `docs/60-reporting/conversions.md`

# Data Model (Conceptual)

This is a **conceptual** data model for Guild Ads v1. It’s meant to align product, backend, SDK, and dashboards.
Field lists are suggested; adjust to your implementation (SQL tables, Prisma models, etc.).

## High-level relationships

- Publisher 1—N App
- App 1—N Placement
- Bundle N—M Placement (bundle membership)
- Advertiser 1—N Campaign
- Campaign 1—1 Creative (v1; allow multiple creatives later)
- Campaign 1—N SlotBookings (if you allow repeated weeks/days)
- Creative 1—N Assets
- ServeDecision produced for (Placement, time) → references a Campaign/Creative
- Events: Impression / Click (and optional Conversion) link back to ServeDecision / Campaign / Creative

## Core entities

### Publisher
Represents an entity that shows ads.
Suggested fields:
- `publisher_id` (pk)
- `name`
- `email`
- `status` (active, paused, review)
- `payout_method` (provider ref)
- `created_at`, `updated_at`

### App
An iOS app registered by a publisher.
Suggested fields:
- `app_id` (pk)
- `publisher_id` (fk)
- `name`
- `platform` (ios)
- `bundle_identifier`
- `status` (active, paused, review)
- `created_at`, `updated_at`

### Placement
A location in an app where a Sponsor Card can render.
Suggested fields:
- `placement_id` (pk)
- `app_id` (fk)
- `key` (e.g., `settings_footer`)
- `category_id` (fk)
- `tags` (string array)
- `enabled` (bool)
- `local_frequency_cap_policy` (json; defaults)
- `notes` (optional)
- `created_at`, `updated_at`

### Advertiser
Represents an entity that buys slots.
Suggested fields:
- `advertiser_id` (pk)
- `name`
- `billing_customer_id` (Stripe, etc.)
- `status` (active, paused, review)
- `created_at`, `updated_at`

### Bundle
Curated collection of placements.
Suggested fields:
- `bundle_id` (pk)
- `name`
- `description`
- `status` (active, paused)
- `base_weekly_price_cents`
- `price_floor_cents`, `price_ceiling_cents`
- `created_at`, `updated_at`

### BundlePlacement (join table)
Suggested fields:
- `bundle_id` (fk)
- `placement_id` (fk)
- `added_at`
- `status` (active, removed)

### Creative
Sponsor Card content.
Suggested fields:
- `creative_id` (pk)
- `advertiser_id` (fk)
- `headline`
- `body`
- `cta`
- `sponsored_label` (default "Sponsored")
- `destination_type` (url, universal_link, deep_link)
- `destination_value`
- `status` (draft, submitted, approved, rejected, disabled)
- `approved_at`, `rejected_reason`

### Asset
A file referenced by a creative.
Suggested fields:
- `asset_id` (pk)
- `creative_id` (fk)
- `type` (icon, image)
- `url`
- `bytes`
- `mime_type`
- `width`, `height`
- `sha256` (optional)
- `created_at`

### Campaign
What is actually scheduled + served.
Suggested fields:
- `campaign_id` (pk)
- `advertiser_id` (fk)
- `bundle_id` (fk)
- `creative_id` (fk)
- `name`
- `status` (scheduled, active, completed, paused, canceled)
- `created_at`, `updated_at`

### SlotBooking
Represents purchased time windows (weekly/daily).
Suggested fields:
- `slot_booking_id` (pk)
- `campaign_id` (fk)
- `bundle_id` (fk)
- `slot_type` (daily, weekly)
- `start_at`, `end_at`
- `price_cents`
- `payment_type` (card, credits, mixed)
- `created_at`

### CreditLedgerEntry (optional)
Tracks earned/spent credits.
Suggested fields:
- `entry_id` (pk)
- `publisher_id` (fk, nullable)
- `advertiser_id` (fk, nullable)
- `type` (earn, spend, grant, expire, adjust)
- `amount_cents`
- `related_campaign_id` (nullable)
- `expires_at` (nullable)
- `created_at`

## Serving + events

### ServeDecision (optional persistence)
You may persist ad decisions for debuggability and attribution of events.
Suggested fields:
- `serve_id` (pk)
- `ad_id` (public identifier; may equal `serve_id`)
- `campaign_id`
- `creative_id`
- `placement_id`
- `issued_at`
- `expires_at`
- `nonce_hash` (store hash, not raw)
- `sdk_version`, `os_major`, `locale` (coarse; optional)

### ImpressionEvent (raw, short retention)
Suggested fields:
- `event_id` (pk)
- `serve_id` or (`campaign_id`, `creative_id`, `placement_id`, `time_bucket`)
- `ts`
- `dedupe_key`
- `ingested_at`

### ClickEvent (raw, short retention)
Suggested fields:
- same as impressions
- may mint `conversion_token_id` (optional)

### ConversionEvent (optional, aggregate-friendly)
Suggested fields:
- `conversion_id` (pk)
- `token_id` (or hashed token)
- `event` (trial_start, purchase, etc.)
- `value_cents` (optional)
- `ts`

## Reporting aggregates (materialized)
For dashboards, create daily aggregates keyed by:
- advertiser: `date, campaign_id, bundle_id`
- publisher: `date, app_id, placement_id`
Metrics:
- impressions, clicks, CTR
- spend (advertiser), earnings (publisher)
- fill rate (publisher)

## Privacy notes
- Do not store user identifiers.
- Keep locale and device data coarse and optional.
- Apply thresholds in reporting queries (don’t show small counts).

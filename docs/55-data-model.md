# Data Model

Guild Ads uses a simplified data model focused on getting ads running quickly.

## Core Entities

### apps
iOS apps registered by users. Can be used for both publishing (showing ads) and advertising (promoting the app).

| Field | Type | Description |
|-------|------|-------------|
| `app_id` | uuid | Primary key |
| `user_id` | uuid | Owner (FK to auth.users) |
| `name` | text | App name |
| `bundle_identifier` | text | iOS bundle ID |
| `app_store_id` | text | App Store ID |
| `subtitle` | text | App Store subtitle |
| `icon_url` | text | App icon URL |
| `app_store_url` | text | App Store link |
| `platform` | text | Always 'ios' for now |
| `status` | text | active, paused, review |
| `created_at` | timestamptz | |

### app_tokens
API keys for the publisher SDK. One app can have multiple tokens.

| Field | Type | Description |
|-------|------|-------------|
| `token_id` | uuid | Primary key |
| `app_id` | uuid | FK to apps |
| `user_id` | uuid | Owner |
| `token_hash` | text | Hashed token (never store raw) |
| `name` | text | Label (e.g., "Production") |
| `last_used_at` | timestamptz | Last SDK request |
| `revoked_at` | timestamptz | Null if active |
| `created_at` | timestamptz | |

### campaigns
Ad campaigns promoting an app. Creative content is stored inline.

| Field | Type | Description |
|-------|------|-------------|
| `campaign_id` | uuid | Primary key |
| `user_id` | uuid | Owner |
| `app_id` | uuid | App being promoted |
| `name` | text | Campaign name (internal) |
| `headline` | text | Ad headline |
| `body` | text | Ad body text |
| `cta_text` | text | Call to action button |
| `destination_url` | text | Where clicks go |
| `status` | text | scheduled, active, completed, paused, canceled |
| `created_at` | timestamptz | |

### weekly_slots
Weekly network pricing. The entire network has one price per week.

| Field | Type | Description |
|-------|------|-------------|
| `slot_id` | uuid | Primary key |
| `week_start` | date | Sunday of the week (unique) |
| `base_price_cents` | integer | Network price in cents |
| `total_impressions_estimate` | integer | Expected impressions |
| `total_users_estimate` | integer | Expected unique users |
| `created_at` | timestamptz | |

### slot_purchases
Advertiser bookings against weekly slots.

| Field | Type | Description |
|-------|------|-------------|
| `purchase_id` | uuid | Primary key |
| `slot_id` | uuid | FK to weekly_slots |
| `user_id` | uuid | Advertiser |
| `campaign_id` | uuid | Campaign to run |
| `percentage_purchased` | integer | 1-40% of network |
| `price_cents` | integer | Calculated cost |
| `status` | text | pending, confirmed, canceled, completed |
| `created_at` | timestamptz | |

### ad_requests
Tracks SDK requests for metrics and serving.

| Field | Type | Description |
|-------|------|-------------|
| `request_id` | uuid | Primary key |
| `app_id` | uuid | Publisher app |
| `campaign_id` | uuid | Campaign served (null if no fill) |
| `device_id_hash` | text | Hashed device ID for unique user counts |
| `sdk_version` | text | SDK version |
| `os_version` | text | iOS version |
| `locale` | text | Device locale |
| `response_type` | text | ad, no_fill, error |
| `clicked` | boolean | Was the ad clicked? |
| `clicked_at` | timestamptz | When clicked |
| `created_at` | timestamptz | Request time |

## Relationships

```
User (auth.users)
  └── apps (many)
        ├── app_tokens (many) - for publishing
        ├── campaigns (many) - for advertising
        │     └── slot_purchases (many)
        │           └── weekly_slots
        └── ad_requests (many) - incoming SDK requests
```

## Key Constraints

- **40% cap**: No single advertiser can buy more than 40% of a week
- **Prepaid**: Slot purchases are paid upfront, no budget tracking needed
- **One network**: All apps participate in one shared network (v1 simplicity)

## Privacy

- Device IDs are hashed before storage
- No user identifiers stored
- Coarse metadata only (OS version, locale)

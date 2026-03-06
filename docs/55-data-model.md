# Data Model

Guild Ads now has three main data domains: app identity, weekly delivery, and billing/payout accounting.

## Core app and delivery tables

### `apps`
Registered iOS apps. An app can act as a publisher, an advertiser, or both.

Key fields:
- `app_id`, `user_id`
- `name`, `bundle_identifier`
- `app_store_id`, `subtitle`, `icon_url`, `app_store_url`
- `platform`, `status`

### `app_tokens`
Publisher SDK credentials per app.

Key fields:
- `token_id`, `app_id`, `user_id`
- `token_hash`, `name`
- `last_used_at`, `revoked_at`

### `campaigns`
Ad campaigns promoting an app.

Key fields:
- `campaign_id`, `user_id`, `app_id`
- `name`, `headline`, `body`, `cta_text`, `destination_url`, `icon_url`
- `status`

### `weekly_slots`
One row per bookable network week.

Key fields:
- `slot_id`, `week_start`
- `base_price_cents`
- `total_users_estimate`, `total_impressions_estimate`

### `slot_purchases`
Confirmed booked share for a week. This is the authoritative purchase record used for delivery, reporting, and payout math.

Key fields:
- `purchase_id`, `slot_id`, `user_id`, `campaign_id`
- `percentage_purchased`
- `price_cents` for total booked value
- `cash_paid_cents`, `credits_applied_cents`
- `status`
- `booking_intent_id`
- `payment_provider`, `payment_reference`
- `is_internal`, `refund_reference`, `refunded_at`

### `serve_attempts`
Every serve- or launch-time ad decision, including no-fill and error outcomes.

Key fields:
- `attempt_id`, `app_id`, `campaign_id`, `slot_purchase_id`
- `placement_id`, `endpoint`, `response_type`, `decision_reason`
- `device_id_hash`
- `sdk_version`, `os_version`, `locale`

### `ad_requests`
Impression-time tracking after an ad is actually shown.

Key fields:
- `request_id`, `app_id`, `campaign_id`
- `placement_id`, `response_type`
- `device_id_hash`
- `clicked`, `clicked_at`
- `sdk_version`, `os_version`, `locale`

### `unique_ad_views`
Sticky-assignment and publisher payout basis, keyed by user, app, placement, and week.

Key fields:
- `view_id`, `publisher_app_id`, `campaign_id`, `slot_purchase_id`
- `device_id_hash`, `placement_id`, `week_start`
- `view_count`, `clicked`, `clicked_at`
- `first_seen_at`, `last_seen_at`

## Billing and credits

### `billing_booking_intents`
Pre-confirmation booking state for checkout, credits, and reconciliation.

Key fields:
- `booking_intent_id`, `user_id`, `campaign_id`, `slot_id`
- `percentage_purchased`
- `quoted_price_cents`, `credits_applied_cents`, `cash_due_cents`, `currency`
- `status`, `failure_reason`
- `is_internal`
- Stripe refs: `stripe_customer_id`, `stripe_checkout_session_id`, `stripe_payment_intent_id`, `stripe_charge_id`, `stripe_refund_id`
- `confirmed_purchase_id`, `confirmed_at`

### `credit_ledger_entries`
User-level credit ledger.

Key fields:
- `entry_id`, `user_id`, `amount_cents`, `entry_type`
- `source_table`, `source_id`
- `expires_at`, `metadata`
- `created_by`, `created_at`

### `credit_holds`
Temporary holds against user credits while a booking intent is in flight.

Key fields:
- `hold_id`, `user_id`, `booking_intent_id`
- `amount_cents`, `status`, `released_reason`

### `billing_webhook_events`
Webhook idempotency and error tracking for Stripe events.

### `billing_customers`
Maps Guild Ads users to Stripe customer IDs.

## Publisher payouts

### `publisher_connect_accounts`
Stripe Connect state per publisher user.

Key fields:
- `user_id`, `stripe_account_id`
- `details_submitted`, `charges_enabled`, `payouts_enabled`
- `onboarding_completed_at`

### `publisher_weekly_earnings`
Publisher cash earnings and bonus-credit accounting per app per week.

Key fields:
- `earning_id`, `week_start`, `publisher_app_id`, `user_id`
- `unique_users`, `network_unique_users`, `share_ratio`
- `cash_spend_cents`, `platform_reserve_cents`, `pool_cents`
- `gross_earnings_cents`, `converted_cents`
- `bonus_credit_cents`, `bonus_credit_entry_id`, `bonus_credited_at`
- `hold_until`, `payout_status`, `payout_item_id`, `paid_at`

### `payout_batches`
One batch row per monthly payout run.

### `payout_items`
One payout decision/transfer row per user inside a batch.

## Internal controls

### `internal_account_policies`
Per-user operational overrides.

Key fields:
- `user_id`, `active`
- `can_bypass_checkout`
- `no_fill_exempt`
- `can_manage_internal`
- `notes`, `updated_by`

## Relationship sketch

```text
auth.users
  ├── apps
  │     ├── app_tokens
  │     ├── campaigns
  │     │     └── slot_purchases
  │     │           └── weekly_slots
  │     ├── serve_attempts
  │     ├── ad_requests
  │     └── unique_ad_views
  ├── billing_booking_intents
  │     └── credit_holds
  ├── credit_ledger_entries
  ├── publisher_connect_accounts
  ├── publisher_weekly_earnings
  │     └── payout_items
  └── internal_account_policies
```

## Notes

- Publisher payouts are funded from cash advertiser spend only.
- Credits are user-level buying power and are accounted for separately from cash.
- `serve_attempts` measures request-time delivery decisions; `ad_requests` measures shown impressions.
- `unique_ad_views` is the sticky-assignment and payout-basis table, not a raw impression log.

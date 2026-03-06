# Table guide

This is the plain-English version of the database.

If you want column-level detail, read [55-data-model.md](./55-data-model.md). If you want the fast answer to "where does this kind of data live?", start here.

## Apps and campaigns

### `apps`
One row per app in the network.

Use it for:
- the app's name, bundle ID, App Store metadata, and owner
- deciding whether an app is acting as a publisher, an advertiser, or both

### `app_tokens`
SDK tokens for publisher apps.

Use it for:
- checking which tokens belong to an app
- revoking a token
- seeing when a token was last used

### `campaigns`
Ad campaigns owned by a user.

Use it for:
- the ad copy and destination URL
- which app is being advertised
- whether a campaign is scheduled, active, paused, or finished

## Weekly inventory and purchases

### `weekly_slots`
One row per network week.

Use it for:
- the week's base network price
- the week start date
- rough placeholder estimates shown in booking flows

### `slot_purchases`
The real purchase record for booked network share.

Use it for:
- who bought what percentage for a given week
- total booked value
- cash paid vs credits applied
- refunds and internal purchases

If you need the money answer, this table usually matters more than `billing_booking_intents`.

### `billing_booking_intents`
The pre-purchase record used while a booking is being created and paid for.

Use it for:
- quoted price before confirmation
- checkout state
- Stripe references
- failed or expired purchase attempts

If a booking never finished, it will exist here without becoming a confirmed `slot_purchases` row.

## Ad delivery

### `serve_attempts`
Every serve decision the backend makes for a publisher app.

Use it for:
- filled serves
- no-fill responses
- serve errors
- launch-time prefetch attempts
- debugging why an ad was or was not returned

This is the request-time log.

### `ad_requests`
The impression and click event log.

Use it for:
- counting impressions
- counting clicks
- counting viewed users

Despite the name, this is not the full serve-request log anymore. It is closer to an impression table.

### `unique_ad_views`
The weekly sticky-assignment table.

Use it for:
- which advertiser a given user was assigned for a given app and placement that week
- weekly unique user counts by publisher app
- publisher payout math
- sticky ad behavior across repeated views

This is not the raw impression table. It is the deduped weekly "who was assigned what" table.

## Billing and credits

### `billing_customers`
Maps a Guild Ads user to a Stripe customer.

Use it for:
- finding or reusing the user's Stripe customer ID

### `billing_webhook_events`
Stored Stripe webhook events.

Use it for:
- idempotency
- replay/debugging
- seeing whether webhook processing failed

### `credit_ledger_entries`
The credit ledger for a user.

Use it for:
- promo grants
- publisher bonus credits
- booking credit spend
- payout-to-credit conversions
- manual adjustments

If you want a user's current credit balance, this is the source ledger behind it.

### `credit_holds`
Temporary holds on credits during checkout or booking confirmation.

Use it for:
- reserving credits before a booking is finalized
- releasing held credits if a booking fails
- capturing held credits once a booking confirms

## Publisher payouts

### `publisher_connect_accounts`
Stripe Connect state for a publisher user.

Use it for:
- whether onboarding is complete
- whether payouts are enabled
- the connected Stripe account ID

### `publisher_weekly_earnings`
Weekly publisher earnings per app.

Use it for:
- cash-funded publisher earnings
- publisher share of the network for that week
- payout hold timing
- payout status
- bonus credits granted from publishing
- how much was converted to credits instead of cash payout

If you need to know what a publisher earned for a week, this is the table.

### `payout_batches`
One row per payout run.

Use it for:
- monthly payout job status
- total amount and item count for the batch
- whether the batch completed or failed

### `payout_items`
One payout outcome per user inside a batch.

Use it for:
- who was paid
- how much was paid
- which Stripe transfer was created
- which payouts were skipped or failed

## Internal controls

### `internal_account_policies`
Manual per-user overrides for internal/admin operations.

Use it for:
- bypassing checkout for test/internal users
- allowing internal account management
- no-fill exemptions for testing

This is an operational table, not a customer-facing product table.

## Quick lookup

- "What did someone try to book?" -> `billing_booking_intents`
- "What actually got booked?" -> `slot_purchases`
- "Why did serve return no ad?" -> `serve_attempts`
- "How many impressions and clicks did we log?" -> `ad_requests`
- "Which ad was a user assigned this week?" -> `unique_ad_views`
- "How much credit does this user have?" -> `credit_ledger_entries`
- "How much did this publisher earn?" -> `publisher_weekly_earnings`
- "Did this publisher get paid yet?" -> `payout_items`

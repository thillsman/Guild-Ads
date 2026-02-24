# Stripe-Direct Billing and Payout Plan (Go-Live)

## Scope
- Stripe is the only billing provider for launch.
- Booking is prepaid and confirmed only after successful payment signal handling.
- Payouts run through Stripe Connect Express.
- Credits are enabled for booking spend and cash-to-credit conversion.

## Core Rules
1. Next-week bookings only are purchasable.
2. Charge first, then reserve inventory atomically.
3. If paid but sold out at confirmation time, issue immediate full refund.
4. Final sale after confirmed booking (except operational failures and oversell conflicts).
5. Internal/special account behavior is policy-driven by explicit `user_id` rows.

## Data Model
The implementation adds:
- `billing_booking_intents`
- `billing_webhook_events`
- `billing_customers`
- `credit_ledger_entries`
- `credit_holds`
- `publisher_connect_accounts`
- `publisher_weekly_earnings`
- `payout_batches`
- `payout_items`
- `internal_account_policies`

And extends `slot_purchases` with:
- `booking_intent_id`
- `payment_provider`
- `payment_reference`
- `is_internal`
- `refund_reference`
- `refunded_at`

## Booking Flow
1. Client creates booking intent.
2. Server validates slot + campaign ownership + next-week constraint + cap rules.
3. Server calculates quote from `weekly_slots.base_price_cents`.
4. Credits can be held and applied first.
5. If `cash_due_cents == 0`, intent is confirmed immediately via SQL atomic confirmation.
6. If `cash_due_cents > 0`, server creates Stripe Checkout session with dynamic `price_data`.
7. Stripe webhook updates intent and triggers atomic confirmation.
8. On success, credit hold is captured.
9. On capacity conflict after payment, payment is refunded and hold released.

## Credits
- Ledger is the source of truth.
- Promo credits can expire.
- Earned/converted credits do not expire.
- Conversion endpoint debits payable cash allocation and grants credits with 10% bonus.
- No credit-to-cash reverse conversion.

## Payout Accounting
1. Weekly accrual computes net publisher allocations from closed weeks.
2. Publisher pool = 70% of confirmed, non-internal, non-refunded booking revenue.
3. Allocation uses app-level unique-user share from `unique_ad_views`.
4. Earnings hold window: 30 days.
5. Monthly payout runner marks held rows eligible, applies threshold, and creates Stripe transfers.
6. Rows below minimum carry forward.

## Internal Account Controls
- `internal_account_policies` controls:
  - checkout bypass
  - no-fill exemption
  - internal admin permissions
- Internal admin APIs support:
  - policy upsert
  - promo credit grants

## API Surface
- `POST /api/billing/booking-intents`
- `GET /api/billing/booking-intents/:id`
- `POST /api/billing/booking-intents/:id/checkout`
- `POST /api/billing/webhooks/stripe`
- `POST /api/billing/credits/convert`
- `POST /api/billing/publisher/connect/onboard`
- `GET /api/billing/publisher/connect/status`
- `POST /api/billing/payouts/run-monthly`
- `POST /api/billing/reconciliation/run-daily`
- `POST /api/billing/internal/policies`
- `POST /api/billing/internal/grants`

## Operational Requirements
- Configure:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `APP_BASE_URL`
  - `BILLING_CRON_SECRET`
- Cron jobs call:
  - monthly payout runner
  - daily reconciliation
- Webhooks must hit `/api/billing/webhooks/stripe`.

## Notes
- Stripe fees/taxes are intentionally tracked separately from payout pool logic in v1.
- RevenueCat is intentionally out of this launch path.


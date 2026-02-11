# Rate Card & Pricing

## v1: Posted pricing + scarcity

Pricing is a **public rate card** per bundle with limited slot inventory.

### Slot durations
- 7-day slot (weekly)
- 24-hour slot (daily)

### Example formula for daily slots
Daily price = (weekly price / 7) × 1.2  
(Convenience premium for short bookings)

## Dynamic repricing (predictable)

Every Monday, adjust the *next-available* slot price per bundle based on sell-through:

- 100% sold out last week → +10%
- 70–99% sold → +5%
- 30–69% sold → no change
- <30% sold → -10%

Guardrails:
- price floor and ceiling per bundle
- no more than one step per week
- keep a public changelog of bundle price updates

## Revenue share (publisher payouts)

Two viable v1 options:

### Option A: Simple revenue share
- 80% publisher / 20% network
- Monthly payouts (with minimum threshold)
- Lowest operational complexity

### Option B: Cash + credits (bootstrap demand)
- Publisher earns: 60% cash + 20% credits (convertible after 90 days)
- Network retains: 20%
- Credits create a closed-loop marketplace so publishers become advertisers quickly

## Minimum payout + refunds
- Set a minimum payout threshold (e.g., $25).
- Refund policy for advertiser if network fails to deliver eligibility (rare with time-based slots; keep it simple).

Related:
- `docs/30-pricing/credits.md`

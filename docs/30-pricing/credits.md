# Credits System

## Purpose

Guild Ads credits exist to increase advertiser buying power inside the network without pretending that credits are cash revenue.

Credits support:

- publisher reinvestment
- launch incentives
- internal/admin grants
- user-level flexibility across multiple owned apps

## Credit sources

### Publisher bonus credits

After a week is finalized, Guild Ads issues bonus credits equal to 10% of that week’s gross publisher earnings.

- source type: `publisher_bonus_credit`
- issued to the owning user
- not part of publisher cash payout
- currently non-expiring

### Cash conversion credits

Eligible publisher cash earnings can be converted to credits at a 1:1 rate.

- source type: `cash_conversion_credit`
- conversion is one-way
- no bonus multiplier
- converted amount is no longer payable as cash

### Promo/admin grants

Guild Ads may also issue credits manually or as product promotions.

- source type: `promo_grant`
- may be limited or expire depending on the grant

## Credit scope

Credits are user-level, not app-level.

That means:

- earnings from one publisher app can fund ads for another app owned by the same user
- a user can split credits across multiple advertiser apps
- credits are not transferable between users

## Credit spending

Credits are applied to bookings before cash checkout.

For any booking:

- `booked_value_cents` = total weekly share purchased
- `credits_applied_cents` = internal buying power used
- `cash_paid_cents` = actual collected cash

Publisher payouts are based on `cash_paid_cents`, not on `booked_value_cents`.

## Accounting rule

Credits affect:

- advertiser booked value
- advertiser bought share
- delivery weighting
- sold-share repricing inputs

Credits do not affect:

- publisher cash payout pool
- platform cash revenue recognition
- cash transfer amounts to publishers

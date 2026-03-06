# Rate Card & Pricing

## Weekly network pricing

Guild Ads sells one weekly network price for 100% of available weekly share.

- Booking horizon: next week only
- Max share per advertiser: 40%
- Initial public network price: $1,000/week

Advertiser booked value:

```
booked_value = weekly_network_price * (percentage_purchased / 100)
```

The booked value can be funded by:

- cash paid
- credits applied
- or a mix of both

## Delivery rule

If a week has at least one eligible advertiser, Guild Ads normalizes delivery across the sold share.

Example:

- App A buys 35%
- App B buys 35%
- 30% is unsold

Delivered share becomes roughly 50/50 between App A and App B for that week.

If a request has zero eligible advertisers, Guild Ads returns no-fill.

## Repricing schedule

When a week locks and begins, the newly bookable next week is repriced from that locked week’s sold share.

- `>= 90%` sold: `+10%`
- `>= 70%` sold: `+5%`
- `50-69%` sold: no change
- `30-49%` sold: `-5%`
- `< 30%` sold: `-10%`

## Publisher payout rule

Publisher cash payouts are based on actual cash advertiser spend only.

- Platform reserve: 30% of cash advertiser spend
- Publisher pool: 70% of cash advertiser spend
- Allocation basis: each publisher app’s share of weekly counted users

Credits increase advertiser buying power. They do not increase the publisher cash pool.

## Bonus credits

After a week is finalized, publishers receive bonus credits equal to 10% of that week’s gross publisher earnings.

- user-level credits
- non-transferable
- non-cash
- currently non-expiring

## Conversion

Eligible publisher cash earnings can be converted into credits at a 1:1 rate.

- one-way conversion
- no extra bonus on conversion
- converted amount is no longer payable as cash

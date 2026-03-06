# Weekly economics proposal

This document describes the weekly money model Guild Ads is implementing. It is the clearest single example of how booked value, cash spend, credits, payout pool math, and bonus credits interact.

## Rules

1. Each week has one network price. Example: $1,000 for 100% of the network.
2. Advertisers buy a percentage of that weekly price.
3. Unsold inventory does not create intentional no-fill if at least one eligible advertiser exists. Delivery is normalized across the sold share.
4. The platform always keeps 30% of confirmed cash spend.
5. Publishers split the remaining 70% based on their share of weekly counted users.
6. Credits can increase buying power, but credits do not increase the cash payout pool.
7. After a week is finalized, publishers receive a 10% bonus credit based on that week's gross publisher earnings.
8. Credits are user-level and can be applied across apps owned by the same user.
9. Self-serve publisher cash-to-credit conversion is 1:1 with no extra bonus.
10. Publisher cash earnings are held for 14 days after week close before payout eligibility.

## Week 1 example

The network price for the week is $1,000.

- App A buys 35% for $350.
- App B buys 35% for $350.
- 30% is unsold.

Under this proposal, the 30% unsold share is removed from the delivery calculation. App A and App B each receive 50% of delivered impressions for the week, because they each bought half of the sold inventory.

Confirmed cash spend is $700.

- Platform reserve: 30% of $700 = $210
- Publisher pool: 70% of $700 = $490

Publisher payouts are based on publisher reach for the week.

- App A shows 50% of weekly counted users, so App A earns $245.
- App B shows 40% of weekly counted users, so App B earns $196.
- App C shows 10% of weekly counted users, so App C earns $49.

App A and App B are also publishers in this example, so they qualify for the publisher bonus credit.

- App A gets 10% of $245 as credits = $24.50
- App B gets 10% of $196 as credits = $19.60

Because the week sold at least 70% of inventory, the next week's network price increases by 5%.

- Next week network price: $1,050

## Week 2 example

App A spends the same $350 out of pocket and applies the $24.50 credit bonus.

- Total buying power: $374.50
- Share of a $1,050 network: 35.67%

App B applies the $19.60 credit bonus and pays the remainder in cash.

- Cash spend: $330.40
- Credit spend: $19.60
- Total buying power: $350
- Share of a $1,050 network: 33.33%

For payout accounting, only cash spend counts toward the publisher pool.

- Total cash spend: $350 + $330.40 = $680.40
- Platform reserve: 30% of $680.40 = $204.12
- Publisher pool: 70% of $680.40 = $476.28

The credits change advertiser buying power. They do not create additional publisher cash payout.

## Operational notes

- The weekly price for the newly bookable week is set when the prior week locks and begins.
- Publisher bonus credits are issued when the closed week is finalized, so they can be used on future bookings immediately after finalization.
- Publisher cash payouts are separate from credits and keep their own hold and payout lifecycle.

## Consequences

- If a week is only partly sold, advertisers receive a larger share of delivered impressions than their raw purchased percentage.
- Publishers are still paid from real cash revenue, not from promo credits.
- The 10% bonus is a platform subsidy. It comes out of the platform's economics, not the publisher pool.
- If no eligible advertiser exists for a request, the system still needs a fallback policy. That can be true no-fill, self-promo, or house ads.

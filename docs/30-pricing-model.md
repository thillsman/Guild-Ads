# Guild Ads Pricing Model

Guild Ads uses a transparent, weekly slot-based pricing model designed to be fair for both advertisers and publishers.

## Core Principles

1. **Transparency First**: All pricing is public. Advertisers see exactly what the network costs and what they're paying for.

2. **Flat Weekly Rate**: The entire network has a single weekly price (starting at $1,000). Advertisers buy a percentage of that.

3. **Dynamic Adjustment**: Prices automatically adjust based on demand:
   - If a week sells out → price increases for the next week
   - If inventory goes unsold → price decreases for the next week

4. **Fair Access**: No single advertiser can buy more than 40% of the network in any given week.

## How It Works

### Weekly Slots

- Each week runs Sunday 00:00 UTC to Saturday 23:59 UTC
- Advertisers book spots for upcoming weeks
- Inventory is expressed as a percentage of total network impressions

### Pricing Calculation

```
Advertiser Cost = (Network Weekly Price) × (Percentage Purchased / 100)
```

Example:
- Network price: $1,000/week
- Advertiser buys: 10%
- Cost: $100

### Estimated Reach

Reach estimates are based on:
- Total active publisher apps in the network
- Historical impression and user data
- Current week's publisher participation

## Database Schema

### weekly_slots
Stores weekly pricing and availability:
- `week_start`: Sunday of the week (date)
- `base_price_cents`: Network price in cents ($1000 = 100000)
- `total_impressions_estimate`: Expected impressions for the week
- `total_users_estimate`: Expected unique users

### slot_purchases
Records advertiser bookings:
- `slot_id`: Reference to weekly_slots
- `user_id`: The advertiser
- `campaign_id`: The campaign to run
- `percentage_purchased`: 1-40% (capped)
- `price_cents`: Calculated cost
- `status`: pending, confirmed, canceled, completed

## Availability Rules

1. **100% Total**: The network has 100% inventory per week
2. **40% Per Advertiser**: No single advertiser can exceed 40%
3. **First Come, First Served**: Bookings are processed in order
4. **Confirmed Bookings**: Once confirmed, spots are reserved

## UI Components

### Network Pricing Banner (`NetworkPricingBanner`)
- Displayed on dashboard
- Shows: weekly price, available %, user reach
- Quick link to booking page

### Week Slot Booking (`WeekSlotBooking`)
- Interactive slider for selecting percentage
- Visual availability bar showing:
  - Others' purchases
  - Your selection
  - Remaining availability
- Real-time cost and reach calculation

### Booking Page (`/dashboard/book`)
- Full booking flow
- Campaign selection
- Pricing explanation

## API Endpoints

### GET /api/slots
Returns current week slot data:
```json
{
  "weekStart": "2024-01-14",
  "slotId": "uuid",
  "basePriceCents": 100000,
  "totalUsersEstimate": 10000,
  "purchasedPercentage": 25,
  "availablePercentage": 75,
  "purchases": [...]
}
```

## Price Adjustment Algorithm

After each week ends, we adjust the next week's price based on sell-through:

| Sell-Through | Adjustment | Rationale |
|--------------|------------|-----------|
| ≥ 90% | +10% | High demand, increase price |
| ≥ 70% | +5% | Good demand, slight increase |
| 50-69% | No change | Healthy equilibrium |
| 30-49% | -5% | Undersold, slight decrease |
| < 30% | -10% | Low demand, decrease price |

```
if (purchased_percentage >= 90):
    next_week_price = current_price * 1.10  # +10%
elif (purchased_percentage >= 70):
    next_week_price = current_price * 1.05  # +5%
elif (purchased_percentage < 30):
    next_week_price = current_price * 0.90  # -10%
elif (purchased_percentage < 50):
    next_week_price = current_price * 0.95  # -5%
else:
    next_week_price = current_price  # No change
```

This creates natural price discovery while maintaining stability.

## Future Week Pricing

For weeks beyond the next week:
- The exact price is unknown until the previous week's booking closes
- We show an **estimated range** of ±10% from the current week's price
- Example: If current price is $1,000, future weeks show $900 - $1,100 range
- This helps advertisers plan budgets while being transparent about potential changes

When booking a future week, users:
1. Select their desired percentage of the network
2. See the estimated cost range based on current pricing
3. Understand the final price will be set when the week becomes "next week"

## Initial Values

- Starting network price: $1,000/week
- Starting user estimate: 10,000 users
- Starting impression estimate: 100,000 impressions

These will be updated as real publisher metrics become available.

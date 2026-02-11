# Marketplace Model (v1)

## Shape: Time-based slots + bundles

We sell sponsorship inventory as **time-based slots**, typically through curated **bundles**.

### Why this model
- Simple to explain and buy
- Scarcity creates quality and protects UX
- Avoids auction complexity and “ad-tech vibes”

## Entities

- **Publisher**
  - owns one or more **Apps**
- **App**
  - contains one or more **Placements**
- **Placement**
  - defines where an ad can appear and its constraints (density, category)
- **Bundle**
  - curated group of placements/apps sold together (e.g., “Indie Utilities”)
- **Slot**
  - a purchasable time window in a bundle (24h, 7d)
- **Campaign**
  - advertiser + creative + bundle + slot window
- **Creative**
  - the sponsor card content and assets
- **Credits**
  - optional network currency to bootstrap demand

## Inventory and scarcity

Each placement declares:
- max impressions per user per time window (local, on-device)
- max shows per day (optional, local or server hint)
- eligibility rules (category/tags)

The network enforces:
- overall ad density guidelines
- bundle slot availability

## Category + tags

- Categories are **curated** and limited.
- Tags are publisher-supplied and optional.
- “Contextual targeting” means selecting bundles/placements by these signals only.

## Buying flow (advertiser)
1. Choose a bundle
2. Choose a slot window (24h / 7d)
3. Upload or select approved creative
4. Set destination and optional conversion configuration
5. Pay (or use credits) → campaign goes live at slot start

## Selling / earning flow (publisher)
1. Integrate SDK and add placement(s)
2. Configure placement category + constraints
3. Ads begin filling; publisher earns cash and/or credits
4. Publisher can spend credits to promote their own apps

Related:
- `docs/20-marketplace/bundles.md`
- `docs/30-pricing/rate-card.md`

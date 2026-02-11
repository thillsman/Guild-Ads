# Overview

## What we are building

## Service name

**Guild Ads** is the working name of the service and brand.


A privacy-friendly ad network for indie apps, starting with **iOS in‑app** ads, with Android possibly later.

The product is intentionally closer to **sponsorship** than traditional ad-tech:

- Ads are **Sponsor Cards**: static, tasteful, lightweight.
- Buying is **time-based slots** (24h / 7d), typically through **bundles**.
- Targeting is **contextual** (app + placement category, optional publisher-supplied tags).
- Measurement is **aggregate** (impressions + clicks), with optional aggregate conversions.

## The two-sided value proposition

### For Advertisers (indie devs with freemium apps)
- Pay to display sponsor cards in other apps to drive **upgrades**, trials, and awareness.
- Buy predictable, curated inventory: **bundles + category slots**, not creepy auctions.

### For Publishers (apps showing ads)
- Add **one tasteful placement** and earn revenue.
- Or earn credits to advertise their own apps in the same network.

## What "classy" means (non-negotiables)
- No animation, no audio, no popups, no interstitials, no modal takeovers.
- Lightweight payload: single JSON fetch, small image assets.
- Clear “Sponsored” labeling.
- Safe placement guidance to avoid harming UX.

## What "privacy-friendly" means (non-negotiables)
- No device identifiers.
- No third-party tracking scripts.
- No behavioral profiles, retargeting, lookalikes.
- Only aggregate reporting, with thresholds to reduce re-identification risk.

## First release (v1) goals
- iOS SDK: fetch + cache + render + event reporting
- Backend: ad serving + reporting + billing + creative validation
- Web dashboard: advertiser campaign purchase + publisher revenue/fill metrics
- Marketplace: 3–5 curated bundles, time-based weekly & daily slots, transparent repricing

See:
- `docs/10-product/ad-format.md`
- `docs/20-marketplace/marketplace-model.md`
- `docs/30-pricing/rate-card.md`
- `docs/40-sdk/ios/README.md`
- `docs/50-api/README.md`
- `docs/70-launch/launch-plan.md`

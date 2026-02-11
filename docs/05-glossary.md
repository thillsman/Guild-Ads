# Glossary

This glossary defines shared terms used across Guild Ads docs.

## Ad unit
The **Sponsor Card** format shown in apps (static image + short text + CTA + Sponsored label).

## Advertiser
A customer buying slots to show sponsor cards in publisher apps.

## App
A publisher’s iOS app registered in Guild Ads. Apps contain one or more placements.

## Asset
A file (e.g., PNG/WebP icon image) referenced by a creative.

## Bundle
A curated grouping of apps/placements sold together (e.g., “Indie Utilities”). Bundles keep buying simple and brand-safe.

## Campaign
An advertiser’s purchase of a slot in a bundle, linked to an approved creative and a scheduled time window.

## Category
A curated taxonomy value used for contextual eligibility (e.g., Productivity, Personal Finance). Categories should be limited and enforced.

## Click
A tap on a sponsor card that is logged and then redirected to the destination URL (or deep link/universal link flow).

## Click redirect
A Guild Ads endpoint (`/r/{ad_id}`) that logs the click and then redirects to the advertiser destination.

## Conversion (optional)
An advertiser-defined event (trial start, purchase, etc.) reported in **aggregate**. In v1, this is opt-in via redeem codes or ephemeral tokens.

## Creative
The combination of headline/body/CTA text + image asset(s) + destination config that renders as a Sponsor Card.

## Credits
Network currency used to bootstrap the marketplace. Publishers can earn credits by showing ads and spend them to advertise their own apps.

## Destination
Where a click leads. In v1: HTTPS URL (opened in `SFSafariViewController`), universal link, optional deep link.

## Eligibility
Rules determining whether a campaign can serve into a placement at a given moment (bundle inclusion, time window, category match, policy, etc.).

## Fill rate
Percent of eligible requests that receive an ad (vs. no-fill).

## Frequency cap
A limit on how often an ad (or any ad) is shown to a user. In Guild Ads v1 this is enforced **on-device** without identifiers.

## Impression
A logged event when a sponsor card is rendered.

## Inventory
The total eligible opportunities to show ads across placements over time.

## Nonce
A signed value returned with ad decisions to validate impression/click reporting and support de-duplication.

## Placement
A named location in an app where a Sponsor Card can appear (e.g., `settings_footer`). Placements have category, density controls, and policy constraints.

## Policy
Rules governing creatives, advertisers, categories, and placements. Includes moderation and enforcement mechanisms.

## Publisher
An app developer or company that integrates the SDK to show sponsor cards.

## Rate card
Public, posted pricing per bundle/slot type, updated predictably based on sell-through.

## Sell-through
Percent of available slot inventory that was purchased for a time period. Used to drive predictable repricing.

## Slot
A purchasable time window for serving ads (24h / 7d in v1).

## Sponsored label
Visible disclosure text (“Sponsored” / “Ad”) required on sponsor cards.

## Token (ephemeral conversion token)
A short-lived, non-identifying token minted on click redirects to support opt-in aggregate conversion reporting.

## eCPM (effective CPM)
A derived metric for publishers: earnings / impressions × 1000. (Useful internally and in dashboards, even if you don’t sell CPM.)

# Optional Conversions (Opt-in, Aggregate)

## Why optional
Most indie advertisers can get value from impressions + clicks + redeem codes without adding tracking risk.

When advertisers need conversion tracking, provide a privacy-preserving method.

## Approach A: Redeem codes
- Campaign includes a code (or in-app promo)
- Advertiser tracks redemptions internally
- Network can optionally display codes and link to landing pages

Pros: simplest, very privacy-friendly  
Cons: less automated attribution

## Approach B: Ephemeral token conversion ping
1. User taps ad → click redirect logs click and mints ephemeral token (valid ~24h)
2. Landing page or app signup flow calls:
   `POST /v1/conversions { token, event, value? }`
3. Network reports aggregate conversions with thresholds

Key rules:
- Token is not user-identifying
- Short TTL
- Thresholded reporting (no small-number breakdowns)

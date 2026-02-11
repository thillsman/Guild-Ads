# `POST /v1/serve` — Ad Decision

## Purpose
Return an eligible sponsor card for a given app placement, respecting:
- bundle purchases / slot windows
- contextual eligibility (category/tags)
- pacing and frequency caps (client side enforcement primarily)
- policy restrictions (publisher exclusions, advertiser restrictions)

## Request (suggested)
```json
{
  "app_id": "app_123",
  "placement_id": "settings_footer",
  "sdk_version": "1.0.0",
  "os": "ios",
  "os_major": 17,
  "locale": "en-US",
  "theme": "dark"
}
```

Notes:
- No device IDs.
- Keep signals coarse and optional.

## Response (suggested)
```json
{
  "ad_id": "ad_789",
  "creative": {
    "headline": "Upgrade your journaling",
    "body": "A calm, private diary app with powerful search.",
    "cta": "Try Pro",
    "image_url": "https://cdn.example.com/creative/ad_789.png",
    "sponsored_label": "Sponsored"
  },
  "destination": {
    "type": "url",
    "value": "https://example.com/?ref=network"
  },
  "reporting": {
    "impression_url": "https://api.example.com/v1/impression",
    "click_url": "https://api.example.com/r/ad_789?p=settings_footer&n=..."
  },
  "expiry": "2026-02-10T18:00:00Z",
  "nonce": "signed_nonce_here"
}
```

## Server selection logic (high-level)
1. Identify bundle(s) that include the placement
2. Filter campaigns active in the current time window
3. Apply policy filters (publisher exclusions, creative approval)
4. Choose a campaign:
   - simple rotation (round-robin / weighted) is enough in v1
5. Return creative + signed nonce for event validation

## Caching
- Response includes `expiry` to guide client caching.
- CDN serves images; API serves JSON.

## Failures
- No eligible ad → return 204 No Content
- Invalid placement → 404 or 400
- Rate limited → 429

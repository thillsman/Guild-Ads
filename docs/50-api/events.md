# Event Logging: Impressions & Clicks

## Goals
- Accurate enough for billing and reporting
- Resistant to basic spoofing and duplication
- Does not require user identifiers

## Impression (`POST /v1/impression`)
Triggered when sponsor card is rendered.

Suggested payload:
```json
{
  "ad_id": "ad_789",
  "app_id": "app_123",
  "placement_id": "settings_footer",
  "nonce": "signed_nonce_here",
  "ts": 1739212345
}
```

Server behaviors:
- Validate signature/HMAC
- Validate nonce (expiry + integrity)
- De-dupe within a short window (e.g., nonce-based or ad+placement+time bucket)
- Store raw events for a short retention window; aggregate long-term

## Click redirect (`GET /r/{ad_id}`)
- Records click
- Redirects to destination
- Can mint an ephemeral token for optional conversion measurement

Anti-abuse:
- rate limit by IP (coarse)
- detect click bursts

## Fraud posture (v1)
- Signed SDK requests
- De-dupe impressions
- Outlier detection by placement (CTR spikes)
- Manual review before large payouts

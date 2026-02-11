# Security & Abuse Prevention (v1)

## Threat model (practical)
- Impression/click spoofing to inflate payouts
- Click fraud bots
- Malicious creatives trying to trick users

## Controls (v1)
- Signed requests from SDK (HMAC)
- Nonce-based de-duplication
- Rate limiting for click redirects
- Basic anomaly detection by placement
- Manual review before high payouts

## Data minimization
- Keep logs coarse
- Short retention for raw events
- Auditability: store enough for disputes without tracking users

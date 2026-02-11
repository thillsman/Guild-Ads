# Caching, Pacing, and Frequency Caps (on-device)

## Why on-device
To avoid server-side user identifiers while still preventing spammy repetition.

## Defaults (suggested)
- Per placement: max 1 impression per user per 6 hours
- Per app: optional cap, e.g., max 3 sponsor impressions per user per day

## Storage
- Use local storage keyed by placement + time window
- Store only what is needed (timestamps, counts), not user identity

## Refresh strategy
- Cache the ad response (and image) with an expiry time.
- Only refetch when:
  - cache expired
  - app version changed (optional)
  - publisher triggers a refresh (rare)

## Offline behavior
- Show nothing (default)
- Optional: show a configured “house ad” if publisher opts in

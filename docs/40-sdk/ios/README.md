# iOS SDK (v1)

## Responsibilities
- Fetch eligible sponsor cards (JSON) from the network
- Cache responses and assets
- Render a default SponsorView (SwiftUI) and support headless mode
- Enforce frequency caps and pacing **on-device**
- Report impressions and clicks (signed requests)
- Provide safe fallbacks: show nothing (or optional house ad)

## Non-goals (v1)
- User-level targeting or identifiers
- Video/animated ads
- Complex mediation with other ad networks

## Integration surface

### Default UI
Provide a drop-in SwiftUI component:

```swift
SponsorView(placementId: "settings_footer", theme: .automatic)
```

### Headless mode
```swift
let ad = try await sponsorClient.fetchAd(placementId: "settings_footer")
// App renders its own UI
```

## Local controls (publisher)
- placement enabled/disabled
- local frequency cap
- optional “ad density” toggle (e.g., show only in settings)

## Caching + refresh
- Cache by placement
- Refresh schedule: e.g., every 6 hours or on app launch
- Offline: render nothing or a configured house card

## Event reporting
- Impression when rendered
- Click when tapped (or through redirect URL)

See:
- `docs/40-sdk/ios/ui-components.md`
- `docs/40-sdk/ios/caching-and-frequency.md`
- `docs/50-api/serve-endpoint.md`

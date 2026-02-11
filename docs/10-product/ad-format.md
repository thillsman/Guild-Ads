# Ad Format (v1): Sponsor Card

## Summary

The only ad unit in v1 is a **Sponsor Card**: a small, static card that looks good in both light/dark mode and does not distract from the app.

## Creative components

Required:
- Icon or small image (square)
- Headline
- Body
- CTA label
- Sponsored label ("Sponsored" / "Ad")

Optional:
- Brand name (if different from headline)
- Secondary label (e.g., “Indie app”)

## Suggested limits (tunable)
- Headline: ~40 characters max
- Body: ~90 characters max
- CTA: ~18 characters max
- Image size: <80 KB (PNG/WebP recommended), single static asset
- JSON payload: <4 KB

## Destination options
- HTTPS URL opened in `SFSafariViewController`
- Universal link
- Optional deep link (if the advertiser provides it and publisher allows it)

## Placement guidelines (classy defaults)

Recommended:
- Settings screen footer
- Paywall preface screen (“Support us via sponsors”)
- List footer
- Empty state
- Post-action confirmation screen (“Saved!”, “Uploaded”, etc.)

Avoid:
- Interstitials
- Anything that blocks core flows
- Modals that appear unexpectedly
- “Fake system alert” patterns

## Mandatory design rules
- No animation or video in v1
- No misleading UI (“Download” buttons, fake close buttons, alert lookalikes)
- Always show the sponsored label
- Respect system text sizing and accessibility

## Implementation notes
- Provide a default SwiftUI component with headless mode (custom UI).
- Support both light and dark assets or provide automatic tinting strategies.
- Ensure truncation looks good: ellipsis for body, avoid multi-line CTA.

Related:
- `docs/10-product/creative-policy.md`
- `docs/40-sdk/ios/ui-components.md`

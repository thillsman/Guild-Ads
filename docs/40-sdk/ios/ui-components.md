# iOS UI Components

## SponsorView (SwiftUI)
A default, tasteful card that:
- supports light/dark
- supports dynamic type
- truncates gracefully
- enforces the Sponsored label

### Layout guidance
- left: icon (square)
- right: text stack (headline + body)
- bottom/right: CTA button (or label-style CTA)
- clear sponsored label (small but visible)

## Custom rendering
SDK should support returning a model suitable for custom UI:
- headline
- body
- CTA
- icon/image URL
- destination info
- ad_id, expiry, reporting URLs

## Accessibility
- respects system font scaling
- sufficient contrast
- VoiceOver: announce “Sponsored” and brand name

## Theming
- `.automatic` (follows system)
- `.light` / `.dark` overrides if publisher wants

# Guild Ads (Privacy‑Friendly Sponsor Cards) — Project Docs

This folder contains product + engineering documentation for building:

- Marketing site
- Web dashboard for **Advertisers** and **Publishers**
- **iOS SDK** (v1), with Android later
- Backend API + ad serving

## How to use these docs

- Start with **`docs/00-overview.md`** to understand the product shape.
- Reference **`docs/05-glossary.md`** and **`docs/55-data-model.md`** for shared terminology and entities.
- Engineers building the system should follow:
  - **`docs/40-sdk/`** (client) + **`docs/50-api/`** (server)
- Product + business decisions are captured in:
  - **`docs/10-product/`**, **`docs/20-marketplace/`**, **`docs/30-pricing/`**
- Operations and launch execution are in:
  - **`docs/70-launch/`**, **`docs/80-ops/`**

## Guiding principles

- **Classy by default:** low density, no animation, no intrusive placements.
- **Privacy-first:** no behavioral profiling, no user IDs, no cross-app tracking.
- **Simple marketplace:** time-based slots, bundles, transparent rate card, predictable repricing rules.
- **Indie-friendly:** credits bootstrap demand; publishers can both earn and advertise.

---

> Notes for agents:
> - Prefer small, composable services.
> - Build for auditability: clear logs, reproducible reporting, transparent policies.
> - Avoid creepiness: any feature that resembles user-level tracking is out of scope for v1.

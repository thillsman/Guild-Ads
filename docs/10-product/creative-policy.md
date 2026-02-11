# Creative Policy

## Goals
- Keep the network **high-trust** and **classy**.
- Reduce moderation workload by having clear, enforceable rules.

## Disallowed creative
- Animation, video, audio (v1)
- Deceptive UI (fake system dialogs, fake close buttons, “Your phone is infected” style claims)
- Excessive urgency (“ACT NOW OR LOSE ACCESS”) unless obviously benign and accurate
- Misleading claims, health misinformation, gambling, adult content
- Any content that violates platform rules or applicable laws

## Category scope (initial)
Allowed (examples):
- Indie apps, subscriptions, utilities, productivity, finance tools, education, dev tools, creator tools
- Privacy & security products (non-fearmongering)
- Newsletters, podcasts (if tasteful and honest)

Discouraged / review carefully:
- Crypto exchanges, high-risk financial products
- “Make money fast” claims
- Political advocacy (network choice; many networks avoid this for brand safety)

## Format rules
- Static image only
- Size limits enforced
- Clear “Sponsored” labeling
- Accessibility: adequate contrast, readable type

## Review + enforcement
- New advertisers and new creatives require manual approval in early phases.
- Provide an automated “ad lint” checker:
  - file type, size, dimensions
  - contrast heuristics
  - text length validation
- Fast kill switch:
  - remove ad immediately from serve layer
  - mark creative as rejected and notify advertiser

## Appeals
- Lightweight appeals flow to correct misunderstandings.
- Repeat offenders may be removed from the network.

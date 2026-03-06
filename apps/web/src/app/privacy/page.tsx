import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PublicPageShell } from '@/components/marketing/public-page-shell'

const sections = [
  {
    title: 'Privacy posture',
    body: 'Guild Ads is designed to avoid cross-app tracking. The network measures publisher reach within each app rather than trying to build a network-wide profile of the same person across unrelated apps.',
  },
  {
    title: 'Publisher-side identifiers',
    body: 'Publisher apps send a device-scoped identifier that is hashed before storage. Guild Ads uses that hash to support weekly sticky assignments, per-app distinct user counts, and click/impression reporting inside the publisher app where the request happened.',
  },
  {
    title: 'What Guild Ads counts',
    body: 'Guild Ads stores serve attempts, impressions, clicks, and weekly unique-user assignments tied to the publisher app and placement. Those counts support delivery, reporting, fraud review, and publisher payout calculations.',
  },
  {
    title: 'What Guild Ads does not do',
    body: 'Guild Ads does not attempt cross-publisher identity matching, does not build behavioral profiles across unrelated apps, and does not sell user-level audience segments to advertisers.',
  },
  {
    title: 'Account and billing data',
    body: 'Guild Ads stores account, booking, payout, credit-ledger, and payment-provider references needed to operate the service. Payment card details are handled by Stripe rather than stored directly by Guild Ads.',
  },
  {
    title: 'Retention and operational use',
    body: 'Guild Ads keeps raw delivery and accounting rows long enough to support reporting, reconciliation, dispute handling, payout review, fraud analysis, and product operations. Retention periods may change as the system evolves.',
  },
  {
    title: 'Publisher responsibility',
    body: 'Publishers are responsible for disclosing their use of Guild Ads inside their own app privacy materials where required by platform rules or local law.',
  },
]

export default function PrivacyPage() {
  return (
    <PublicPageShell
      eyebrow="Privacy"
      title="Guild Ads Privacy Policy"
      description="How Guild Ads handles delivery, reach measurement, billing, and publisher payout data."
    >
      <div className="grid gap-4">
        {sections.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle className="text-xl">{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-muted-foreground">
              {section.body}
            </CardContent>
          </Card>
        ))}
      </div>
    </PublicPageShell>
  )
}

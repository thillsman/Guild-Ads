import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PublicPageShell } from '@/components/marketing/public-page-shell'

const sections = [
  {
    title: 'Draft status',
    body: 'These Terms of Service describe the current product rules for Guild Ads as of March 2026. They are intended to be production-oriented product terms, but they should still receive legal review before broad public rollout.',
  },
  {
    title: 'Weekly booking model',
    body: 'Guild Ads sells weekly network share. Each week has a posted network price, and advertisers book a percentage of that week. Booking is currently limited to the next upcoming week. No advertiser may exceed the posted per-week purchase cap.',
  },
  {
    title: 'Booked share and delivered share',
    body: 'Booked share is the percentage of weekly network share a campaign purchases. Delivered share may be higher than booked share when a week is undersold, because Guild Ads normalizes delivery across the sold share. Guild Ads does not guarantee that any week will sell out.',
  },
  {
    title: 'No-fill behavior',
    body: 'If a request has at least one eligible advertiser, Guild Ads serves from the eligible set weighted by purchased share. If a request has no eligible advertiser for that publisher request, Guild Ads may return no-fill.',
  },
  {
    title: 'Cash, credits, and buying power',
    body: 'Credits are internal, user-level, non-transferable buying power within Guild Ads. Credits are not cash, are not redeemable for cash, and may be applied across apps owned by the same user. Credits can increase booked value and bought share, but they do not increase the publisher cash payout pool.',
  },
  {
    title: 'Publisher payouts',
    body: 'Guild Ads reserves 30% of cash advertiser spend for the platform and allocates the remaining 70% to publishers. Publisher earnings are calculated from each publisher app’s share of counted users for the finalized week. Guild Ads does not pay publisher cash earnings from promo credits or other non-cash sources.',
  },
  {
    title: 'Publisher bonus credits',
    body: 'After a week is finalized, Guild Ads may issue bonus credits equal to 10% of a publisher’s gross weekly earnings. Bonus credits are platform-funded promotional value, not cash earnings.',
  },
  {
    title: 'Conversion to credits',
    body: 'Eligible publisher cash earnings may be converted to credits at a 1:1 rate. Conversion is one-way. Once an amount is converted, it is no longer payable as cash.',
  },
  {
    title: 'Hold period and payout timing',
    body: 'Publisher cash earnings are subject to a 14-day post-week-close hold for reconciliation, refund, and chargeback risk. Guild Ads may delay, reverse, offset, or deny payout in cases involving refunds, payment disputes, invalid traffic, fraud, abuse, or compliance concerns.',
  },
  {
    title: 'Price updates',
    body: 'Guild Ads reprices the newly bookable week based on the sold share of the week that just locked. The current repricing schedule is +10% at 90%+, +5% at 70%+, flat at 50-69%, -5% at 30-49%, and -10% below 30%. Guild Ads may update these rules with notice in product or on the site.',
  },
  {
    title: 'No guarantees',
    body: 'Guild Ads does not guarantee sell-through, impressions, clicks, installs, revenue, ranking improvements, or conversion outcomes. Availability, delivery, and user reach depend on publisher participation, advertiser demand, app eligibility, and platform conditions.',
  },
]

export default function TermsPage() {
  return (
    <PublicPageShell
      eyebrow="Terms"
      title="Guild Ads Terms of Service"
      description="Product policy terms for weekly booking, delivery, credits, publisher payouts, and platform rules."
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

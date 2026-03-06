import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PublicPageShell } from '@/components/marketing/public-page-shell'

const FAQS = [
  {
    question: 'How does weekly delivery work for advertisers?',
    answer: 'Advertisers book a percentage of the network for a week. If the week is undersold, Guild Ads normalizes delivery across the sold share, so a booked share is a floor rather than a ceiling. If there are no eligible advertisers for a request, the SDK returns no-fill.',
  },
  {
    question: 'Can delivered share be higher than booked share?',
    answer: 'Yes. Example: if two advertisers each buy 35% and the remaining 30% is unsold, those two advertisers split the sold share and each receive about 50% of delivered inventory for that week.',
  },
  {
    question: 'What funds publisher payouts?',
    answer: 'Publisher cash payouts come only from actual advertiser cash spend. Credits increase advertiser buying power, but they do not increase the publisher cash pool.',
  },
  {
    question: 'How are publishers paid?',
    answer: 'Each finalized week reserves 30% of cash advertiser spend for the platform and distributes the remaining 70% to publishers. Each publisher app earns its share of that pool based on its share of counted users for the week.',
  },
  {
    question: 'What are counted users?',
    answer: 'Guild Ads counts distinct users within each publisher app for the week. The system does not try to deduplicate the same person across different publishers, which avoids cross-app tracking.',
  },
  {
    question: 'How do credits work?',
    answer: 'Credits are user-level, non-transferable buying power inside Guild Ads. A user can earn bonus credits from publisher performance or receive promo grants, then apply those credits across any apps they own.',
  },
  {
    question: 'Do publisher bonus credits expire?',
    answer: 'No. Bonus credits issued from finalized publisher earnings do not expire under the current product rules.',
  },
  {
    question: 'What is the 10% publisher bonus?',
    answer: 'After a week closes and earnings are finalized, Guild Ads issues bonus credits equal to 10% of that week’s gross publisher earnings. Those credits can be used on future ad bookings.',
  },
  {
    question: 'Can I convert publisher earnings into credits myself?',
    answer: 'Yes. Eligible publisher cash earnings can be converted to credits at a 1:1 rate. That is a one-way conversion. Once converted, they are credits, not cash.',
  },
  {
    question: 'Why is there a payout hold?',
    answer: 'Guild Ads holds publisher cash payouts for 14 days after the close of a week to cover reconciliation, refunds, and chargeback risk. In practice, that means newly accrued weekly earnings become payable 21 days after the week started.',
  },
  {
    question: 'When is the next week’s price set?',
    answer: 'Booking is next-week-only. When a week locks and begins, its sold share determines the price of the newly bookable following week using the posted repricing rules.',
  },
  {
    question: 'How does weekly repricing work?',
    answer: 'If a locked week sold at least 90%, the next week’s price increases 10%. At least 70% sold increases 5%. A 50-69% week stays flat. A 30-49% week decreases 5%. Below 30% decreases 10%.',
  },
]

export default function FAQPage() {
  return (
    <PublicPageShell
      eyebrow="FAQ"
      title="Guild Ads economics and policy FAQ"
      description="Straight answers about booking, delivery, payouts, credits, and weekly repricing."
    >
      <div className="grid gap-4">
        {FAQS.map((faq) => (
          <Card key={faq.question}>
            <CardHeader>
              <CardTitle className="text-xl">{faq.question}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-muted-foreground">
              {faq.answer}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Need the formal policy version?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            See the <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link> for the product-policy version of these rules and the <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link> for data handling details.
          </p>
        </CardContent>
      </Card>
    </PublicPageShell>
  )
}

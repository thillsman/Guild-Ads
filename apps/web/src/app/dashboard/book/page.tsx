import { createAdminClient, getAuthUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Info } from '@phosphor-icons/react/dist/ssr'
import { NextWeekBooking } from '@/components/booking/next-week-booking'

interface BillingHistoryRow {
  booking_intent_id: string
  created_at: string
  status: string
  failure_reason: string | null
  percentage_purchased: number | string
  quoted_price_cents: number | string
  credits_applied_cents: number | string
  cash_due_cents: number | string
  stripe_refund_id: string | null
  campaigns: { name: string; app_id: string } | Array<{ name: string; app_id: string }> | null
  weekly_slots: { week_start: string } | Array<{ week_start: string }> | null
}

function toCount(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

function formatWeekRange(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00Z`)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 6)

  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}`
}

function formatIntentStatus(status: string): string {
  return status.replaceAll('_', ' ')
}

function intentStatusClass(status: string): string {
  if (status === 'confirmed') {
    return 'bg-green-500/10 text-green-600'
  }

  if (status === 'awaiting_payment' || status === 'processing') {
    return 'bg-blue-500/10 text-blue-600'
  }

  if (status === 'refunded_capacity_conflict') {
    return 'bg-amber-500/10 text-amber-700'
  }

  if (status === 'failed' || status === 'expired' || status === 'canceled') {
    return 'bg-destructive/10 text-destructive'
  }

  return 'bg-muted text-muted-foreground'
}

export default async function BookPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const supabase = createAdminClient()

  // Get user's apps and campaigns
  const { data: apps } = await supabase
    .from('apps')
    .select('app_id, name, icon_url, bundle_identifier')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('campaign_id, name, app_id, headline')
    .eq('user_id', user.id)
    .eq('status', 'scheduled')
    .order('created_at', { ascending: false })

  const { data: rawBillingHistory, error: billingHistoryError } = await (supabase as any)
    .from('billing_booking_intents')
    .select(`
      booking_intent_id,
      created_at,
      status,
      failure_reason,
      percentage_purchased,
      quoted_price_cents,
      credits_applied_cents,
      cash_due_cents,
      stripe_refund_id,
      campaigns (
        name,
        app_id
      ),
      weekly_slots (
        week_start
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30)

  if (billingHistoryError) {
    console.error('[dashboard] failed to fetch billing history', billingHistoryError)
  }

  const dedupedApps = (apps ?? []).filter((app, index, allApps) => {
    if (!app.bundle_identifier) return true
    return allApps.findIndex((candidate) => candidate.bundle_identifier === app.bundle_identifier) === index
  })

  const appByID = new Map((apps ?? []).map((app) => [app.app_id as string, app.name as string]))
  const billingHistory = ((rawBillingHistory ?? []) as BillingHistoryRow[])
    .map((row) => {
      const campaign = Array.isArray(row.campaigns) ? row.campaigns[0] : row.campaigns
      const slot = Array.isArray(row.weekly_slots) ? row.weekly_slots[0] : row.weekly_slots
      const appName = campaign?.app_id ? appByID.get(campaign.app_id) : null

      return {
        bookingIntentID: row.booking_intent_id,
        createdAt: row.created_at,
        status: row.status,
        failureReason: row.failure_reason,
        percentage: toCount(row.percentage_purchased),
        quotedPriceCents: toCount(row.quoted_price_cents),
        creditsAppliedCents: toCount(row.credits_applied_cents),
        cashDueCents: toCount(row.cash_due_cents),
        refundID: row.stripe_refund_id,
        campaignName: campaign?.name ?? 'Campaign',
        appName: appName ?? 'App',
        weekStart: slot?.week_start ?? null,
      }
    })

  const hasApps = dedupedApps.length > 0
  const hasCampaigns = campaigns && campaigns.length > 0

  return (
    <main className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Book Ad Spots</h1>
        <p className="text-muted-foreground">
          Reserve your share of the Guild network for next week
        </p>
      </div>

      <Card>
          <CardHeader>
            <CardTitle>Billing History</CardTitle>
            <CardDescription>
              Recent booking attempts and payment outcomes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {billingHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">Created</th>
                      <th className="py-2 pr-3 font-medium">Week</th>
                      <th className="py-2 pr-3 font-medium">App</th>
                      <th className="py-2 pr-3 font-medium">Campaign</th>
                      <th className="py-2 pr-3 font-medium">Share</th>
                      <th className="py-2 pr-3 font-medium">Quote</th>
                      <th className="py-2 pr-3 font-medium">Credits</th>
                      <th className="py-2 pr-3 font-medium">Cash</th>
                      <th className="py-2 pr-3 font-medium">Status</th>
                      <th className="py-2 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billingHistory.map((row) => (
                      <tr key={row.bookingIntentID} className="border-b last:border-0">
                        <td className="py-2 pr-3">{new Date(row.createdAt).toLocaleDateString()}</td>
                        <td className="py-2 pr-3">{row.weekStart ? formatWeekRange(row.weekStart) : '-'}</td>
                        <td className="py-2 pr-3">{row.appName}</td>
                        <td className="py-2 pr-3">{row.campaignName}</td>
                        <td className="py-2 pr-3">{row.percentage}%</td>
                        <td className="py-2 pr-3">${(row.quotedPriceCents / 100).toFixed(2)}</td>
                        <td className="py-2 pr-3">${(row.creditsAppliedCents / 100).toFixed(2)}</td>
                        <td className="py-2 pr-3">${(row.cashDueCents / 100).toFixed(2)}</td>
                        <td className="py-2 pr-3">
                          <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs ${intentStatusClass(row.status)}`}>
                            {formatIntentStatus(row.status)}
                          </span>
                        </td>
                        <td className="py-2">
                          {row.failureReason ?? (row.refundID ? `refund ${row.refundID}` : '-')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No booking or payment history yet.
              </p>
            )}
          </CardContent>
        </Card>

        {!hasApps ? (
          <Card>
            <CardContent className="py-12 text-center">
              <h3 className="text-lg font-semibold mb-2">Add an app first</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                You need to add an app before you can book ad spots.
              </p>
              <Button asChild>
                <Link href="/dashboard/apps/new">Add Your App</Link>
              </Button>
            </CardContent>
          </Card>
        ) : !hasCampaigns ? (
          <div className="space-y-6">
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Create a campaign first</p>
                    <p className="text-sm text-muted-foreground">
                      You'll need to create a campaign with your ad creative before booking spots.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <NextWeekBooking userId={user.id} appId={dedupedApps[0].app_id} />

            <Card>
              <CardHeader>
                <CardTitle>Your Apps</CardTitle>
                <CardDescription>Select an app to create a campaign</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {dedupedApps.map((app) => (
                    <Link
                      key={app.app_id}
                      href={`/dashboard/apps/${app.app_id}/advertise/new`}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      {app.icon_url ? (
                        <img src={app.icon_url} alt={app.name} className="w-10 h-10 rounded-lg" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-muted" />
                      )}
                      <span className="font-medium">{app.name}</span>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Select a Campaign</CardTitle>
                <CardDescription>Choose which campaign to book spots for</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {campaigns.map((campaign) => {
                    const app = apps?.find(a => a.app_id === campaign.app_id)
                    return (
                      <div
                        key={campaign.campaign_id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          {app?.icon_url ? (
                            <img src={app.icon_url} alt={app?.name} className="w-10 h-10 rounded-lg" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-muted" />
                          )}
                          <div>
                            <p className="font-medium">{campaign.name}</p>
                            <p className="text-sm text-muted-foreground">{campaign.headline}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <NextWeekBooking
              userId={user.id}
              appId={campaigns[0].app_id ?? undefined}
            />
          </div>
        )}

        {/* How it works */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>How Pricing Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Transparent & Fair:</strong> We set a flat weekly price for 100%
              of the network's ad inventory. You buy a percentage of that, paying proportionally.
            </p>
            <p>
              <strong className="text-foreground">Dynamic Pricing:</strong> Each week, if we sell out, the price
              increases slightly. If inventory goes unsold, the price decreases. This ensures fair market pricing.
            </p>
            <p>
              <strong className="text-foreground">40% Cap:</strong> No single advertiser can buy more than 40% of
              the network in a given week. This keeps the network diverse and fair for all publishers and advertisers.
            </p>
            <p>
              <strong className="text-foreground">Weekly Slots:</strong> Each week starts Sunday at midnight UTC.
              Book your spots before then to secure your share.
            </p>
          </CardContent>
        </Card>
    </main>
  )
}

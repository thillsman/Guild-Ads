import { createAdminClient, getAuthUser } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Plus, ChartLine, Eye, CalendarCheck } from '@phosphor-icons/react/dist/ssr'
import { NextWeekBooking } from '@/components/booking/next-week-booking'

interface Props {
  params: Promise<{ id: string }>
}

interface AdvertiserWeeklyMetricRow {
  week_start: string
  campaign_id: string
  campaign_name: string
  impressions: number | string
  unique_users: number | string
  clicks: number | string
}

interface CampaignMetric {
  weekStart: string
  impressions: number
  uniqueUsers: number
  clicks: number
}

const REPORTING_WEEKS = 12

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

export default async function AppAdvertisePage({ params }: Props) {
  const { id } = await params
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const supabase = createAdminClient()

  // Fetch app with campaigns
  const { data: app, error } = await supabase
    .from('apps')
    .select(`
      app_id,
      name,
      subtitle,
      bundle_identifier,
      icon_url,
      app_store_url
    `)
    .eq('app_id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !app) {
    notFound()
  }

  // Fetch campaigns for this app with their slot bookings
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select(`
      *,
      slot_purchases (
        percentage_purchased,
        price_cents,
        status,
        weekly_slots (
          week_start
        )
      )
    `)
    .eq('app_id', id)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const { data: rawWeeklyMetrics, error: weeklyMetricsError } = await supabase.rpc('get_advertiser_weekly_metrics', {
    p_user_id: user.id,
    p_app_id: id,
    p_weeks: REPORTING_WEEKS,
  })

  if (weeklyMetricsError) {
    console.error('[dashboard] failed to fetch advertiser weekly metrics', weeklyMetricsError)
  }

  const campaignMetrics = new Map<string, CampaignMetric[]>()
  for (const row of (rawWeeklyMetrics ?? []) as AdvertiserWeeklyMetricRow[]) {
    if (typeof row.campaign_id !== 'string' || typeof row.week_start !== 'string') {
      continue
    }

    const current = campaignMetrics.get(row.campaign_id) ?? []
    current.push({
      weekStart: row.week_start,
      impressions: toCount(row.impressions),
      uniqueUsers: toCount(row.unique_users),
      clicks: toCount(row.clicks),
    })
    campaignMetrics.set(row.campaign_id, current)
  }

  for (const rows of campaignMetrics.values()) {
    rows.sort((left, right) => right.weekStart.localeCompare(left.weekStart))
  }

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-start gap-4 mb-8">
          {app.icon_url ? (
            <img
              src={app.icon_url}
              alt={app.name}
              className="w-16 h-16 rounded-xl"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-muted" />
          )}
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{app.name}</h1>
            {app.subtitle && (
              <p className="text-muted-foreground">{app.subtitle}</p>
            )}
            <p className="text-sm text-muted-foreground mt-1">
              {app.bundle_identifier}
            </p>
          </div>
        </div>

        {/* Book Next Week */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Book Ad Spots</h2>
          <NextWeekBooking appId={id} userId={user.id} />
        </div>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Your Campaigns</h2>
          <Button asChild>
            <Link href={`/dashboard/apps/${id}/advertise/new`}>
              <Plus className="h-4 w-4 mr-2" />
              Create Campaign
            </Link>
          </Button>
        </div>

        {campaigns && campaigns.length > 0 ? (
          <div className="grid gap-4">
            {campaigns.map((campaign) => {
              const booking = campaign.slot_purchases?.[0]
              const weekStart = booking?.weekly_slots?.week_start
              const weekDate = weekStart ? new Date(weekStart + 'T00:00:00') : null
              const metrics = campaignMetrics.get(campaign.campaign_id) ?? []
              const totals = metrics.reduce((accumulator, metric) => {
                return {
                  impressions: accumulator.impressions + metric.impressions,
                  uniqueUsers: accumulator.uniqueUsers + metric.uniqueUsers,
                  clicks: accumulator.clicks + metric.clicks,
                }
              }, {
                impressions: 0,
                uniqueUsers: 0,
                clicks: 0,
              })
              const formatWeek = (date: Date) => {
                const end = new Date(date)
                end.setDate(end.getDate() + 6)
                return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
              }

              return (
                <Card key={campaign.campaign_id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{campaign.name}</CardTitle>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        campaign.status === 'active'
                          ? 'bg-green-500/10 text-green-600'
                          : campaign.status === 'scheduled'
                          ? 'bg-blue-500/10 text-blue-600'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {campaign.status}
                      </span>
                    </div>
                    {booking && (
                      <CardDescription className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <CalendarCheck className="h-4 w-4" />
                          {weekDate ? formatWeek(weekDate) : 'No week booked'}
                        </span>
                        <span>{booking.percentage_purchased}% of network</span>
                        <span>${(booking.price_cents / 100).toFixed(2)}</span>
                      </CardDescription>
                    )}
                    {!booking && (
                      <CardDescription>No week booked yet</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    {metrics.length > 0 ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <div className="rounded-lg bg-muted/40 p-3">
                            <p className="text-xs uppercase text-muted-foreground tracking-wide">Impressions</p>
                            <p className="mt-1 text-lg font-semibold">{totals.impressions.toLocaleString()}</p>
                          </div>
                          <div className="rounded-lg bg-muted/40 p-3">
                            <p className="text-xs uppercase text-muted-foreground tracking-wide">Unique Users</p>
                            <p className="mt-1 text-lg font-semibold">{totals.uniqueUsers.toLocaleString()}</p>
                          </div>
                          <div className="rounded-lg bg-muted/40 p-3">
                            <p className="text-xs uppercase text-muted-foreground tracking-wide">Clicks</p>
                            <p className="mt-1 text-lg font-semibold">{totals.clicks.toLocaleString()}</p>
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[480px] text-sm">
                            <thead>
                              <tr className="border-b text-left text-muted-foreground">
                                <th className="py-2 pr-3 font-medium">Week</th>
                                <th className="py-2 pr-3 font-medium">Impressions</th>
                                <th className="py-2 pr-3 font-medium">Unique Users</th>
                                <th className="py-2 font-medium">Clicks</th>
                              </tr>
                            </thead>
                            <tbody>
                              {metrics.map((metric) => (
                                <tr key={metric.weekStart} className="border-b last:border-0">
                                  <td className="py-2 pr-3 font-medium">{formatWeekRange(metric.weekStart)}</td>
                                  <td className="py-2 pr-3">{metric.impressions.toLocaleString()}</td>
                                  <td className="py-2 pr-3">{metric.uniqueUsers.toLocaleString()}</td>
                                  <td className="py-2">{metric.clicks.toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Eye className="h-4 w-4" />
                        <span>No impressions yet for this campaign.</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <ChartLine className="h-12 w-12 text-muted-foreground mx-auto mb-4" weight="duotone" />
              <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Create a campaign to start advertising your app to users of other indie apps.
              </p>
              <Button asChild>
                <Link href={`/dashboard/apps/${id}/advertise/new`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Campaign
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}

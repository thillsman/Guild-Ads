import { createAdminClient, getAuthUser } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChartLine, Eye, Plus } from '@phosphor-icons/react/dist/ssr'

interface Props {
  params: Promise<{ id: string }>
}

interface AdvertiserWeeklyMetricRow {
  week_start: string
  campaign_id: string
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

export default async function AppAdPerformancePage({ params }: Props) {
  const { id } = await params
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const supabase = createAdminClient()

  const { data: app, error } = await supabase
    .from('apps')
    .select('app_id, name, subtitle, bundle_identifier, icon_url')
    .eq('app_id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !app) {
    notFound()
  }

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('campaign_id, name, status')
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
    <main className="max-w-5xl">
      <div className="mb-8 flex items-start gap-4">
        {app.icon_url ? (
          <img
            src={app.icon_url}
            alt={app.name}
            className="h-16 w-16 rounded-xl"
          />
        ) : (
          <div className="h-16 w-16 rounded-xl bg-muted" />
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Ad Performance</h1>
          <p className="text-muted-foreground">{app.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">{app.bundle_identifier}</p>
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Weekly impressions, unique users, and clicks by campaign.
        </p>
        <Button asChild>
          <Link href={`/dashboard/apps/${id}/advertise/new`}>
            <Plus className="mr-2 h-4 w-4" />
            Create Campaign
          </Link>
        </Button>
      </div>

      {campaigns && campaigns.length > 0 ? (
        <div className="grid gap-4">
          {campaigns.map((campaign) => {
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

            return (
              <Card key={campaign.campaign_id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{campaign.name}</CardTitle>
                    <span className={`rounded-full px-2 py-1 text-xs ${
                      campaign.status === 'active'
                        ? 'bg-green-500/10 text-green-600'
                        : campaign.status === 'scheduled'
                        ? 'bg-blue-500/10 text-blue-600'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {campaign.status}
                    </span>
                  </div>
                  <CardDescription>
                    Last {REPORTING_WEEKS} weeks performance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {metrics.length > 0 ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="rounded-lg bg-muted/40 p-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Impressions</p>
                          <p className="mt-1 text-lg font-semibold">{totals.impressions.toLocaleString()}</p>
                        </div>
                        <div className="rounded-lg bg-muted/40 p-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Users</p>
                          <p className="mt-1 text-lg font-semibold">{totals.uniqueUsers.toLocaleString()}</p>
                        </div>
                        <div className="rounded-lg bg-muted/40 p-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Clicks</p>
                          <p className="mt-1 text-lg font-semibold">{totals.clicks.toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[480px] text-sm">
                          <thead>
                            <tr className="border-b text-left text-muted-foreground">
                              <th className="py-2 pr-3 font-medium">Week</th>
                              <th className="py-2 pr-3 font-medium">Impressions</th>
                              <th className="py-2 pr-3 font-medium">Users</th>
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
            <ChartLine className="mx-auto mb-4 h-12 w-12 text-muted-foreground" weight="duotone" />
            <h3 className="mb-2 text-lg font-semibold">No campaigns yet</h3>
            <p className="mx-auto mb-6 max-w-sm text-muted-foreground">
              Create a campaign to start collecting ad performance data.
            </p>
            <Button asChild>
              <Link href={`/dashboard/apps/${id}/advertise/new`}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Campaign
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </main>
  )
}

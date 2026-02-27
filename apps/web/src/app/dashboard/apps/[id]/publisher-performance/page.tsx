export const dynamic = 'force-dynamic'

import { createAdminClient, getAuthUser } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  params: Promise<{ id: string }>
}

interface PublisherWeeklyTotalsRow {
  week_start: string
  impressions: number | string
  unique_users: number | string
  clicks: number | string
}

interface PublisherPlacementMetricsRow {
  week_start: string
  placement_id: string
  impressions: number | string
  unique_users: number | string
  clicks: number | string
}

interface AppDataVolumeRow {
  ad_request_rows: number | string
  unique_ad_view_rows: number | string
  ad_request_rows_7d: number | string
  ad_request_rows_30d: number | string
  first_ad_request_at: string | null
  last_ad_request_at: string | null
}

interface DailyStorageMetricRow {
  day: string
  ad_request_rows: number | string
  impressions: number | string
  unique_users: number | string
  clicks: number | string
}

interface WeeklyTotals {
  weekStart: string
  impressions: number
  uniqueUsers: number
  clicks: number
}

interface PlacementMetric {
  weekStart: string
  placementID: string
  impressions: number
  uniqueUsers: number
  clicks: number
}

interface DailyStorageMetric {
  day: string
  adRequestRows: number
  impressions: number
  uniqueUsers: number
  clicks: number
}

const REPORTING_WEEKS = 12
const STORAGE_DAILY_WINDOW_DAYS = 14

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

export default async function AppPublisherPerformancePage({ params }: Props) {
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

  const { data: rawWeeklyTotals, error: weeklyTotalsError } = await supabase.rpc('get_publisher_weekly_totals', {
    p_user_id: user.id,
    p_app_id: id,
    p_weeks: REPORTING_WEEKS,
  })

  if (weeklyTotalsError) {
    console.error('[dashboard] failed to fetch publisher weekly totals', weeklyTotalsError)
  }

  const { data: rawPlacementMetrics, error: placementMetricsError } = await supabase.rpc('get_publisher_weekly_placement_metrics', {
    p_user_id: user.id,
    p_app_id: id,
    p_weeks: REPORTING_WEEKS,
  })

  if (placementMetricsError) {
    console.error('[dashboard] failed to fetch publisher placement metrics', placementMetricsError)
  }

  const { data: rawDataVolume, error: dataVolumeError } = await supabase.rpc('get_app_data_volume', {
    p_user_id: user.id,
    p_app_id: id,
  })

  if (dataVolumeError) {
    console.error('[dashboard] failed to fetch app data volume', dataVolumeError)
  }

  const { data: rawDailyStorage, error: dailyStorageError } = await supabase.rpc('get_app_daily_storage_metrics', {
    p_user_id: user.id,
    p_app_id: id,
    p_days: STORAGE_DAILY_WINDOW_DAYS,
  })

  if (dailyStorageError) {
    console.error('[dashboard] failed to fetch app daily storage metrics', dailyStorageError)
  }

  const weeklyTotals = ((rawWeeklyTotals ?? []) as PublisherWeeklyTotalsRow[])
    .filter((row): row is PublisherWeeklyTotalsRow => typeof row.week_start === 'string')
    .map((row): WeeklyTotals => ({
      weekStart: row.week_start,
      impressions: toCount(row.impressions),
      uniqueUsers: toCount(row.unique_users),
      clicks: toCount(row.clicks),
    }))
    .sort((left, right) => right.weekStart.localeCompare(left.weekStart))

  const placementMetrics = ((rawPlacementMetrics ?? []) as PublisherPlacementMetricsRow[])
    .filter((row): row is PublisherPlacementMetricsRow => (
      typeof row.week_start === 'string' &&
      typeof row.placement_id === 'string'
    ))
    .map((row): PlacementMetric => ({
      weekStart: row.week_start,
      placementID: row.placement_id.trim() || 'default',
      impressions: toCount(row.impressions),
      uniqueUsers: toCount(row.unique_users),
      clicks: toCount(row.clicks),
    }))
    .sort((left, right) => {
      const weekComparison = right.weekStart.localeCompare(left.weekStart)
      if (weekComparison !== 0) {
        return weekComparison
      }

      return left.placementID.localeCompare(right.placementID)
    })

  const dataVolume = (() => {
    const row = ((rawDataVolume ?? []) as AppDataVolumeRow[])[0]
    if (!row) {
      return null
    }

    return {
      adRequestRows: toCount(row.ad_request_rows),
      uniqueAdViewRows: toCount(row.unique_ad_view_rows),
      adRequestRows7d: toCount(row.ad_request_rows_7d),
      adRequestRows30d: toCount(row.ad_request_rows_30d),
      firstAdRequestAt: row.first_ad_request_at,
      lastAdRequestAt: row.last_ad_request_at,
    }
  })()

  const dailyStorageMetrics = ((rawDailyStorage ?? []) as DailyStorageMetricRow[])
    .filter((row): row is DailyStorageMetricRow => typeof row.day === 'string')
    .map((row): DailyStorageMetric => ({
      day: row.day,
      adRequestRows: toCount(row.ad_request_rows),
      impressions: toCount(row.impressions),
      uniqueUsers: toCount(row.unique_users),
      clicks: toCount(row.clicks),
    }))
    .sort((left, right) => right.day.localeCompare(left.day))

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
          <h1 className="text-2xl font-bold">Publisher Performance</h1>
          <p className="text-muted-foreground">{app.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">{app.bundle_identifier}</p>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Weekly Performance</CardTitle>
          <CardDescription>
            Impressions, unique users, and clicks by week for the last {REPORTING_WEEKS} weeks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-xs text-muted-foreground">
            Publisher payment is calculated from weekly unique-user share. Impressions and clicks are shown for delivery and engagement context.
          </p>
          {weeklyTotals.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Week</th>
                    <th className="py-2 pr-3 font-medium">Impressions</th>
                    <th className="py-2 pr-3 font-medium">Users</th>
                    <th className="py-2 font-medium">Clicks</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyTotals.map((metric) => (
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
          ) : (
            <p className="text-sm text-muted-foreground">No weekly ad metrics yet.</p>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Data Volume</CardTitle>
          <CardDescription>
            Request and tracking volume so you can monitor storage footprint
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dataVolume ? (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Logged Requests</p>
                  <p className="mt-1 text-lg font-semibold">{dataVolume.adRequestRows.toLocaleString()}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Tracked User-Weeks</p>
                  <p className="mt-1 text-lg font-semibold">{dataVolume.uniqueAdViewRows.toLocaleString()}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Requests (Last 7d)</p>
                  <p className="mt-1 text-lg font-semibold">{dataVolume.adRequestRows7d.toLocaleString()}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Requests (Last 30d)</p>
                  <p className="mt-1 text-lg font-semibold">{dataVolume.adRequestRows30d.toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-1 text-xs text-muted-foreground">
                <p>
                  Tracked User-Weeks = one user, one placement, one week (used for stable ad assignment).
                </p>
                <p>
                  First ad request:{' '}
                  {dataVolume.firstAdRequestAt
                    ? new Date(dataVolume.firstAdRequestAt).toLocaleString()
                    : 'n/a'}
                </p>
                <p>
                  Most recent ad request:{' '}
                  {dataVolume.lastAdRequestAt
                    ? new Date(dataVolume.lastAdRequestAt).toLocaleString()
                    : 'n/a'}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No data volume stats yet.</p>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Daily Growth</CardTitle>
          <CardDescription>
            Daily request and performance growth for the last {STORAGE_DAILY_WINDOW_DAYS} days
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dailyStorageMetrics.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[660px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Day</th>
                    <th className="py-2 pr-3 font-medium">Logged Requests</th>
                    <th className="py-2 pr-3 font-medium">Impressions</th>
                    <th className="py-2 pr-3 font-medium">Users</th>
                    <th className="py-2 font-medium">Clicks</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyStorageMetrics.map((metric) => (
                    <tr key={metric.day} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-medium">
                        {new Date(`${metric.day}T00:00:00Z`).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          timeZone: 'UTC',
                        })}
                      </td>
                      <td className="py-2 pr-3">{metric.adRequestRows.toLocaleString()}</td>
                      <td className="py-2 pr-3">{metric.impressions.toLocaleString()}</td>
                      <td className="py-2 pr-3">{metric.uniqueUsers.toLocaleString()}</td>
                      <td className="py-2">{metric.clicks.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No daily growth rows yet.</p>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Placement Breakdown</CardTitle>
          <CardDescription>
            Weekly metrics split by placement
          </CardDescription>
        </CardHeader>
        <CardContent>
          {placementMetrics.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Week</th>
                    <th className="py-2 pr-3 font-medium">Placement</th>
                    <th className="py-2 pr-3 font-medium">Impressions</th>
                    <th className="py-2 pr-3 font-medium">Users</th>
                    <th className="py-2 font-medium">Clicks</th>
                  </tr>
                </thead>
                <tbody>
                  {placementMetrics.map((metric) => (
                    <tr key={`${metric.weekStart}:${metric.placementID}`} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-medium">{formatWeekRange(metric.weekStart)}</td>
                      <td className="py-2 pr-3 font-mono text-xs">{metric.placementID}</td>
                      <td className="py-2 pr-3">{metric.impressions.toLocaleString()}</td>
                      <td className="py-2 pr-3">{metric.uniqueUsers.toLocaleString()}</td>
                      <td className="py-2">{metric.clicks.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No placement-level metrics yet.</p>
          )}
        </CardContent>
      </Card>
    </main>
  )
}

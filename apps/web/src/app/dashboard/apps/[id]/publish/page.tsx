export const dynamic = 'force-dynamic'

import { createAdminClient, getAuthUser } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Key, ChartLine, CheckCircle, XCircle } from '@phosphor-icons/react/dist/ssr'
import { CreateTokenButton } from './create-token-button'
import { ConnectOnboardingCard } from './connect-onboarding-card'
import { TokenList } from './token-list'

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

interface DailyStorageMetric {
  day: string
  adRequestRows: number
  impressions: number
  uniqueUsers: number
  clicks: number
}

interface PublisherWeeklyEarningsRow {
  week_start: string
  gross_earnings_cents: number | string
  converted_cents: number | string
  payout_status: string
  hold_until: string
  paid_at: string | null
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

export default async function AppPublishPage({ params }: Props) {
  const { id } = await params
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const supabase = createAdminClient()

  // Fetch app
  const { data: app, error } = await supabase
    .from('apps')
    .select(`
      app_id,
      name,
      subtitle,
      bundle_identifier,
      icon_url
    `)
    .eq('app_id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !app) {
    notFound()
  }

  // Fetch tokens for this app
  const { data: tokens } = await supabase
    .from('app_tokens')
    .select('token_id, name, created_at, last_used_at, revoked_at')
    .eq('app_id', id)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })

  // Fetch recent ad requests for this app
  const { data: recentRequests } = await supabase
    .from('ad_requests')
    .select('request_id, response_type, sdk_version, os_version, locale, placement_id, clicked, created_at')
    .eq('app_id', id)
    .order('created_at', { ascending: false })
    .limit(50)

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

  const { data: connectAccount, error: connectAccountError } = await (supabase as any)
    .from('publisher_connect_accounts')
    .select('stripe_account_id, payouts_enabled, charges_enabled, details_submitted')
    .eq('user_id', user.id)
    .maybeSingle()

  if (connectAccountError) {
    console.error('[dashboard] failed to fetch publisher connect account', connectAccountError)
  }

  const { data: rawWeeklyEarnings, error: weeklyEarningsError } = await (supabase as any)
    .from('publisher_weekly_earnings')
    .select('week_start, gross_earnings_cents, converted_cents, payout_status, hold_until, paid_at')
    .eq('publisher_app_id', id)
    .eq('user_id', user.id)
    .order('week_start', { ascending: false })
    .limit(24)

  if (weeklyEarningsError) {
    console.error('[dashboard] failed to fetch weekly earnings', weeklyEarningsError)
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

  const weeklyEarnings = ((rawWeeklyEarnings ?? []) as PublisherWeeklyEarningsRow[])
    .filter((row): row is PublisherWeeklyEarningsRow => typeof row.week_start === 'string')
    .map((row) => {
      const gross = toCount(row.gross_earnings_cents)
      const converted = toCount(row.converted_cents)
      return {
        weekStart: row.week_start,
        payoutStatus: row.payout_status,
        holdUntil: row.hold_until,
        paidAt: row.paid_at,
        grossCents: gross,
        convertedCents: converted,
        netCents: Math.max(0, gross - converted),
      }
    })

  const earningsTotals = weeklyEarnings.reduce((totals, row) => {
    totals.total += row.netCents

    if (row.payoutStatus === 'paid') {
      totals.paid += row.netCents
      return totals
    }

    const isHeld = new Date(row.holdUntil).getTime() > Date.now()
    if (isHeld) {
      totals.onHold += row.netCents
      return totals
    }

    if (row.payoutStatus === 'eligible') {
      totals.eligible += row.netCents
      return totals
    }

    totals.accrued += row.netCents
    return totals
  }, {
    total: 0,
    accrued: 0,
    onHold: 0,
    eligible: 0,
    paid: 0,
  })

  // Calculate stats
  const totalRequests = recentRequests?.length ?? 0
  const filledRequests = recentRequests?.filter(r => r.response_type === 'ad').length ?? 0
  const fillRate = totalRequests > 0 ? Math.round((filledRequests / totalRequests) * 100) : 0
  const clickedRequests = recentRequests?.filter(r => r.clicked).length ?? 0

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

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>SDK Integration</CardTitle>
            <CardDescription>
              Use these tokens to authenticate your app with the Guild Ads SDK
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted rounded-lg p-4 font-mono text-sm">
              <pre className="overflow-x-auto">
{`import GuildAds

// Initialize in your App's init
GuildAds.configure(token: "YOUR_SDK_TOKEN")`}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* SDK Activity */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChartLine className="h-5 w-5" />
              SDK Activity
            </CardTitle>
            <CardDescription>
              Recent ad requests from your app (last 50 requests)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {totalRequests > 0 ? (
              <>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{totalRequests}</p>
                    <p className="text-sm text-muted-foreground">Total Requests</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{fillRate}%</p>
                    <p className="text-sm text-muted-foreground">Fill Rate</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{clickedRequests}</p>
                    <p className="text-sm text-muted-foreground">Clicks</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium mb-3">Recent Requests</p>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {recentRequests?.slice(0, 10).map((request) => (
                      <div
                        key={request.request_id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg text-sm"
                      >
                        <div className="flex items-center gap-3">
                          {request.response_type === 'ad' ? (
                            <CheckCircle className="h-4 w-4 text-green-500" weight="fill" />
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground" weight="fill" />
                          )}
                          <span className={request.response_type === 'ad' ? 'text-foreground' : 'text-muted-foreground'}>
                            {request.response_type === 'ad' ? 'Ad served' : 'No fill'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-muted-foreground">
                          {request.sdk_version && (
                            <span className="text-xs">v{request.sdk_version}</span>
                          )}
                          {request.placement_id && (
                            <span className="text-xs font-mono">{request.placement_id}</span>
                          )}
                          <span className="text-xs">
                            {new Date(request.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ChartLine className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No SDK requests yet</p>
                <p className="text-sm mt-1">Integrate the SDK and make your first request</p>
              </div>
            )}
          </CardContent>
        </Card>

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
            <CardTitle>Payout Accounting</CardTitle>
            <CardDescription>
              Weekly accrual, hold, and payout status for this app.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-xs uppercase text-muted-foreground tracking-wide">Accrued</p>
                <p className="mt-1 text-lg font-semibold">${(earningsTotals.accrued / 100).toFixed(2)}</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-xs uppercase text-muted-foreground tracking-wide">On Hold</p>
                <p className="mt-1 text-lg font-semibold">${(earningsTotals.onHold / 100).toFixed(2)}</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-xs uppercase text-muted-foreground tracking-wide">Eligible</p>
                <p className="mt-1 text-lg font-semibold">${(earningsTotals.eligible / 100).toFixed(2)}</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-xs uppercase text-muted-foreground tracking-wide">Paid</p>
                <p className="mt-1 text-lg font-semibold">${(earningsTotals.paid / 100).toFixed(2)}</p>
              </div>
            </div>

            <ConnectOnboardingCard
              returnPath={`/dashboard/apps/${id}/publish`}
              initialStatus={{
                connected: !!connectAccount?.stripe_account_id,
                stripeAccountId: connectAccount?.stripe_account_id ?? null,
                payoutsEnabled: connectAccount?.payouts_enabled === true,
                chargesEnabled: connectAccount?.charges_enabled === true,
                detailsSubmitted: connectAccount?.details_submitted === true,
              }}
            />

            {weeklyEarnings.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">Week</th>
                      <th className="py-2 pr-3 font-medium">Gross</th>
                      <th className="py-2 pr-3 font-medium">Converted</th>
                      <th className="py-2 pr-3 font-medium">Net Earnings</th>
                      <th className="py-2 pr-3 font-medium">Status</th>
                      <th className="py-2 pr-3 font-medium">Hold Until</th>
                      <th className="py-2 font-medium">Paid At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeklyEarnings.map((row) => (
                      <tr key={row.weekStart} className="border-b last:border-0">
                        <td className="py-2 pr-3 font-medium">{formatWeekRange(row.weekStart)}</td>
                        <td className="py-2 pr-3">${(row.grossCents / 100).toFixed(2)}</td>
                        <td className="py-2 pr-3">${(row.convertedCents / 100).toFixed(2)}</td>
                        <td className="py-2 pr-3">${(row.netCents / 100).toFixed(2)}</td>
                        <td className="py-2 pr-3">{row.payoutStatus}</td>
                        <td className="py-2 pr-3">{new Date(row.holdUntil).toLocaleDateString()}</td>
                        <td className="py-2">{row.paidAt ? new Date(row.paidAt).toLocaleDateString() : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
                    <p className="text-xs uppercase text-muted-foreground tracking-wide">Logged Requests</p>
                    <p className="mt-1 text-lg font-semibold">{dataVolume.adRequestRows.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-xs uppercase text-muted-foreground tracking-wide">Tracked User-Weeks</p>
                    <p className="mt-1 text-lg font-semibold">{dataVolume.uniqueAdViewRows.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-xs uppercase text-muted-foreground tracking-wide">Requests (Last 7d)</p>
                    <p className="mt-1 text-lg font-semibold">{dataVolume.adRequestRows7d.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-xs uppercase text-muted-foreground tracking-wide">Requests (Last 30d)</p>
                    <p className="mt-1 text-lg font-semibold">{dataVolume.adRequestRows30d.toLocaleString()}</p>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
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

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">SDK Tokens</h2>
          <CreateTokenButton appId={id} />
        </div>

        {tokens && tokens.length > 0 ? (
          <TokenList tokens={tokens} appId={id} />
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" weight="duotone" />
              <h3 className="text-lg font-semibold mb-2">No tokens yet</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Create an SDK token to start displaying sponsor cards in your app.
              </p>
              <CreateTokenButton appId={id} />
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}

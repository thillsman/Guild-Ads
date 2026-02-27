export const dynamic = 'force-dynamic'

import { createAdminClient, getAuthUser } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Key, ChartLine, CheckCircle, XCircle } from '@phosphor-icons/react/dist/ssr'
import { CreateTokenButton } from './create-token-button'
import { ConnectOnboardingCard } from './connect-onboarding-card'
import { TokenList } from './token-list'

interface Props {
  params: Promise<{ id: string }>
}

interface PublisherWeeklyEarningsRow {
  week_start: string
  gross_earnings_cents: number | string
  converted_cents: number | string
  payout_status: string
  hold_until: string
  paid_at: string | null
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

export default async function AppPublishPage({ params }: Props) {
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

  const { data: tokens } = await supabase
    .from('app_tokens')
    .select('token_id, name, created_at, last_used_at, revoked_at')
    .eq('app_id', id)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })

  const { data: recentRequests } = await supabase
    .from('ad_requests')
    .select('request_id, response_type, sdk_version, os_version, locale, placement_id, clicked, created_at')
    .eq('app_id', id)
    .order('created_at', { ascending: false })
    .limit(50)

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

  const totalRequests = recentRequests?.length ?? 0
  const filledRequests = recentRequests?.filter((request) => request.response_type === 'ad').length ?? 0
  const fillRate = totalRequests > 0 ? Math.round((filledRequests / totalRequests) * 100) : 0
  const clickedRequests = recentRequests?.filter((request) => request.clicked).length ?? 0

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
          <h1 className="text-2xl font-bold">Publish and Earn</h1>
          <p className="text-muted-foreground">{app.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">{app.bundle_identifier}</p>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>SDK Integration</CardTitle>
          <CardDescription>
            Install the iOS SDK with Swift Package Manager and use these tokens to authenticate your app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Swift Package Manager URL: <span className="font-mono">https://github.com/Guild-Ads/guild-ads-ios</span>
          </p>
          <div className="rounded-lg bg-muted p-4 font-mono text-sm">
            <pre className="overflow-x-auto">
{`// Xcode -> File -> Add Package Dependencies...
// URL: https://github.com/Guild-Ads/guild-ads-ios

import GuildAds

// Initialize in your App's init
GuildAds.configure(token: "YOUR_SDK_TOKEN")`}
            </pre>
          </div>
        </CardContent>
      </Card>

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
              <div className="mb-6 grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-muted p-4 text-center">
                  <p className="text-2xl font-bold">{totalRequests}</p>
                  <p className="text-sm text-muted-foreground">Total Requests</p>
                </div>
                <div className="rounded-lg bg-muted p-4 text-center">
                  <p className="text-2xl font-bold">{fillRate}%</p>
                  <p className="text-sm text-muted-foreground">Fill Rate</p>
                </div>
                <div className="rounded-lg bg-muted p-4 text-center">
                  <p className="text-2xl font-bold">{clickedRequests}</p>
                  <p className="text-sm text-muted-foreground">Clicks</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="mb-3 text-sm font-medium">Recent Requests</p>
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {recentRequests?.slice(0, 10).map((request) => (
                    <div
                      key={request.request_id}
                      className="flex items-center justify-between rounded-lg bg-muted/50 p-3 text-sm"
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
            <div className="py-8 text-center text-muted-foreground">
              <ChartLine className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p>No SDK requests yet</p>
              <p className="mt-1 text-sm">Integrate the SDK and make your first request</p>
            </div>
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
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Accrued</p>
              <p className="mt-1 text-lg font-semibold">${(earningsTotals.accrued / 100).toFixed(2)}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">On Hold</p>
              <p className="mt-1 text-lg font-semibold">${(earningsTotals.onHold / 100).toFixed(2)}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Eligible</p>
              <p className="mt-1 text-lg font-semibold">${(earningsTotals.eligible / 100).toFixed(2)}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Paid</p>
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

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold">SDK Tokens</h2>
        <CreateTokenButton appId={id} />
      </div>

      {tokens && tokens.length > 0 ? (
        <TokenList tokens={tokens} appId={id} />
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Key className="mx-auto mb-4 h-12 w-12 text-muted-foreground" weight="duotone" />
            <h3 className="mb-2 text-lg font-semibold">No tokens yet</h3>
            <p className="mx-auto mb-6 max-w-sm text-muted-foreground">
              Create an SDK token to start displaying sponsor cards in your app.
            </p>
            <CreateTokenButton appId={id} />
          </CardContent>
        </Card>
      )}
    </main>
  )
}

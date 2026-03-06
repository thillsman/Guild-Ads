export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { AdminNav } from '@/components/admin/admin-nav'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createAdminClient, getAuthUser } from '@/lib/supabase/server'
import { isHardcodedAdminUser } from '@/lib/admin/access'
import {
  getAdminWeeklyAdvertiserBreakdown,
  getAdminWeeklyNetworkSummaries,
  getAdminWeeklyPublisherBreakdown,
  type AdminWeeklyAdvertiser,
  type AdminWeeklyNetworkSummary,
  type AdminWeeklyPublisher,
} from '@/lib/admin/network-admin'
import { getLiveNetworkStats } from '@/lib/network/live-network-stats'
import { getNextSundayUTC } from '@/lib/billing/time'
import { resolveServeWeekStart } from '@/lib/sdk-api/common'

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatRatio(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`
}

function formatWholePercent(value: number): string {
  return `${value.toFixed(0)}%`
}

function formatWeekRange(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00Z`)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 6)

  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}`
}

function payoutStatusClass(status: string | null): string {
  if (status === 'paid') {
    return 'bg-green-500/10 text-green-700'
  }

  if (status === 'eligible') {
    return 'bg-blue-500/10 text-blue-700'
  }

  if (status === 'accrued') {
    return 'bg-amber-500/10 text-amber-700'
  }

  if (status === 'carried_forward') {
    return 'bg-muted text-muted-foreground'
  }

  return 'bg-muted text-muted-foreground'
}

function payoutStatusLabel(status: string | null): string {
  if (!status) {
    return 'Projected'
  }

  return status.replaceAll('_', ' ')
}

function zeroSummary(weekStart: string, networkPriceCents: number): AdminWeeklyNetworkSummary {
  return {
    weekStart,
    networkPriceCents,
    bookedSpendCents: 0,
    cashSpendCents: 0,
    creditsSpendCents: 0,
    purchasedPercentage: 0,
    advertiserAppCount: 0,
    publisherAppCount: 0,
    networkUniqueUsers: 0,
    platformReserveCents: 0,
    publisherPoolCents: 0,
  }
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  )
}

function AdvertiserSummaryStats({ summary }: { summary: AdminWeeklyNetworkSummary }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      <StatCard label="Network Price" value={formatCurrency(summary.networkPriceCents)} />
      <StatCard label="Booked Value" value={formatCurrency(summary.bookedSpendCents)} />
      <StatCard label="Cash Spend" value={formatCurrency(summary.cashSpendCents)} />
      <StatCard label="Credits Used" value={formatCurrency(summary.creditsSpendCents)} />
      <StatCard label="Sold Share" value={formatWholePercent(summary.purchasedPercentage)} />
      <StatCard label="Platform Reserve" value={formatCurrency(summary.platformReserveCents)} />
      <StatCard label="Publisher Pool" value={formatCurrency(summary.publisherPoolCents)} />
    </div>
  )
}

function AdvertiserTable({
  advertisers,
  showDelivery,
}: {
  advertisers: AdminWeeklyAdvertiser[]
  showDelivery: boolean
}) {
  if (advertisers.length === 0) {
    return <p className="text-sm text-muted-foreground">No confirmed advertisers for this week.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Advertiser</th>
            <th className="py-2 pr-3 font-medium">Bought Share</th>
            <th className="py-2 pr-3 font-medium">Booked Value</th>
            <th className="py-2 pr-3 font-medium">Cash Paid</th>
            <th className="py-2 pr-3 font-medium">Credits Used</th>
            {showDelivery && (
              <>
                <th className="py-2 pr-3 font-medium">Users Reached</th>
                <th className="py-2 font-medium">Actual Share</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {advertisers.map((advertiser) => (
            <tr key={advertiser.advertiserAppID} className="border-b last:border-0">
              <td className="py-2 pr-3 font-medium">{advertiser.advertiserAppName}</td>
              <td className="py-2 pr-3">{formatWholePercent(advertiser.purchasedPercentage)}</td>
              <td className="py-2 pr-3">{formatCurrency(advertiser.bookedSpendCents)}</td>
              <td className="py-2 pr-3">{formatCurrency(advertiser.cashSpendCents)}</td>
              <td className="py-2 pr-3">{formatCurrency(advertiser.creditsSpendCents)}</td>
              {showDelivery && (
                <>
                  <td className="py-2 pr-3">{advertiser.userReach.toLocaleString()}</td>
                  <td className="py-2">{formatRatio(advertiser.actualShareRatio)}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PublisherTable({
  publishers,
  showStatus,
}: {
  publishers: AdminWeeklyPublisher[]
  showStatus: boolean
}) {
  if (publishers.length === 0) {
    return <p className="text-sm text-muted-foreground">No counted publisher reach for this week.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Publisher</th>
            <th className="py-2 pr-3 font-medium">Counted Users</th>
            <th className="py-2 pr-3 font-medium">User Share</th>
            <th className="py-2 pr-3 font-medium">Gross Cut</th>
            <th className="py-2 pr-3 font-medium">Bonus Credit</th>
            {showStatus && (
              <>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 font-medium">Timing</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {publishers.map((publisher) => (
            <tr key={publisher.publisherAppID} className="border-b last:border-0">
              <td className="py-2 pr-3 font-medium">{publisher.publisherAppName}</td>
              <td className="py-2 pr-3">{publisher.uniqueUsers.toLocaleString()}</td>
              <td className="py-2 pr-3">{formatRatio(publisher.shareRatio)}</td>
              <td className="py-2 pr-3">
                {formatCurrency(publisher.duePayoutCents)}
                {publisher.convertedCents > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(publisher.convertedCents)} converted to credits
                  </p>
                )}
              </td>
              <td className="py-2 pr-3">{formatCurrency(publisher.bonusCreditCents)}</td>
              {showStatus && (
                <>
                  <td className="py-2 pr-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs ${payoutStatusClass(publisher.payoutStatus)}`}>
                      {payoutStatusLabel(publisher.payoutStatus)}
                    </span>
                  </td>
                  <td className="py-2 text-muted-foreground">
                    {publisher.paidAt
                      ? `Paid ${new Date(publisher.paidAt).toLocaleDateString()}`
                      : publisher.holdUntil
                        ? `Hold until ${new Date(publisher.holdUntil).toLocaleDateString()}`
                        : '-'}
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default async function AdminPage() {
  const user = await getAuthUser()
  if (!user) {
    redirect('/login')
  }

  if (!isHardcodedAdminUser(user.id)) {
    redirect('/dashboard')
  }

  const supabase = createAdminClient()
  const currentWeekStart = resolveServeWeekStart(new Date())
  const nextWeekStart = getNextSundayUTC(new Date())

  const [liveNetworkStats, weeklySummaries, weekSlots] = await Promise.all([
    getLiveNetworkStats(supabase),
    getAdminWeeklyNetworkSummaries(supabase, 52),
    supabase
      .from('weekly_slots')
      .select('week_start, base_price_cents')
      .in('week_start', [currentWeekStart, nextWeekStart]),
  ])

  if (weekSlots.error) {
    console.error('[admin] failed to fetch weekly slots', weekSlots.error)
  }

  const weekSummaryByStart = new Map(weeklySummaries.map((summary) => [summary.weekStart, summary]))
  const slotPriceByWeek = new Map((weekSlots.data ?? []).map((slot) => [slot.week_start, slot.base_price_cents]))

  const currentWeekSummary = weekSummaryByStart.get(currentWeekStart)
    ?? zeroSummary(currentWeekStart, slotPriceByWeek.get(currentWeekStart) ?? 0)
  const nextWeekSummary = weekSummaryByStart.get(nextWeekStart)
    ?? zeroSummary(nextWeekStart, slotPriceByWeek.get(nextWeekStart) ?? 0)

  const priorWeekSummaries = weeklySummaries.filter((summary) => summary.weekStart < currentWeekStart)

  const [
    currentWeekAdvertisers,
    nextWeekAdvertisers,
    currentWeekPublishers,
    priorWeekPublisherSections,
  ] = await Promise.all([
    getAdminWeeklyAdvertiserBreakdown(supabase, currentWeekStart),
    getAdminWeeklyAdvertiserBreakdown(supabase, nextWeekStart),
    getAdminWeeklyPublisherBreakdown(supabase, currentWeekStart),
    Promise.all(
      priorWeekSummaries.map(async (summary) => ({
        summary,
        publishers: await getAdminWeeklyPublisherBreakdown(supabase, summary.weekStart),
      }))
    ),
  ])

  return (
    <main className="space-y-8">
      <div className="space-y-3">
        <div>
          <h1 className="text-3xl font-bold">Admin</h1>
          <p className="mt-1 text-muted-foreground">
            Network-level booking, delivery, and publisher payout reporting.
          </p>
        </div>
        <AdminNav />
      </div>

      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle>Live Snapshot</CardTitle>
          <CardDescription>
            These cards intentionally mirror the public network snapshot. Advertiser apps come from current-week confirmed bookings. Publisher apps and users come from the trailing 7-day snapshot logic, with sticky-assignment backfill when serve-attempt logging is missing.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-muted/40 p-4">
            <p className="text-sm text-muted-foreground">Advertiser apps</p>
            <p className="mt-1 text-3xl font-bold">{liveNetworkStats?.advertiserAppsCount.toLocaleString() ?? '0'}</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-4">
            <p className="text-sm text-muted-foreground">Publisher apps</p>
            <p className="mt-1 text-3xl font-bold">{liveNetworkStats?.publisherAppsCount.toLocaleString() ?? '0'}</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-4">
            <p className="text-sm text-muted-foreground">Trailing 7-day users</p>
            <p className="mt-1 text-3xl font-bold">{liveNetworkStats?.trailing7dUsers.toLocaleString() ?? '0'}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Week Advertisers</CardTitle>
          <CardDescription>
            {formatWeekRange(currentWeekStart)}. Delivery uses weekly counted users from sticky assignments, summed within each publisher app. Booked value includes credits; publisher payouts do not.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AdvertiserSummaryStats summary={currentWeekSummary} />
          <AdvertiserTable advertisers={currentWeekAdvertisers} showDelivery />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Next Week Advertisers</CardTitle>
          <CardDescription>
            {formatWeekRange(nextWeekStart)}. Confirmed bookings only. Price is locked from the current week&apos;s sold share.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AdvertiserSummaryStats summary={nextWeekSummary} />
          <AdvertiserTable advertisers={nextWeekAdvertisers} showDelivery={false} />
        </CardContent>
      </Card>

      <div className="border-t" />

      <Card>
        <CardHeader>
          <CardTitle>Current Week Publishers</CardTitle>
          <CardDescription>
            {formatWeekRange(currentWeekStart)}. User share and gross cut use the same weekly counted-user basis as publisher payout accrual. Gross cut is funded from cash advertiser spend only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard label="Cash Spend" value={formatCurrency(currentWeekSummary.cashSpendCents)} />
            <StatCard label="Platform Reserve" value={formatCurrency(currentWeekSummary.platformReserveCents)} />
            <StatCard label="Publisher Pool" value={formatCurrency(currentWeekSummary.publisherPoolCents)} />
            <StatCard label="Counted Users" value={currentWeekSummary.networkUniqueUsers.toLocaleString()} />
            <StatCard label="Publishers" value={currentWeekSummary.publisherAppCount.toLocaleString()} />
          </div>
          <PublisherTable publishers={currentWeekPublishers} showStatus />
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold">Prior Weeks</h2>
          <p className="text-sm text-muted-foreground">
            Reverse chronological publisher payout history.
          </p>
        </div>

        {priorWeekPublisherSections.length > 0 ? (
          priorWeekPublisherSections.map(({ summary, publishers }) => (
            <Card key={summary.weekStart}>
              <CardHeader>
                <CardTitle>{formatWeekRange(summary.weekStart)}</CardTitle>
                <CardDescription>
                  Network price {formatCurrency(summary.networkPriceCents)} · publisher pool {formatCurrency(summary.publisherPoolCents)} · platform reserve {formatCurrency(summary.platformReserveCents)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-8">
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Booked Value</p>
                    <p className="mt-1 text-lg font-semibold">{formatCurrency(summary.bookedSpendCents)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Cash Spend</p>
                    <p className="mt-1 text-lg font-semibold">{formatCurrency(summary.cashSpendCents)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Credits Used</p>
                    <p className="mt-1 text-lg font-semibold">{formatCurrency(summary.creditsSpendCents)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Sold Share</p>
                    <p className="mt-1 text-lg font-semibold">{formatWholePercent(summary.purchasedPercentage)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Platform Reserve</p>
                    <p className="mt-1 text-lg font-semibold">{formatCurrency(summary.platformReserveCents)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Publisher Pool</p>
                    <p className="mt-1 text-lg font-semibold">{formatCurrency(summary.publisherPoolCents)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Counted Users</p>
                    <p className="mt-1 text-lg font-semibold">{summary.networkUniqueUsers.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Publishers</p>
                    <p className="mt-1 text-lg font-semibold">{summary.publisherAppCount.toLocaleString()}</p>
                  </div>
                </div>
                <PublisherTable publishers={publishers} showStatus />
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-8 text-sm text-muted-foreground">
              No prior weekly publisher data yet.
            </CardContent>
          </Card>
        )}
      </section>
    </main>
  )
}

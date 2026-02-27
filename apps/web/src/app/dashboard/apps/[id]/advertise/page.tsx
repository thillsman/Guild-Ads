import { createAdminClient, getAuthUser } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, CalendarCheck, PencilSimple, ChartLine } from '@phosphor-icons/react/dist/ssr'
import { NextWeekBooking } from '@/components/booking/next-week-booking'

interface Props {
  params: Promise<{ id: string }>
}

interface UpcomingSlotPurchaseRow {
  purchase_id: string
  percentage_purchased: number | string
  price_cents: number | string
  payment_provider: string | null
  created_at: string
  campaigns: { app_id: string; name: string } | Array<{ app_id: string; name: string }> | null
  weekly_slots: { week_start: string } | Array<{ week_start: string }> | null
}

interface UpcomingSlotPurchase {
  purchaseId: string
  campaignName: string
  weekStart: string
  percentage: number
  priceCents: number
  paymentProvider: string
  createdAt: string
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

function getCurrentWeekStartUTC(now: Date = new Date()): string {
  const current = new Date(now)
  current.setUTCHours(0, 0, 0, 0)
  current.setUTCDate(current.getUTCDate() - current.getUTCDay())
  return current.toISOString().split('T')[0]
}

function paymentProviderLabel(provider: string): string {
  if (provider === 'credits') {
    return 'Credits'
  }
  if (provider === 'internal') {
    return 'Internal'
  }
  return 'Card'
}

export default async function AppAdvertisePage({ params }: Props) {
  const { id } = await params
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const supabase = createAdminClient()

  const { data: app, error } = await supabase
    .from('apps')
    .select('app_id, name, subtitle, bundle_identifier, icon_url, app_store_url')
    .eq('app_id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !app) {
    notFound()
  }

  const { data: campaigns } = await (supabase as any)
    .from('campaigns')
    .select(`
      campaign_id,
      name,
      status,
      headline,
      body,
      destination_url,
      icon_url,
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

  const { data: rawUpcomingPurchases, error: upcomingPurchasesError } = await (supabase as any)
    .from('slot_purchases')
    .select(`
      purchase_id,
      percentage_purchased,
      price_cents,
      payment_provider,
      created_at,
      campaigns (
        app_id,
        name
      ),
      weekly_slots (
        week_start
      )
    `)
    .eq('user_id', user.id)
    .eq('status', 'confirmed')
    .is('refunded_at', null)
    .order('created_at', { ascending: false })
    .limit(200)

  if (upcomingPurchasesError) {
    console.error('[dashboard] failed to fetch upcoming paid slots', upcomingPurchasesError)
  }

  const currentWeekStart = getCurrentWeekStartUTC()
  const upcomingPaidSlots = ((rawUpcomingPurchases ?? []) as UpcomingSlotPurchaseRow[])
    .map((row): (UpcomingSlotPurchase & { appId: string }) | null => {
      const campaign = Array.isArray(row.campaigns) ? row.campaigns[0] : row.campaigns
      const slot = Array.isArray(row.weekly_slots) ? row.weekly_slots[0] : row.weekly_slots
      if (!campaign || !slot || typeof campaign.app_id !== 'string' || typeof slot.week_start !== 'string') {
        return null
      }

      return {
        purchaseId: String(row.purchase_id),
        campaignName: typeof campaign.name === 'string' ? campaign.name : 'Campaign',
        weekStart: slot.week_start,
        percentage: toCount(row.percentage_purchased),
        priceCents: toCount(row.price_cents),
        paymentProvider: typeof row.payment_provider === 'string' ? row.payment_provider : 'stripe',
        createdAt: row.created_at,
        appId: campaign.app_id,
      }
    })
    .filter((row): row is UpcomingSlotPurchase & { appId: string } => (
      !!row &&
      row.appId === id &&
      row.weekStart >= currentWeekStart
    ))
    .sort((left, right) => {
      const weekCompare = left.weekStart.localeCompare(right.weekStart)
      if (weekCompare !== 0) {
        return weekCompare
      }

      return right.createdAt.localeCompare(left.createdAt)
    })

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
          <h1 className="text-2xl font-bold">{app.name}</h1>
          {app.subtitle && (
            <p className="text-muted-foreground">{app.subtitle}</p>
          )}
          <p className="mt-1 text-sm text-muted-foreground">
            {app.bundle_identifier}
          </p>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="mb-4 text-xl font-semibold">Book Ad Spots</h2>
        <NextWeekBooking appId={id} userId={user.id} />
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Upcoming Paid Slots</CardTitle>
          <CardDescription>
            Confirmed upcoming reservations for this app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingPaidSlots.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Week</th>
                    <th className="py-2 pr-3 font-medium">Campaign</th>
                    <th className="py-2 pr-3 font-medium">Share</th>
                    <th className="py-2 pr-3 font-medium">Amount</th>
                    <th className="py-2 pr-3 font-medium">Paid Via</th>
                    <th className="py-2 font-medium">Purchased</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingPaidSlots.map((slot) => (
                    <tr key={slot.purchaseId} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-medium">{formatWeekRange(slot.weekStart)}</td>
                      <td className="py-2 pr-3">{slot.campaignName}</td>
                      <td className="py-2 pr-3">{slot.percentage}%</td>
                      <td className="py-2 pr-3">${(slot.priceCents / 100).toFixed(2)}</td>
                      <td className="py-2 pr-3">{paymentProviderLabel(slot.paymentProvider)}</td>
                      <td className="py-2">{new Date(slot.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No confirmed upcoming paid slots yet.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Campaign Creative</h2>
        <Button asChild>
          <Link href={`/dashboard/apps/${id}/advertise/new`}>
            <Plus className="mr-2 h-4 w-4" />
            Create Campaign
          </Link>
        </Button>
      </div>

      {campaigns && campaigns.length > 0 ? (
        <div className="grid gap-4">
          {campaigns.map((campaign: any) => {
            const booking = campaign.slot_purchases?.[0]
            const weekStart = booking?.weekly_slots?.week_start
            const campaignIcon = typeof campaign.icon_url === 'string' && campaign.icon_url.length > 0
              ? campaign.icon_url
              : app.icon_url

            return (
              <Card key={campaign.campaign_id}>
                <CardContent className="pt-6">
                  <div className="mb-4 flex items-start gap-3">
                    {campaignIcon ? (
                      <img
                        src={campaignIcon}
                        alt={campaign.headline || campaign.name || 'Campaign icon'}
                        className="h-12 w-12 rounded-xl"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-xl bg-muted" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <p className="font-semibold">
                          {campaign.headline || campaign.name || 'Untitled campaign'}
                        </p>
                        <span className={`rounded-full px-2 py-0.5 text-xs ${
                          campaign.status === 'active'
                            ? 'bg-green-500/10 text-green-600'
                            : campaign.status === 'scheduled'
                            ? 'bg-blue-500/10 text-blue-600'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {campaign.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {campaign.body || 'No subtitle set'}
                      </p>
                      {campaign.destination_url ? (
                        <a
                          href={campaign.destination_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-block text-sm text-blue-600 hover:underline"
                        >
                          {campaign.destination_url}
                        </a>
                      ) : (
                        <p className="mt-1 text-sm text-muted-foreground">No linked URL set.</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    {weekStart ? (
                      <span className="inline-flex items-center gap-1">
                        <CalendarCheck className="h-4 w-4" />
                        {formatWeekRange(weekStart)}
                      </span>
                    ) : (
                      <span>No week booked yet</span>
                    )}
                    {booking && (
                      <>
                        <span>{toCount(booking.percentage_purchased)}% of network</span>
                        <span>${(toCount(booking.price_cents) / 100).toFixed(2)}</span>
                      </>
                    )}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/apps/${id}/advertise/${campaign.campaign_id}/edit`}>
                        <PencilSimple className="mr-2 h-4 w-4" />
                        Edit Creative
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/apps/${id}/ad-performance`}>
                        <ChartLine className="mr-2 h-4 w-4" />
                        View Performance
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="mb-2 text-lg font-semibold">No campaigns yet</h3>
            <p className="mx-auto mb-6 max-w-sm text-muted-foreground">
              Create a campaign to start advertising your app to users of other indie apps.
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

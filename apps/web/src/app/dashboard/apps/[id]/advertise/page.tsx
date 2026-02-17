import { createClient, getAuthUser } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Plus, ChartLine, Eye, CalendarCheck } from '@phosphor-icons/react/dist/ssr'
import { NextWeekBooking } from '@/components/booking/next-week-booking'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AppAdvertisePage({ params }: Props) {
  const { id } = await params
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const supabase = await createClient()

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
                    <div className="flex gap-6 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        <span>0 impressions</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ChartLine className="h-4 w-4" />
                        <span>0 clicks</span>
                      </div>
                    </div>
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

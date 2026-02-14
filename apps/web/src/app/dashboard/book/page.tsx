import { createAdminClient, getAuthUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Info } from '@phosphor-icons/react/dist/ssr'
import { DashboardHeader } from '@/components/dashboard/header'
import { NextWeekBooking } from '@/components/booking/next-week-booking'

export default async function BookPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const supabase = createAdminClient()

  // Get user's apps and campaigns
  const { data: apps } = await supabase
    .from('apps')
    .select('app_id, name, icon_url')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('campaign_id, name, app_id, headline')
    .eq('user_id', user.id)
    .eq('status', 'scheduled')
    .order('created_at', { ascending: false })

  const hasApps = apps && apps.length > 0
  const hasCampaigns = campaigns && campaigns.length > 0

  return (
    <div className="min-h-screen">
      <DashboardHeader user={user} />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-4 mb-2">
          <Link
            href="/dashboard"
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-3xl font-bold">Book Ad Spots</h1>
        </div>
        <p className="text-muted-foreground mb-8 ml-9">
          Reserve your share of the Guild network for next week
        </p>

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

            <NextWeekBooking userId={user.id} appId={apps[0].app_id} />

            <Card>
              <CardHeader>
                <CardTitle>Your Apps</CardTitle>
                <CardDescription>Select an app to create a campaign</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {apps.map((app) => (
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
              campaignId={campaigns[0].campaign_id}
              appId={campaigns[0].app_id}
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
    </div>
  )
}

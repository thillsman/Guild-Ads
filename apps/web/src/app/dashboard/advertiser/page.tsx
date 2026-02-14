import { createClient, getAuthUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, ArrowLeft } from '@phosphor-icons/react/dist/ssr'
import { DashboardHeader } from '@/components/dashboard/header'

export default async function AdvertiserDashboardPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const supabase = await createClient()

  // Check if user has advertiser profile
  const { data: advertiser } = await supabase
    .from('advertisers')
    .select('advertiser_id, name, status')
    .eq('user_id', user.id)
    .single()

  if (!advertiser) {
    redirect('/dashboard/advertiser/setup')
  }

  // Fetch campaigns
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select(`
      campaign_id,
      name,
      status,
      created_at,
      bundle:bundles(name),
      creative:creatives(headline)
    `)
    .eq('advertiser_id', advertiser.advertiser_id)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen">
      <DashboardHeader user={user} />

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-2">
          <Link
            href="/dashboard"
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-3xl font-bold">Advertiser Dashboard</h1>
        </div>
        <p className="text-muted-foreground mb-8 ml-9">
          {advertiser.name} &middot; Manage your campaigns and creatives.
        </p>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Campaigns</h2>
          <Button asChild>
            <Link href="/dashboard/advertiser/campaigns/new">
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Link>
          </Button>
        </div>

        {campaigns && campaigns.length > 0 ? (
          <div className="grid gap-4">
            {campaigns.map((campaign) => (
              <Card key={campaign.campaign_id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{campaign.name}</CardTitle>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                      {campaign.status}
                    </span>
                  </div>
                  <CardDescription>
                    {(campaign.bundle as any)?.name || 'No bundle'} &middot; {(campaign.creative as any)?.headline || 'No creative'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/advertiser/campaigns/${campaign.campaign_id}`}>
                      View Details
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                You haven&apos;t created any campaigns yet.
              </p>
              <Button asChild>
                <Link href="/dashboard/advertiser/campaigns/new">
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

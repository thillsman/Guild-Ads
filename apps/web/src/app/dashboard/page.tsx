export const dynamic = 'force-dynamic'

import { createAdminClient, getAuthUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Megaphone, Broadcast, Key } from '@phosphor-icons/react/dist/ssr'
import { NetworkPricingBanner } from '@/components/booking/network-pricing-banner'

export default async function DashboardPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const supabase = createAdminClient()

  // Fetch user's apps (using admin client since user is already verified via getAuthUser)
  const { data: apps } = await supabase
    .from('apps')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Keep the most recently-created app for each bundle identifier.
  const dedupedApps = (apps ?? []).filter((app, index, allApps) => {
    if (!app.bundle_identifier) return true
    return allApps.findIndex((candidate) => candidate.bundle_identifier === app.bundle_identifier) === index
  })

  const { data: internalPolicy } = await (supabase as any)
    .from('internal_account_policies')
    .select('active, can_manage_internal')
    .eq('user_id', user.id)
    .maybeSingle()

  const canManageInternal = internalPolicy?.active === true && internalPolicy?.can_manage_internal === true

  return (
    <main className="space-y-8">
      {/* Network Pricing Banner */}
      <div>
        <NetworkPricingBanner />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Apps</h1>
          <p className="text-muted-foreground mt-1">
            Add your iOS apps to advertise them or show ads in them.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canManageInternal && (
            <Button variant="outline" asChild>
              <Link href="/dashboard/internal/billing">Internal Billing</Link>
            </Button>
          )}
          <Button asChild>
            <Link href="/dashboard/apps/new">
              <Plus className="h-4 w-4 mr-2" />
              Add App
            </Link>
          </Button>
        </div>
      </div>

      {dedupedApps.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {dedupedApps.map((app) => (
            <Card key={app.app_id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-4">
                  {app.icon_url ? (
                    <img
                      src={app.icon_url}
                      alt={app.name}
                      className="w-16 h-16 rounded-xl"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
                      <Broadcast className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{app.name}</CardTitle>
                    {app.subtitle && (
                      <CardDescription className="truncate">
                        {app.subtitle}
                      </CardDescription>
                    )}
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {app.bundle_identifier}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <Link href={`/dashboard/apps/${app.app_id}/advertise`}>
                      <Megaphone className="h-4 w-4 mr-1" />
                      Advertise
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <Link href={`/dashboard/apps/${app.app_id}/publish`}>
                      <Key className="h-4 w-4 mr-1" />
                      SDK Token
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <Broadcast className="h-12 w-12 text-muted-foreground mx-auto mb-4" weight="duotone" />
            <h3 className="text-lg font-semibold mb-2">No apps yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Add your first iOS app to start advertising it or displaying sponsor cards.
            </p>
            <Button asChild>
              <Link href="/dashboard/apps/new">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First App
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </main>
  )
}

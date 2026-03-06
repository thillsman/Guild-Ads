export const dynamic = 'force-dynamic'

import { createAdminClient, getAuthUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Megaphone, Broadcast, Key } from '@phosphor-icons/react/dist/ssr'
import { NetworkPricingBanner } from '@/components/booking/network-pricing-banner'

type Role = 'advertiser' | 'publisher'

function parseRole(value: string | undefined): Role | null {
  if (value === 'advertiser' || value === 'publisher') {
    return value
  }

  return null
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { role?: string }
}) {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const supabase = createAdminClient()
  const role = parseRole(searchParams?.role)

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

  const { data: internalPolicy } = await supabase
    .from('internal_account_policies')
    .select('active, can_manage_internal')
    .eq('user_id', user.id)
    .maybeSingle()

  const canManageInternal = internalPolicy?.active === true && internalPolicy?.can_manage_internal === true
  const addAppHref = role ? `/dashboard/apps/new?role=${role}` : '/dashboard/apps/new'
  const addAppLabel = role === 'advertiser'
    ? 'Add Advertiser App'
    : role === 'publisher'
      ? 'Add Publisher App'
      : 'Add App'
  const pageTitle = role === 'advertiser'
    ? 'Advertiser Apps'
    : role === 'publisher'
      ? 'Publisher Apps'
      : 'My Apps'
  const pageDescription = role === 'advertiser'
    ? 'Add your iOS apps, create ad campaigns, and book next week\'s reach.'
    : role === 'publisher'
      ? 'Add your iOS apps, generate SDK tokens, and start serving ads in one clean placement.'
      : 'Add your iOS apps to advertise them or show ads in them.'
  const quickAction = role === 'advertiser' && dedupedApps.length > 0
    ? { href: '/dashboard/book', label: 'Book Spots' }
    : role === 'publisher' && dedupedApps.length > 0
      ? { href: `/dashboard/apps/${dedupedApps[0].app_id}/publish`, label: 'Open SDK Setup' }
      : null
  const emptyTitle = role === 'advertiser'
    ? 'No advertiser apps yet'
    : role === 'publisher'
      ? 'No publisher apps yet'
      : 'No apps yet'
  const emptyDescription = role === 'advertiser'
    ? 'Add the first iOS app you want to promote through Guild Ads.'
    : role === 'publisher'
      ? 'Add the first iOS app where you want to show ads.'
      : 'Add your first iOS app to start advertising it or displaying ads.'
  const emptyButtonLabel = role === 'advertiser'
    ? 'Add Your Advertiser App'
    : role === 'publisher'
      ? 'Add Your Publisher App'
      : 'Add Your First App'

  return (
    <main className="space-y-8">
      {/* Network Pricing Banner */}
      <div>
        <NetworkPricingBanner />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{pageTitle}</h1>
          <p className="text-muted-foreground mt-1">
            {pageDescription}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canManageInternal && (
            <Button variant="outline" asChild>
              <Link href="/dashboard/internal/billing">Internal Billing</Link>
            </Button>
          )}
          {quickAction && (
            <Button variant="outline" asChild>
              <Link href={quickAction.href}>{quickAction.label}</Link>
            </Button>
          )}
          <Button asChild>
            <Link href={addAppHref}>
              <Plus className="h-4 w-4 mr-2" />
              {addAppLabel}
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
            <h3 className="text-lg font-semibold mb-2">{emptyTitle}</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              {emptyDescription}
            </p>
            <Button asChild>
              <Link href={addAppHref}>
                <Plus className="h-4 w-4 mr-2" />
                {emptyButtonLabel}
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </main>
  )
}

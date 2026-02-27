import { redirect } from 'next/navigation'
import { createAdminClient, getAuthUser } from '@/lib/supabase/server'
import { DashboardHeader } from '@/components/dashboard/header'
import { DashboardSidebar } from '@/components/dashboard/sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getAuthUser()
  if (!user) {
    redirect('/login')
  }

  const supabase = createAdminClient()
  const { data: apps } = await supabase
    .from('apps')
    .select('app_id, name, bundle_identifier')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const dedupedApps = (apps ?? []).filter((app, index, allApps) => {
    if (!app.bundle_identifier) return true
    return allApps.findIndex((candidate) => candidate.bundle_identifier === app.bundle_identifier) === index
  })

  const defaultAppId = dedupedApps[0]?.app_id ?? null
  const sidebarApps = dedupedApps.map((app) => ({
    app_id: app.app_id,
    name: app.name,
  }))

  return (
    <div className="min-h-screen">
      <DashboardHeader user={{ id: user.id, email: user.email ?? '' }} />

      <div className="container mx-auto px-4 py-6 lg:flex lg:items-start lg:gap-6">
        <aside className="mb-6 w-full lg:mb-0 lg:w-72 lg:shrink-0">
          <DashboardSidebar apps={sidebarApps} defaultAppId={defaultAppId} />
        </aside>

        <div className="min-w-0 flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}

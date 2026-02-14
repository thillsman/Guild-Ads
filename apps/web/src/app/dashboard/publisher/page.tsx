import { createClient, getAuthUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, ArrowLeft } from '@phosphor-icons/react/dist/ssr'
import { DashboardHeader } from '@/components/dashboard/header'

export default async function PublisherDashboardPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const supabase = await createClient()

  // Check if user has publisher profile
  const { data: publisher } = await supabase
    .from('publishers')
    .select('publisher_id, name, status')
    .eq('user_id', user.id)
    .single()

  if (!publisher) {
    redirect('/dashboard/publisher/setup')
  }

  // Fetch apps with placement counts
  const { data: apps } = await supabase
    .from('apps')
    .select(`
      app_id,
      name,
      bundle_identifier,
      status,
      created_at,
      placements(count)
    `)
    .eq('publisher_id', publisher.publisher_id)
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
          <h1 className="text-3xl font-bold">Publisher Dashboard</h1>
        </div>
        <p className="text-muted-foreground mb-8 ml-9">
          {publisher.name} &middot; Manage your apps and placements.
        </p>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Apps</h2>
          <Button asChild>
            <Link href="/dashboard/publisher/apps/new">
              <Plus className="h-4 w-4 mr-2" />
              Add App
            </Link>
          </Button>
        </div>

        {apps && apps.length > 0 ? (
          <div className="grid gap-4">
            {apps.map((app) => (
              <Card key={app.app_id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{app.name}</CardTitle>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                      {app.status}
                    </span>
                  </div>
                  <CardDescription>
                    {app.bundle_identifier} &middot; {(app.placements as any)?.[0]?.count || 0} placements
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/publisher/apps/${app.app_id}`}>
                      Manage Placements
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
                You haven&apos;t added any apps yet.
              </p>
              <Button asChild>
                <Link href="/dashboard/publisher/apps/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First App
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}

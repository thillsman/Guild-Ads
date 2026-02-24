import { redirect } from 'next/navigation'
import { createAdminClient, getAuthUser } from '@/lib/supabase/server'
import { DashboardHeader } from '@/components/dashboard/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InternalBillingControls } from './internal-billing-controls'

export default async function InternalBillingPage() {
  const user = await getAuthUser()
  if (!user) {
    redirect('/login')
  }

  const supabase = createAdminClient()
  const { data: policy } = await (supabase as any)
    .from('internal_account_policies')
    .select('active, can_manage_internal')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!policy || policy.active !== true || policy.can_manage_internal !== true) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen">
      <DashboardHeader user={user} />
      <main className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Internal Billing Controls</CardTitle>
            <CardDescription>
              Manage internal account policies and promotional credit grants.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InternalBillingControls />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}


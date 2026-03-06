export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { AdminNav } from '@/components/admin/admin-nav'
import { AllUsersAdmin } from '@/components/admin/all-users-admin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { isHardcodedAdminUser } from '@/lib/admin/access'
import { getAdminUserDirectory } from '@/lib/admin/user-directory'
import { createAdminClient, getAuthUser } from '@/lib/supabase/server'

export default async function AdminAllUsersPage() {
  const user = await getAuthUser()
  if (!user) {
    redirect('/login')
  }

  if (!isHardcodedAdminUser(user.id)) {
    redirect('/dashboard')
  }

  const supabase = createAdminClient()
  const users = await getAdminUserDirectory(supabase)
  const totalApps = users.reduce((sum, entry) => sum + entry.totals.appCount, 0)
  const totalBookedCents = users.reduce((sum, entry) => sum + entry.totals.bookedSpendCents, 0)
  const totalCashSpendCents = users.reduce((sum, entry) => sum + entry.totals.cashSpendCents, 0)
  const totalEarningsCents = users.reduce((sum, entry) => sum + entry.totals.publisherEarningsCents, 0)
  const totalBonusCreditsCents = users.reduce((sum, entry) => sum + entry.totals.publisherBonusCreditsCents, 0)

  return (
    <main className="space-y-8">
      <div className="space-y-3">
        <div>
          <h1 className="text-3xl font-bold">Admin</h1>
          <p className="mt-1 text-muted-foreground">
            User-level accounting, credits, and payout controls.
          </p>
        </div>
        <AdminNav />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            Auth users, their apps, booked value, cash spend, credits, publisher earnings, bonus credits, and payout status.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <div className="rounded-lg bg-muted/40 p-4">
            <p className="text-sm text-muted-foreground">Users</p>
            <p className="mt-1 text-3xl font-bold">{users.length.toLocaleString()}</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-4">
            <p className="text-sm text-muted-foreground">Apps</p>
            <p className="mt-1 text-3xl font-bold">{totalApps.toLocaleString()}</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-4">
            <p className="text-sm text-muted-foreground">Booked Value</p>
            <p className="mt-1 text-3xl font-bold">
              ${(totalBookedCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="rounded-lg bg-muted/40 p-4">
            <p className="text-sm text-muted-foreground">Cash Spend</p>
            <p className="mt-1 text-3xl font-bold">
              ${(totalCashSpendCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="rounded-lg bg-muted/40 p-4">
            <p className="text-sm text-muted-foreground">Publisher Earnings</p>
            <p className="mt-1 text-3xl font-bold">
              ${(totalEarningsCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="rounded-lg bg-muted/40 p-4">
            <p className="text-sm text-muted-foreground">Bonus Credits</p>
            <p className="mt-1 text-3xl font-bold">
              ${(totalBonusCreditsCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </CardContent>
      </Card>

      <AllUsersAdmin users={users} />
    </main>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { AdminUserDirectoryUser } from '@/lib/admin/user-directory'

interface AllUsersAdminProps {
  users: AdminUserDirectoryUser[]
}

interface CreditFormState {
  amountCents: number
  expiresInDays: number
  notes: string
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`
}

function formatDate(value: string | null): string {
  if (!value) {
    return '-'
  }

  return new Date(value).toLocaleDateString()
}

function formatWeekRange(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00Z`)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 6)

  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}`
}

function payoutStatusClass(status: string): string {
  if (status === 'paid') {
    return 'bg-green-500/10 text-green-700'
  }

  if (status === 'eligible') {
    return 'bg-blue-500/10 text-blue-700'
  }

  if (status === 'accrued') {
    return 'bg-amber-500/10 text-amber-700'
  }

  return 'bg-muted text-muted-foreground'
}

function connectStatusLabel(user: AdminUserDirectoryUser): string {
  if (!user.connectAccount) {
    return 'No Stripe Connect account'
  }

  if (user.connectAccount.payoutsEnabled) {
    return `Payouts enabled (${user.connectAccount.stripeAccountId})`
  }

  if (user.connectAccount.detailsSubmitted) {
    return `Connect incomplete (${user.connectAccount.stripeAccountId})`
  }

  return `Onboarding not finished (${user.connectAccount.stripeAccountId})`
}

export function AllUsersAdmin({ users }: AllUsersAdminProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [activeActionId, setActiveActionId] = useState<string | null>(null)
  const [creditForms, setCreditForms] = useState<Record<string, CreditFormState>>(() =>
    Object.fromEntries(
      users.map((user) => [
        user.userId,
        {
          amountCents: 2500,
          expiresInDays: 30,
          notes: '',
        },
      ])
    )
  )
  const [creditMessages, setCreditMessages] = useState<Record<string, string>>({})
  const [creditErrors, setCreditErrors] = useState<Record<string, string>>({})
  const [payoutSelections, setPayoutSelections] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      users.flatMap((user) => user.payoutRows.map((row) => [row.earningId, row.payoutStatus]))
    )
  )
  const [payoutMessages, setPayoutMessages] = useState<Record<string, string>>({})
  const [payoutErrors, setPayoutErrors] = useState<Record<string, string>>({})

  const updateCreditForm = (userId: string, patch: Partial<CreditFormState>) => {
    setCreditForms((current) => ({
      ...current,
      [userId]: {
        ...(current[userId] ?? { amountCents: 2500, expiresInDays: 30, notes: '' }),
        ...patch,
      },
    }))
  }

  const submitCredits = (userId: string) => {
    const form = creditForms[userId] ?? { amountCents: 2500, expiresInDays: 30, notes: '' }

    setActiveActionId(`credit:${userId}`)
    setCreditErrors((current) => ({ ...current, [userId]: '' }))
    setCreditMessages((current) => ({ ...current, [userId]: '' }))

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch('/api/billing/internal/grants', {
            body: JSON.stringify({
              amountCents: form.amountCents,
              expiresInDays: form.expiresInDays,
              notes: form.notes.trim() || null,
              userId,
            }),
            headers: { 'Content-Type': 'application/json' },
            method: 'POST',
          })

          const payload = await response.json()
          if (!response.ok) {
            throw new Error(payload?.error ?? 'Failed to grant credits.')
          }

          setCreditMessages((current) => ({ ...current, [userId]: 'Credits added.' }))
          router.refresh()
        } catch (error) {
          setCreditErrors((current) => ({
            ...current,
            [userId]: error instanceof Error ? error.message : 'Failed to grant credits.',
          }))
        } finally {
          setActiveActionId(null)
        }
      })()
    })
  }

  const submitPayoutStatus = (earningId: string) => {
    const payoutStatus = payoutSelections[earningId]
    if (!payoutStatus) {
      return
    }

    setActiveActionId(`payout:${earningId}`)
    setPayoutErrors((current) => ({ ...current, [earningId]: '' }))
    setPayoutMessages((current) => ({ ...current, [earningId]: '' }))

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/admin/publisher-earnings/${earningId}`, {
            body: JSON.stringify({ payoutStatus }),
            headers: { 'Content-Type': 'application/json' },
            method: 'PATCH',
          })

          const payload = await response.json()
          if (!response.ok) {
            throw new Error(payload?.error ?? 'Failed to update payout status.')
          }

          setPayoutMessages((current) => ({ ...current, [earningId]: 'Payout status updated.' }))
          router.refresh()
        } catch (error) {
          setPayoutErrors((current) => ({
            ...current,
            [earningId]: error instanceof Error ? error.message : 'Failed to update payout status.',
          }))
        } finally {
          setActiveActionId(null)
        }
      })()
    })
  }

  return (
    <div className="space-y-6">
      {users.map((user) => (
        <Card key={user.userId}>
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>{user.email}</CardTitle>
                <CardDescription className="mt-1 break-all">
                  {user.userId}
                </CardDescription>
                <p className="mt-2 text-sm text-muted-foreground">
                  Joined {formatDate(user.createdAt)} · Last sign-in {formatDate(user.lastSignInAt)}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                {connectStatusLabel(user)}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Apps</p>
                <p className="mt-1 text-lg font-semibold">{user.totals.appCount.toLocaleString()}</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Paid To Advertise</p>
                <p className="mt-1 text-lg font-semibold">{formatCurrency(user.totals.advertiserSpendCents)}</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Earned As Publisher</p>
                <p className="mt-1 text-lg font-semibold">{formatCurrency(user.totals.publisherEarningsCents)}</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Still Owed</p>
                <p className="mt-1 text-lg font-semibold">{formatCurrency(user.totals.unpaidPayoutCents)}</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Already Paid Out</p>
                <p className="mt-1 text-lg font-semibold">{formatCurrency(user.totals.paidOutCents)}</p>
              </div>
            </div>

            <section className="space-y-3">
              <div>
                <h2 className="text-lg font-semibold">Apps</h2>
                <p className="text-sm text-muted-foreground">
                  Per-app advertiser spend and publisher earnings totals.
                </p>
              </div>

              {user.apps.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-2 pr-3 font-medium">App</th>
                        <th className="py-2 pr-3 font-medium">Bundle ID</th>
                        <th className="py-2 pr-3 font-medium">Paid To Advertise</th>
                        <th className="py-2 font-medium">Earned As Publisher</th>
                      </tr>
                    </thead>
                    <tbody>
                      {user.apps.map((app) => (
                        <tr key={app.appId} className="border-b last:border-0">
                          <td className="py-2 pr-3 font-medium">{app.name}</td>
                          <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">{app.bundleIdentifier}</td>
                          <td className="py-2 pr-3">{formatCurrency(app.advertiserSpendCents)}</td>
                          <td className="py-2">{formatCurrency(app.publisherEarningsCents)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No apps yet.</p>
              )}
            </section>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
              <section className="space-y-3">
                <div>
                  <h2 className="text-lg font-semibold">Add Credits</h2>
                  <p className="text-sm text-muted-foreground">
                    Creates a promo credit grant for this user.
                  </p>
                </div>

                <div className="space-y-3 rounded-xl border p-4">
                  <div className="space-y-2">
                    <Label htmlFor={`credits-amount-${user.userId}`}>Amount (cents)</Label>
                    <Input
                      id={`credits-amount-${user.userId}`}
                      min={1}
                      onChange={(event) => updateCreditForm(user.userId, { amountCents: Number(event.target.value) })}
                      type="number"
                      value={creditForms[user.userId]?.amountCents ?? 2500}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`credits-days-${user.userId}`}>Expires In (days)</Label>
                    <Input
                      id={`credits-days-${user.userId}`}
                      min={1}
                      onChange={(event) => updateCreditForm(user.userId, { expiresInDays: Number(event.target.value) })}
                      type="number"
                      value={creditForms[user.userId]?.expiresInDays ?? 30}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`credits-notes-${user.userId}`}>Notes</Label>
                    <Input
                      id={`credits-notes-${user.userId}`}
                      onChange={(event) => updateCreditForm(user.userId, { notes: event.target.value })}
                      placeholder="Optional note"
                      value={creditForms[user.userId]?.notes ?? ''}
                    />
                  </div>
                  <Button
                    disabled={isPending || activeActionId === `credit:${user.userId}` || (creditForms[user.userId]?.amountCents ?? 0) <= 0}
                    onClick={() => submitCredits(user.userId)}
                  >
                    Add Credits
                  </Button>
                  {creditMessages[user.userId] && (
                    <p className="text-sm text-muted-foreground">{creditMessages[user.userId]}</p>
                  )}
                  {creditErrors[user.userId] && (
                    <p className="text-sm text-destructive">{creditErrors[user.userId]}</p>
                  )}
                </div>
              </section>

              <section className="space-y-3">
                <div>
                  <h2 className="text-lg font-semibold">Manual Payout Management</h2>
                  <p className="text-sm text-muted-foreground">
                    Update publisher weekly payout bookkeeping. Marking a row paid here assumes you paid it outside the automatic Stripe payout job.
                  </p>
                </div>

                {user.payoutRows.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[980px] text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="py-2 pr-3 font-medium">Week</th>
                          <th className="py-2 pr-3 font-medium">App</th>
                          <th className="py-2 pr-3 font-medium">Gross Earned</th>
                          <th className="py-2 pr-3 font-medium">Net Due</th>
                          <th className="py-2 pr-3 font-medium">Status</th>
                          <th className="py-2 pr-3 font-medium">Timing</th>
                          <th className="py-2 pr-3 font-medium">Update</th>
                          <th className="py-2 font-medium">Apply</th>
                        </tr>
                      </thead>
                      <tbody>
                        {user.payoutRows.map((row) => {
                          const isRowPaid = row.payoutStatus === 'paid'
                          const selection = payoutSelections[row.earningId] ?? row.payoutStatus

                          return (
                            <tr key={row.earningId} className="border-b align-top last:border-0">
                              <td className="py-2 pr-3">{formatWeekRange(row.weekStart)}</td>
                              <td className="py-2 pr-3 font-medium">{row.appName}</td>
                              <td className="py-2 pr-3">
                                {formatCurrency(row.grossEarningsCents)}
                                {row.convertedCents > 0 && (
                                  <p className="text-xs text-muted-foreground">
                                    {formatCurrency(row.convertedCents)} converted to credits
                                  </p>
                                )}
                              </td>
                              <td className="py-2 pr-3">{formatCurrency(row.netPayoutCents)}</td>
                              <td className="py-2 pr-3">
                                <span className={cn('inline-flex items-center rounded-full px-2 py-1 text-xs', payoutStatusClass(row.payoutStatus))}>
                                  {row.payoutStatus.replaceAll('_', ' ')}
                                </span>
                              </td>
                              <td className="py-2 pr-3 text-muted-foreground">
                                {row.paidAt
                                  ? `Paid ${formatDate(row.paidAt)}`
                                  : `Hold until ${formatDate(row.holdUntil)}`}
                              </td>
                              <td className="py-2 pr-3">
                                {isRowPaid ? (
                                  <p className="text-xs text-muted-foreground">Already paid</p>
                                ) : (
                                  <select
                                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                                    onChange={(event) => setPayoutSelections((current) => ({
                                      ...current,
                                      [row.earningId]: event.target.value,
                                    }))}
                                    value={selection}
                                  >
                                    <option value="accrued">Accrued</option>
                                    <option value="eligible">Eligible</option>
                                    <option value="carried_forward">Carried forward</option>
                                    <option value="paid">Paid manually</option>
                                  </select>
                                )}
                                {payoutMessages[row.earningId] && (
                                  <p className="mt-1 text-xs text-muted-foreground">{payoutMessages[row.earningId]}</p>
                                )}
                                {payoutErrors[row.earningId] && (
                                  <p className="mt-1 text-xs text-destructive">{payoutErrors[row.earningId]}</p>
                                )}
                              </td>
                              <td className="py-2">
                                <Button
                                  disabled={
                                    isPending
                                    || isRowPaid
                                    || activeActionId === `payout:${row.earningId}`
                                    || selection === row.payoutStatus
                                  }
                                  onClick={() => submitPayoutStatus(row.earningId)}
                                  size="sm"
                                  variant="outline"
                                >
                                  Apply
                                </Button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No publisher payout rows for this user yet.</p>
                )}
              </section>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

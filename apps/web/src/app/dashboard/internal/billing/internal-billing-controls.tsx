'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function InternalBillingControls() {
  const [policyUserID, setPolicyUserID] = useState('')
  const [grantUserID, setGrantUserID] = useState('')
  const [grantAmount, setGrantAmount] = useState(2500)
  const [grantDays, setGrantDays] = useState(30)
  const [active, setActive] = useState(true)
  const [canBypassCheckout, setCanBypassCheckout] = useState(false)
  const [noFillExempt, setNoFillExempt] = useState(false)
  const [canManageInternal, setCanManageInternal] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const submitPolicy = async () => {
    setError(null)
    setStatus(null)

    const res = await fetch('/api/billing/internal/policies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: policyUserID,
        active,
        canBypassCheckout,
        noFillExempt,
        canManageInternal,
      }),
    })
    const payload = await res.json()

    if (!res.ok) {
      setError(payload?.error ?? 'Failed to save policy.')
      return
    }

    setStatus('Policy saved.')
  }

  const submitGrant = async () => {
    setError(null)
    setStatus(null)

    const res = await fetch('/api/billing/internal/grants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: grantUserID,
        amountCents: grantAmount,
        expiresInDays: grantDays,
      }),
    })
    const payload = await res.json()

    if (!res.ok) {
      setError(payload?.error ?? 'Failed to grant credits.')
      return
    }

    setStatus('Credit grant created.')
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Account Policy</h2>
        <div className="space-y-2">
          <Label htmlFor="policy-user-id">Target User ID</Label>
          <Input
            id="policy-user-id"
            value={policyUserID}
            onChange={(event) => setPolicyUserID(event.target.value)}
            placeholder="UUID"
          />
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
            Active
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={canBypassCheckout}
              onChange={(event) => setCanBypassCheckout(event.target.checked)}
            />
            Can bypass checkout
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={noFillExempt}
              onChange={(event) => setNoFillExempt(event.target.checked)}
            />
            No-fill exempt
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={canManageInternal}
              onChange={(event) => setCanManageInternal(event.target.checked)}
            />
            Can manage internal controls
          </label>
        </div>
        <Button onClick={submitPolicy} disabled={!policyUserID.trim()}>
          Save Policy
        </Button>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Promo Credit Grant</h2>
        <div className="space-y-2">
          <Label htmlFor="grant-user-id">Target User ID</Label>
          <Input
            id="grant-user-id"
            value={grantUserID}
            onChange={(event) => setGrantUserID(event.target.value)}
            placeholder="UUID"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="grant-amount">Amount (cents)</Label>
            <Input
              id="grant-amount"
              type="number"
              min={1}
              value={grantAmount}
              onChange={(event) => setGrantAmount(Number(event.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="grant-days">Expires In (days)</Label>
            <Input
              id="grant-days"
              type="number"
              min={1}
              value={grantDays}
              onChange={(event) => setGrantDays(Number(event.target.value))}
            />
          </div>
        </div>
        <Button onClick={submitGrant} disabled={!grantUserID.trim() || grantAmount <= 0}>
          Grant Credits
        </Button>
      </section>

      {status && (
        <p className="text-sm text-muted-foreground">{status}</p>
      )}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}


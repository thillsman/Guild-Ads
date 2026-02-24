'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface ConnectStatus {
  connected: boolean
  stripeAccountId: string | null
  detailsSubmitted: boolean
  chargesEnabled: boolean
  payoutsEnabled: boolean
}

interface ConnectOnboardingCardProps {
  initialStatus: ConnectStatus
  returnPath: string
}

export function ConnectOnboardingCard({ initialStatus, returnPath }: ConnectOnboardingCardProps) {
  const [status, setStatus] = useState<ConnectStatus>(initialStatus)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshStatus = async () => {
    setPending(true)
    setError(null)

    try {
      const response = await fetch('/api/billing/publisher/connect/status', {
        cache: 'no-store',
      })
      const payload = await response.json()

      if (!response.ok) {
        setError(payload?.error ?? 'Failed to refresh Stripe Connect status.')
        return
      }

      setStatus({
        connected: payload.connected === true,
        stripeAccountId: typeof payload.stripeAccountId === 'string' ? payload.stripeAccountId : null,
        detailsSubmitted: payload.detailsSubmitted === true,
        chargesEnabled: payload.chargesEnabled === true,
        payoutsEnabled: payload.payoutsEnabled === true,
      })
    } catch {
      setError('Failed to refresh Stripe Connect status.')
    } finally {
      setPending(false)
    }
  }

  const startOnboarding = async () => {
    setPending(true)
    setError(null)

    try {
      const response = await fetch('/api/billing/publisher/connect/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnPath }),
      })
      const payload = await response.json()

      if (!response.ok || typeof payload?.onboardingURL !== 'string') {
        setError(payload?.error ?? 'Failed to launch Stripe Connect onboarding.')
        return
      }

      window.location.href = payload.onboardingURL
    } catch {
      setError('Failed to launch Stripe Connect onboarding.')
    } finally {
      setPending(false)
    }
  }

  const primaryLabel = status.payoutsEnabled
    ? 'Review Stripe payout account'
    : (status.connected ? 'Continue Stripe onboarding' : 'Set up Stripe Connect')

  return (
    <div className="rounded-lg border p-3 text-sm space-y-3">
      <p className="font-medium">Stripe Connect</p>

      {status.connected ? (
        <div className="text-muted-foreground space-y-1">
          <p>
            Account: <span className="font-mono text-xs">{status.stripeAccountId ?? '-'}</span>
          </p>
          <p>Details submitted: {status.detailsSubmitted ? 'Yes' : 'No'}</p>
          <p>Charges enabled: {status.chargesEnabled ? 'Yes' : 'No'}</p>
          <p>Payouts enabled: {status.payoutsEnabled ? 'Yes' : 'No'}</p>
        </div>
      ) : (
        <p className="text-muted-foreground">
          Connect Stripe to receive monthly publisher payouts.
        </p>
      )}

      {!status.payoutsEnabled && (
        <p className="text-xs text-muted-foreground">
          Payouts are skipped until your Stripe Connect account has payouts enabled.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button onClick={startOnboarding} disabled={pending}>
          {primaryLabel}
        </Button>
        <Button variant="outline" onClick={refreshStatus} disabled={pending}>
          Refresh Status
        </Button>
      </div>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}

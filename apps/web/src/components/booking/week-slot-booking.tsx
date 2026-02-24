'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SpinnerGap, CalendarCheck, Users, CurrencyDollar, Info, Plus, CaretDown } from '@phosphor-icons/react'

interface Campaign {
  campaign_id: string
  name: string
  headline: string
}

interface WeekSlotBookingProps {
  weekStart: string
  slotId: string
  basePriceCents: number
  totalUsersEstimate: number
  purchasedPercentage: number
  availablePercentage: number
  userPurchasedPercentage?: number
  campaigns?: Campaign[]
  appId?: string
  compact?: boolean
  isNextWeek?: boolean
}

export function WeekSlotBooking({
  weekStart,
  slotId,
  basePriceCents,
  totalUsersEstimate,
  purchasedPercentage,
  availablePercentage,
  userPurchasedPercentage = 0,
  campaigns = [],
  appId,
  compact = false,
  isNextWeek = false,
}: WeekSlotBookingProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [percentage, setPercentage] = useState(10)
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('')
  const [showCampaignSelect, setShowCampaignSelect] = useState(false)
  const [applyCredits, setApplyCredits] = useState(true)
  const [bookingIntentID, setBookingIntentID] = useState<string | null>(null)
  const [bookingStatus, setBookingStatus] = useState<string | null>(null)
  const [spendableCreditsCents, setSpendableCreditsCents] = useState(0)
  const [latestCreditsAppliedCents, setLatestCreditsAppliedCents] = useState<number | null>(null)
  const [latestCashDueCents, setLatestCashDueCents] = useState<number | null>(null)
  const [booking, setBooking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Max 40% per advertiser, but also can't exceed available
  const maxPercentage = Math.min(40 - userPurchasedPercentage, availablePercentage)
  const minPercentage = 1

  // Price adjustment factors based on previous week's sell-through
  const MIN_PRICE_FACTOR = 0.9
  const MAX_PRICE_FACTOR = 1.1

  // Calculate cost and reach
  const costCents = Math.round((basePriceCents * percentage) / 100)
  const costDollars = (costCents / 100).toFixed(2)
  const estimatedUsers = Math.round((totalUsersEstimate * percentage) / 100)

  // For future weeks, show price range
  const minCostCents = Math.round((basePriceCents * MIN_PRICE_FACTOR * percentage) / 100)
  const maxCostCents = Math.round((basePriceCents * MAX_PRICE_FACTOR * percentage) / 100)
  const minCostDollars = (minCostCents / 100).toFixed(2)
  const maxCostDollars = (maxCostCents / 100).toFixed(2)

  // Format week date
  const weekDate = new Date(weekStart + 'T00:00:00')
  const weekEndDate = new Date(weekDate)
  weekEndDate.setDate(weekEndDate.getDate() + 6)

  const formatDate = (date: Date) => date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })

  useEffect(() => {
    const intentID = searchParams.get('booking_intent')
    if (intentID) {
      setBookingIntentID(intentID)
    }
  }, [searchParams])

  useEffect(() => {
    let cancelled = false

    async function fetchCredits() {
      try {
        const res = await fetch('/api/billing/credits/balance', { cache: 'no-store' })
        if (!res.ok) return
        const payload = await res.json()
        if (cancelled) return
        if (typeof payload?.spendableCents === 'number') {
          setSpendableCreditsCents(payload.spendableCents)
        }
      } catch {
        // Ignore credit fetch errors.
      }
    }

    fetchCredits()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!bookingIntentID) {
      return
    }

    let cancelled = false
    let intervalID: ReturnType<typeof setInterval> | null = null

    async function pollIntent() {
      try {
        const res = await fetch(`/api/billing/booking-intents/${bookingIntentID}`, {
          cache: 'no-store',
        })
        if (!res.ok) {
          return
        }

        const payload = await res.json()
        if (cancelled) {
          return
        }

        if (typeof payload?.status === 'string') {
          setBookingStatus(payload.status)
          if (payload.status === 'confirmed') {
            router.refresh()
            if (intervalID) {
              clearInterval(intervalID)
              intervalID = null
            }
          }
          if (['failed', 'expired', 'refunded_capacity_conflict', 'canceled'].includes(payload.status)) {
            if (intervalID) {
              clearInterval(intervalID)
              intervalID = null
            }
          }
        }
      } catch {
        // Ignore poll errors and retry.
      }
    }

    pollIntent()
    intervalID = setInterval(pollIntent, 2500)

    return () => {
      cancelled = true
      if (intervalID) {
        clearInterval(intervalID)
      }
    }
  }, [bookingIntentID, router])

  const bookSlot = async () => {
    if (!selectedCampaignId) {
      setShowCampaignSelect(true)
      return
    }

    if (!isNextWeek) {
      setError('Only next week bookings are purchasable right now.')
      return
    }

    setBooking(true)
    setError(null)
    setBookingStatus('processing')

    try {
      const createIntentRes = await fetch('/api/billing/booking-intents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: selectedCampaignId,
          slotId,
          percentage,
          applyCredits,
        }),
      })

      const createIntentPayload = await createIntentRes.json()
      if (!createIntentRes.ok || typeof createIntentPayload.bookingIntentId !== 'string') {
        setError(createIntentPayload?.error ?? 'Failed to create booking intent.')
        setBookingStatus('failed')
        return
      }

      const intentID = createIntentPayload.bookingIntentId as string
      setBookingIntentID(intentID)
      setBookingStatus(typeof createIntentPayload.status === 'string' ? createIntentPayload.status : 'processing')
      setLatestCreditsAppliedCents(
        typeof createIntentPayload.creditsAppliedCents === 'number'
          ? createIntentPayload.creditsAppliedCents
          : null
      )
      setLatestCashDueCents(
        typeof createIntentPayload.cashDueCents === 'number'
          ? createIntentPayload.cashDueCents
          : null
      )

      if (createIntentPayload.requiresCheckout === true) {
        const checkoutRes = await fetch(`/api/billing/booking-intents/${intentID}/checkout`, {
          method: 'POST',
        })
        const checkoutPayload = await checkoutRes.json()

        if (!checkoutRes.ok || typeof checkoutPayload.checkoutURL !== 'string') {
          setError(checkoutPayload?.error ?? 'Failed to launch checkout.')
          setBookingStatus('failed')
          return
        }

        setBookingStatus('awaiting_payment')
        window.location.href = checkoutPayload.checkoutURL
        return
      }

        setShowCampaignSelect(false)
        setSelectedCampaignId('')
        const creditsAfterBooking = spendableCreditsCents - (typeof createIntentPayload.creditsAppliedCents === 'number' ? createIntentPayload.creditsAppliedCents : 0)
        setSpendableCreditsCents(Math.max(0, creditsAfterBooking))
      if (createIntentPayload.status === 'confirmed') {
        setBookingStatus('confirmed')
        router.refresh()
      }
    } catch {
      setError('Failed to book slot. Please try again.')
      setBookingStatus('failed')
    } finally {
      setBooking(false)
    }
  }

  if (compact) {
    return (
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Book for {formatDate(weekDate)} - {formatDate(weekEndDate)}</p>
              <p className="text-sm text-muted-foreground">
                ${(basePriceCents / 100).toLocaleString()} for 100% · {totalUsersEstimate.toLocaleString()} users
              </p>
            </div>
            <Button asChild>
              <a href={`/dashboard/book?week=${weekStart}`}>
                Book Now
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Calculate others' percentage (total purchased minus user's)
  const othersPurchasedPercentage = purchasedPercentage - userPurchasedPercentage

  return (
    <Card className={isNextWeek ? 'border-primary/50' : ''}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-5 w-5 text-primary" />
          <CardTitle className="flex items-center gap-2">
            Book for {formatDate(weekDate)} - {formatDate(weekEndDate)}
            {isNextWeek && (
              <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-normal">
                NEXT WEEK
              </span>
            )}
          </CardTitle>
        </div>
        <CardDescription>
          {isNextWeek
            ? 'Reserve ad spots across the entire Guild network for next week'
            : `Book ahead for the week of ${formatDate(weekDate)}`
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Network Stats */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Network Price</p>
            <p className="text-2xl font-bold">${(basePriceCents / 100).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">for 100% of impressions</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Estimated Reach</p>
            <p className="text-2xl font-bold">{totalUsersEstimate.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">unique users</p>
          </div>
        </div>

        {/* Availability Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Network Availability</span>
            <span className={availablePercentage < 30 ? 'text-amber-600' : ''}>{availablePercentage}% available</span>
          </div>
          <div className="h-4 bg-muted rounded-full overflow-hidden flex">
            {othersPurchasedPercentage > 0 && (
              <div
                className="h-full bg-muted-foreground/40"
                style={{ width: `${othersPurchasedPercentage}%` }}
                title="Purchased by other advertisers"
              />
            )}
            {userPurchasedPercentage > 0 && (
              <div
                className="h-full bg-primary/50"
                style={{ width: `${userPurchasedPercentage}%` }}
                title="Your existing bookings"
              />
            )}
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${percentage}%` }}
              title="Your selection"
            />
            <div
              className="h-full bg-green-500/20"
              style={{ width: `${Math.max(0, availablePercentage - percentage)}%` }}
              title="Still available"
            />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {othersPurchasedPercentage > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-muted-foreground/40" /> Other advertisers ({othersPurchasedPercentage}%)
              </span>
            )}
            {userPurchasedPercentage > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-primary/50" /> Your bookings ({userPurchasedPercentage}%)
              </span>
            )}
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-primary" /> New selection ({percentage}%)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-green-500/20" /> Available ({Math.max(0, availablePercentage - percentage)}%)
            </span>
          </div>
        </div>

        {/* Slider */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium">Select your share</label>
            <span className="text-sm text-muted-foreground">Max 40% per advertiser</span>
          </div>
          <input
            type="range"
            min={minPercentage}
            max={maxPercentage}
            value={percentage}
            onChange={(e) => setPercentage(parseInt(e.target.value))}
            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-sm">
            <span>{minPercentage}%</span>
            <span className="font-bold text-lg">{percentage}%</span>
            <span>{maxPercentage}%</span>
          </div>
        </div>

        {/* Cost & Reach Summary */}
        <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <CurrencyDollar className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">
                {isNextWeek ? 'Your Cost' : 'Estimated Cost'}
              </p>
              {isNextWeek ? (
                <p className="text-2xl font-bold">${costDollars}</p>
              ) : (
                <p className="text-xl font-bold">${minCostDollars} - ${maxCostDollars}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Est. Reach</p>
              <p className="text-2xl font-bold">{estimatedUsers.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="p-4 border rounded-lg text-sm space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={applyCredits}
              onChange={(event) => setApplyCredits(event.target.checked)}
              disabled={booking || !isNextWeek}
            />
            <span>Apply credits before card payment</span>
          </label>
          <p className="text-xs text-muted-foreground">
            Credits are applied first. Any remainder is paid via Stripe checkout.
          </p>
          <p className="text-xs text-muted-foreground">
            Spendable credits: <span className="font-medium text-foreground">${(spendableCreditsCents / 100).toFixed(2)}</span>
          </p>
          {latestCreditsAppliedCents !== null && latestCashDueCents !== null && (
            <p className="text-xs text-muted-foreground">
              Last quote: credits applied <span className="font-medium text-foreground">${(latestCreditsAppliedCents / 100).toFixed(2)}</span>{' '}
              · cash due <span className="font-medium text-foreground">${(latestCashDueCents / 100).toFixed(2)}</span>
            </p>
          )}
        </div>

        {/* Pricing Info */}
        <div className="p-4 bg-muted/50 rounded-lg text-sm space-y-3">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-foreground">Transparent Dynamic Pricing</p>
              <p className="text-muted-foreground mt-1">
                {isNextWeek
                  ? "This week's price is locked in. Book now at the current rate."
                  : "Future week prices adjust based on how the previous week sells."
                }
              </p>
            </div>
          </div>
          {!isNextWeek && (
            <div className="pl-6 pt-2 border-t border-muted space-y-1 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">How prices adjust:</p>
              <ul className="space-y-0.5">
                <li>• If ≥90% sells → price increases 10%</li>
                <li>• If ≥70% sells → price increases 5%</li>
                <li>• If &lt;50% sells → price decreases 5%</li>
                <li>• If &lt;30% sells → price decreases 10%</li>
              </ul>
            </div>
          )}
        </div>

        {/* Campaign Selection */}
        {showCampaignSelect && (
          <div className="p-4 border rounded-lg space-y-3">
            <p className="font-medium">Select a campaign to book</p>
            {campaigns.length > 0 ? (
              <div className="space-y-2">
                {campaigns.map((campaign) => (
                  <button
                    key={campaign.campaign_id}
                    onClick={() => setSelectedCampaignId(campaign.campaign_id)}
                    className={`w-full p-3 rounded-lg text-left border transition-colors ${
                      selectedCampaignId === campaign.campaign_id
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-muted-foreground/30'
                    }`}
                  >
                    <p className="font-medium">{campaign.name}</p>
                    <p className="text-sm text-muted-foreground">{campaign.headline}</p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No campaigns yet.</p>
            )}
            <Button asChild variant="outline" className="w-full">
              <Link href={`/dashboard/apps/${appId}/advertise/new`}>
                <Plus className="h-4 w-4 mr-2" />
                Create New Campaign
              </Link>
            </Button>
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {bookingStatus && (
          <p className="text-sm text-muted-foreground">
            Booking status: <span className="font-medium text-foreground">{bookingStatus.replaceAll('_', ' ')}</span>
          </p>
        )}

        <Button
          onClick={bookSlot}
          disabled={booking || maxPercentage < 1 || (showCampaignSelect && !selectedCampaignId) || !isNextWeek}
          className="w-full"
          size="lg"
        >
          {booking ? (
            <>
              <SpinnerGap className="h-4 w-4 mr-2 animate-spin" />
              Booking...
            </>
          ) : !isNextWeek ? (
            'Planning Only (Next Week Purchases Only)'
          ) : maxPercentage < 1 ? (
            'Sold Out'
          ) : showCampaignSelect && selectedCampaignId ? (
            isNextWeek ? (
              `Book ${percentage}% for $${costDollars}`
            ) : (
              `Reserve ${percentage}% (~$${minCostDollars}-$${maxCostDollars})`
            )
          ) : (
            <>
              {isNextWeek ? `Book ${percentage}% for $${costDollars}` : `Reserve ${percentage}%`}
              <CaretDown className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

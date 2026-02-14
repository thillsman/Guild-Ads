'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SpinnerGap, CalendarCheck, Users, CurrencyDollar, Info } from '@phosphor-icons/react'

interface WeekSlotBookingProps {
  weekStart: string
  basePriceCents: number
  totalUsersEstimate: number
  purchasedPercentage: number
  availablePercentage: number
  userPurchasedPercentage?: number
  campaignId?: string
  appId?: string
  compact?: boolean
}

export function WeekSlotBooking({
  weekStart,
  basePriceCents,
  totalUsersEstimate,
  purchasedPercentage,
  availablePercentage,
  userPurchasedPercentage = 0,
  campaignId,
  appId,
  compact = false,
}: WeekSlotBookingProps) {
  const router = useRouter()
  const [percentage, setPercentage] = useState(10)
  const [booking, setBooking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Max 40% per advertiser, but also can't exceed available
  const maxPercentage = Math.min(40 - userPurchasedPercentage, availablePercentage)
  const minPercentage = 1

  // Calculate cost and reach
  const costCents = Math.round((basePriceCents * percentage) / 100)
  const costDollars = (costCents / 100).toFixed(2)
  const estimatedUsers = Math.round((totalUsersEstimate * percentage) / 100)

  // Format week date
  const weekDate = new Date(weekStart + 'T00:00:00')
  const weekEndDate = new Date(weekDate)
  weekEndDate.setDate(weekEndDate.getDate() + 6)

  const formatDate = (date: Date) => date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })

  const bookSlot = async () => {
    if (!campaignId) {
      // Redirect to create campaign first
      router.push(`/dashboard/apps/${appId}/advertise/new?booking=${percentage}`)
      return
    }

    setBooking(true)
    setError(null)

    try {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('You must be logged in to book.')
        return
      }

      // Get the slot_id for this week
      const { data: slot } = await supabase
        .from('weekly_slots')
        .select('slot_id')
        .eq('week_start', weekStart)
        .single()

      if (!slot) {
        setError('Slot not found for this week.')
        return
      }

      const { error: insertError } = await supabase.from('slot_purchases').insert({
        slot_id: slot.slot_id,
        user_id: user.id,
        campaign_id: campaignId,
        percentage_purchased: percentage,
        price_cents: costCents,
        status: 'confirmed',
      })

      if (insertError) {
        setError(insertError.message)
        return
      }

      router.refresh()
    } catch (err) {
      setError('Failed to book slot. Please try again.')
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-5 w-5 text-primary" />
          <CardTitle>Book for {formatDate(weekDate)} - {formatDate(weekEndDate)}</CardTitle>
        </div>
        <CardDescription>
          Reserve ad spots across the entire Guild network for next week
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
            <span>{availablePercentage}% available</span>
          </div>
          <div className="h-4 bg-muted rounded-full overflow-hidden flex">
            {/* Purchased by others */}
            <div
              className="h-full bg-muted-foreground/30"
              style={{ width: `${purchasedPercentage - userPurchasedPercentage}%` }}
              title="Purchased by others"
            />
            {/* Your existing purchases */}
            {userPurchasedPercentage > 0 && (
              <div
                className="h-full bg-primary/50"
                style={{ width: `${userPurchasedPercentage}%` }}
                title="Your existing bookings"
              />
            )}
            {/* Your new selection */}
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${percentage}%` }}
              title="Your selection"
            />
            {/* Available */}
            <div
              className="h-full bg-green-500/20"
              style={{ width: `${availablePercentage - percentage}%` }}
              title="Still available"
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-muted-foreground/30" /> Others ({purchasedPercentage - userPurchasedPercentage}%)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-primary" /> Your selection ({percentage}%)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-green-500/20" /> Available
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
              <p className="text-sm text-muted-foreground">Your Cost</p>
              <p className="text-2xl font-bold">${costDollars}</p>
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

        {/* Info */}
        <div className="flex items-start gap-2 p-3 bg-blue-500/10 rounded-lg text-sm">
          <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-blue-600 dark:text-blue-400">
            Pricing is transparent and fixed weekly. The network price adjusts based on demand—
            if we sell out, prices increase; if we don't, they decrease.
          </p>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <Button
          onClick={bookSlot}
          disabled={booking || maxPercentage < 1}
          className="w-full"
          size="lg"
        >
          {booking ? (
            <>
              <SpinnerGap className="h-4 w-4 mr-2 animate-spin" />
              Booking...
            </>
          ) : maxPercentage < 1 ? (
            'Sold Out'
          ) : !campaignId ? (
            `Create Campaign & Book ${percentage}%`
          ) : (
            `Book ${percentage}% for $${costDollars}`
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
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
  const [percentage, setPercentage] = useState(10)
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('')
  const [showCampaignSelect, setShowCampaignSelect] = useState(false)
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

  const selectedCampaign = campaigns.find(c => c.campaign_id === selectedCampaignId)

  const bookSlot = async () => {
    if (!selectedCampaignId) {
      setShowCampaignSelect(true)
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

      const { error: insertError } = await supabase.from('slot_purchases').insert({
        slot_id: slotId,
        user_id: user.id,
        campaign_id: selectedCampaignId,
        percentage_purchased: percentage,
        price_cents: costCents,
        status: 'confirmed',
      })

      if (insertError) {
        setError(insertError.message)
        return
      }

      // Update campaign status to scheduled
      await supabase
        .from('campaigns')
        .update({ status: 'scheduled' })
        .eq('campaign_id', selectedCampaignId)

      setShowCampaignSelect(false)
      setSelectedCampaignId('')
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

        <Button
          onClick={bookSlot}
          disabled={booking || maxPercentage < 1 || (showCampaignSelect && !selectedCampaignId)}
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

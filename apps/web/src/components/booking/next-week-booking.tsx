'use client'

import { useState, useEffect } from 'react'
import { WeekSlotBooking } from './week-slot-booking'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SpinnerGap, Lock } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'

interface NextWeekBookingProps {
  appId?: string
  userId?: string
}

interface Campaign {
  campaign_id: string
  name: string
  headline: string
}

interface SlotData {
  weekStart: string
  slotId: string
  basePriceCents: number
  totalUsersEstimate: number
  purchasedPercentage: number
  availablePercentage: number
  isNextWeek: boolean
  weeksFromNow: number
  purchases: Array<{
    percentage_purchased: number
    user_id: string
    status: string
  }>
}

interface ApiResponse {
  weeks?: unknown
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  return null
}

function normalizeWeek(payload: unknown): SlotData | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const source = payload as Record<string, unknown>
  const weekStartRaw = source.weekStart ?? source.week_start
  const slotIdRaw = source.slotId ?? source.slot_id

  const weekStart = typeof weekStartRaw === 'string' ? weekStartRaw : null
  const slotId = typeof slotIdRaw === 'string' ? slotIdRaw : null
  const basePriceCents = asNumber(source.basePriceCents ?? source.base_price_cents)
  const totalUsersEstimate = asNumber(source.totalUsersEstimate ?? source.total_users_estimate)
  const purchasedPercentage = asNumber(source.purchasedPercentage ?? source.purchased_percentage)
  const availablePercentage = asNumber(source.availablePercentage ?? source.available_percentage)
  const weeksFromNow = asNumber(source.weeksFromNow ?? source.weeks_from_now)
  const isNextWeekRaw = source.isNextWeek ?? source.is_next_week
  const isNextWeek = typeof isNextWeekRaw === 'boolean' ? isNextWeekRaw : weeksFromNow === 0

  const purchasesRaw = source.purchases
  const purchases = Array.isArray(purchasesRaw)
    ? purchasesRaw
        .filter((entry): entry is { percentage_purchased: number; user_id: string; status: string } => {
          if (!entry || typeof entry !== 'object') return false
          const e = entry as Record<string, unknown>
          return (
            typeof e.user_id === 'string' &&
            typeof e.status === 'string' &&
            typeof e.percentage_purchased === 'number' &&
            Number.isFinite(e.percentage_purchased)
          )
        })
    : []

  if (
    !weekStart ||
    !slotId ||
    basePriceCents === null ||
    totalUsersEstimate === null ||
    purchasedPercentage === null ||
    availablePercentage === null ||
    weeksFromNow === null
  ) {
    return null
  }

  return {
    weekStart,
    slotId,
    basePriceCents,
    totalUsersEstimate,
    purchasedPercentage,
    availablePercentage,
    isNextWeek,
    weeksFromNow,
    purchases,
  }
}

export function NextWeekBooking({ appId, userId }: NextWeekBookingProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [weeks, setWeeks] = useState<SlotData[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedWeek, setSelectedWeek] = useState<number>(0)

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch slots
        const res = await fetch('/api/slots', { cache: 'no-store' })
        if (!res.ok) throw new Error('Failed to fetch slot data')
        const data: ApiResponse = await res.json()
        const normalizedWeeks = Array.isArray(data.weeks)
          ? data.weeks
              .map((week) => normalizeWeek(week))
              .filter((week): week is SlotData => week !== null)
          : []
        setWeeks(normalizedWeeks)

        // Fetch campaigns for this app
        if (appId) {
          const supabase = createClient()
          const { data: campaignData } = await supabase
            .from('campaigns')
            .select('campaign_id, name, headline')
            .eq('app_id', appId)
            .order('created_at', { ascending: false })

          setCampaigns(campaignData || [])
        }
      } catch (err) {
        setError('Failed to load booking data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [appId])

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <SpinnerGap className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (error || weeks.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {error || 'Unable to load booking data'}
        </CardContent>
      </Card>
    )
  }

  const formatWeekLabel = (weekStart: string, weeksFromNow: number) => {
    const date = new Date(weekStart + 'T00:00:00')
    const endDate = new Date(date)
    endDate.setDate(endDate.getDate() + 6)

    const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const dateRange = `${formatDate(date)} - ${formatDate(endDate)}`

    if (weeksFromNow === 0) return `Next Week (${dateRange})`
    if (weeksFromNow === 1) return `In 2 Weeks (${dateRange})`
    return `In ${weeksFromNow + 1} Weeks (${dateRange})`
  }

  const currentWeek = weeks[selectedWeek]

  // Calculate user's purchases for this week
  const userPurchasedPercentage = userId
    ? currentWeek.purchases
        .filter(p => p.user_id === userId)
        .reduce((sum, p) => sum + p.percentage_purchased, 0)
    : 0

  return (
    <div className="space-y-4">
      {/* Week selector tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {weeks.map((week, index) => (
          <button
            key={week.weekStart}
            onClick={() => setSelectedWeek(index)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedWeek === index
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80 text-muted-foreground'
            }`}
          >
            <div className="flex items-center gap-2">
              {index === 0 && <span className="text-xs bg-primary-foreground/20 px-1.5 py-0.5 rounded">NEXT</span>}
              <span>{formatWeekLabel(week.weekStart, week.weeksFromNow).split('(')[0].trim()}</span>
            </div>
            <div className="text-xs opacity-70 mt-0.5">
              {week.availablePercentage}% available
            </div>
          </button>
        ))}
      </div>

      {/* Selected week booking */}
      <WeekSlotBooking
        weekStart={currentWeek.weekStart}
        slotId={currentWeek.slotId}
        basePriceCents={currentWeek.basePriceCents}
        totalUsersEstimate={currentWeek.totalUsersEstimate}
        purchasedPercentage={currentWeek.purchasedPercentage}
        availablePercentage={currentWeek.availablePercentage}
        userPurchasedPercentage={userPurchasedPercentage}
        campaigns={campaigns}
        appId={appId}
        isNextWeek={currentWeek.isNextWeek}
      />

      {/* Quick view of other weeks */}
      {weeks.length > 1 && (
        <Card className="bg-muted/30">
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium">Upcoming Weeks</CardTitle>
          </CardHeader>
          <CardContent className="py-0 pb-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {weeks.map((week, index) => {
                const date = new Date(week.weekStart + 'T00:00:00')
                const isLocked = false

                return (
                  <button
                    key={week.weekStart}
                    onClick={() => setSelectedWeek(index)}
                    className={`p-2 rounded-lg text-left transition-colors ${
                      selectedWeek === index
                        ? 'bg-primary/10 border border-primary/30'
                        : 'bg-background hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">
                        {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      {isLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
                    </div>
                    <div className="mt-1">
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${100 - week.availablePercentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {week.availablePercentage}% left
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

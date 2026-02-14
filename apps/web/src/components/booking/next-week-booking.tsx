'use client'

import { useState, useEffect } from 'react'
import { WeekSlotBooking } from './week-slot-booking'
import { Card, CardContent } from '@/components/ui/card'
import { SpinnerGap } from '@phosphor-icons/react'

interface NextWeekBookingProps {
  campaignId?: string
  appId?: string
  compact?: boolean
  userId?: string
}

interface SlotData {
  weekStart: string
  slotId: string
  basePriceCents: number
  totalUsersEstimate: number
  purchasedPercentage: number
  availablePercentage: number
  purchases: Array<{
    percentage_purchased: number
    user_id: string
    status: string
  }>
}

export function NextWeekBooking({ campaignId, appId, compact, userId }: NextWeekBookingProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [slotData, setSlotData] = useState<SlotData | null>(null)

  useEffect(() => {
    async function fetchSlotData() {
      try {
        const res = await fetch('/api/slots')
        if (!res.ok) throw new Error('Failed to fetch slot data')
        const data = await res.json()
        setSlotData(data)
      } catch (err) {
        setError('Failed to load booking data')
      } finally {
        setLoading(false)
      }
    }
    fetchSlotData()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <SpinnerGap className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (error || !slotData) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {error || 'Unable to load booking data'}
        </CardContent>
      </Card>
    )
  }

  // Calculate how much this user has already purchased
  const userPurchasedPercentage = userId
    ? slotData.purchases
        .filter(p => p.user_id === userId)
        .reduce((sum, p) => sum + p.percentage_purchased, 0)
    : 0

  return (
    <WeekSlotBooking
      weekStart={slotData.weekStart}
      basePriceCents={slotData.basePriceCents}
      totalUsersEstimate={slotData.totalUsersEstimate}
      purchasedPercentage={slotData.purchasedPercentage}
      availablePercentage={slotData.availablePercentage}
      userPurchasedPercentage={userPurchasedPercentage}
      campaignId={campaignId}
      appId={appId}
      compact={compact}
    />
  )
}

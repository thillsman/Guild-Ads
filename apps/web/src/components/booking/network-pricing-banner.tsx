'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CalendarCheck, Users, TrendUp, ArrowRight, SpinnerGap } from '@phosphor-icons/react'

interface SlotData {
  weekStart: string
  basePriceCents: number
  totalUsersEstimate: number
  purchasedPercentage: number
  availablePercentage: number
}

export function NetworkPricingBanner() {
  const [loading, setLoading] = useState(true)
  const [slotData, setSlotData] = useState<SlotData | null>(null)

  useEffect(() => {
    async function fetchSlotData() {
      try {
        const res = await fetch('/api/slots', { cache: 'no-store' })
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()
        setSlotData(data)
      } catch (err) {
        // Silently fail
      } finally {
        setLoading(false)
      }
    }
    fetchSlotData()
  }, [])

  if (loading) {
    return (
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="py-6 flex items-center justify-center">
          <SpinnerGap className="h-5 w-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  if (!slotData) return null

  const weekDate = new Date(slotData.weekStart + 'T00:00:00')
  const weekEndDate = new Date(weekDate)
  weekEndDate.setDate(weekEndDate.getDate() + 6)

  const formatDate = (date: Date) => date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })

  const pricePerPercent = slotData.basePriceCents / 100 / 100 // Convert to dollars per percent

  return (
    <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 overflow-hidden">
      <CardContent className="py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CalendarCheck className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Book ads for {formatDate(weekDate)} - {formatDate(weekEndDate)}</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Transparent weekly pricing across the entire Guild network
            </p>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <TrendUp className="h-4 w-4 text-primary" />
                <span><strong>${(slotData.basePriceCents / 100).toLocaleString()}</strong> for 100%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-primary" />
                <span><strong>{slotData.totalUsersEstimate.toLocaleString()}</strong> users</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`inline-block w-2 h-2 rounded-full ${slotData.availablePercentage > 50 ? 'bg-green-500' : slotData.availablePercentage > 20 ? 'bg-amber-500' : 'bg-red-500'}`} />
                <span><strong>{slotData.availablePercentage}%</strong> available</span>
              </div>
            </div>
          </div>
          <div className="flex-shrink-0">
            <p className="text-xs text-muted-foreground mb-2 text-right">Starting at</p>
            <p className="text-2xl font-bold text-primary mb-2">${pricePerPercent.toFixed(0)}<span className="text-sm font-normal text-muted-foreground">/1%</span></p>
            <Button asChild>
              <Link href="/dashboard/book">
                Book Now
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

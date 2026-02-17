import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Disable caching - always fetch fresh data
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function getNextSunday(): Date {
  const today = new Date()
  const dayOfWeek = today.getUTCDay()
  const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek
  const nextSunday = new Date(today)
  nextSunday.setUTCDate(today.getUTCDate() + daysUntilSunday)
  nextSunday.setUTCHours(0, 0, 0, 0)
  return nextSunday
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

async function getOrCreateSlot(weekStart: string) {
  // Use maybeSingle() to not error when no row exists
  let { data: slot } = await supabase
    .from('weekly_slots')
    .select('*')
    .eq('week_start', weekStart)
    .maybeSingle()

  if (!slot) {
    // Try to insert, using upsert to handle race conditions
    const { data: newSlot, error } = await supabase
      .from('weekly_slots')
      .upsert({
        week_start: weekStart,
        base_price_cents: 100000, // $1000
        total_impressions_estimate: 100000,
        total_users_estimate: 10000,
      }, { onConflict: 'week_start' })
      .select()
      .single()

    if (error) {
      console.error('Failed to create slot for', weekStart, error)
      return null
    }
    slot = newSlot
  }

  // Get purchases for this slot
  const { data: purchases } = await supabase
    .from('slot_purchases')
    .select('percentage_purchased, user_id, status')
    .eq('slot_id', slot.slot_id)
    .in('status', ['pending', 'confirmed'])

  const purchasedPercentage = purchases?.reduce((sum, p) => sum + p.percentage_purchased, 0) || 0
  const availablePercentage = 100 - purchasedPercentage

  return {
    weekStart: slot.week_start,
    slotId: slot.slot_id,
    basePriceCents: slot.base_price_cents,
    totalUsersEstimate: slot.total_users_estimate,
    totalImpressionsEstimate: slot.total_impressions_estimate,
    purchasedPercentage,
    availablePercentage,
    purchases: purchases || [],
  }
}

export async function GET() {
  const nextSunday = getNextSunday()

  // Get slots for the next 4 weeks
  const weeks = []
  for (let i = 0; i < 4; i++) {
    const weekDate = new Date(nextSunday)
    weekDate.setUTCDate(nextSunday.getUTCDate() + (i * 7))
    const slot = await getOrCreateSlot(formatDate(weekDate))
    if (slot) {
      weeks.push({
        ...slot,
        isNextWeek: i === 0,
        weeksFromNow: i,
      })
    }
  }

  return NextResponse.json({
    weeks,
    // Keep backwards compatibility - return first week as main slot
    ...weeks[0],
  })
}

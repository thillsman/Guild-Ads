import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function getNextSunday(): string {
  const today = new Date()
  const dayOfWeek = today.getUTCDay()
  const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek
  const nextSunday = new Date(today)
  nextSunday.setUTCDate(today.getUTCDate() + daysUntilSunday)
  return nextSunday.toISOString().split('T')[0]
}

export async function GET() {
  const nextWeekStart = getNextSunday()

  // Get or create the weekly slot
  let { data: slot } = await supabase
    .from('weekly_slots')
    .select('*')
    .eq('week_start', nextWeekStart)
    .single()

  if (!slot) {
    // Create the slot if it doesn't exist
    const { data: newSlot, error } = await supabase
      .from('weekly_slots')
      .insert({
        week_start: nextWeekStart,
        base_price_cents: 100000, // $1000
        total_impressions_estimate: 100000,
        total_users_estimate: 10000,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
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

  return NextResponse.json({
    weekStart: slot.week_start,
    slotId: slot.slot_id,
    basePriceCents: slot.base_price_cents,
    totalUsersEstimate: slot.total_users_estimate,
    totalImpressionsEstimate: slot.total_impressions_estimate,
    purchasedPercentage,
    availablePercentage,
    purchases: purchases || [],
  })
}

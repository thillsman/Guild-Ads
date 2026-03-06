import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@guild-ads/shared'
import { getLiveNetworkStats, type LiveNetworkStats } from '@/lib/network/live-network-stats'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  addWeeksToWeekStartUTC,
  ensureBookableWeekSlot,
  ensurePlanningWeekSlot,
  getCurrentWeekStartUTC,
} from '@/lib/billing/weekly-economics'

// Disable caching - always fetch fresh data
export const dynamic = 'force-dynamic'

async function getOrCreateSlot(
  supabase: SupabaseClient<Database>,
  weekStart: string,
  liveNetworkStats: LiveNetworkStats | null,
  input: {
    isBookableWeek: boolean
    placeholderPriceCents: number
  }
) {
  const slot = input.isBookableWeek
    ? await ensureBookableWeekSlot(supabase, {
        weekStart,
        totalUsersEstimate: liveNetworkStats?.trailing7dUsers ?? null,
      })
    : await ensurePlanningWeekSlot(supabase, {
        weekStart,
        placeholderPriceCents: input.placeholderPriceCents,
        totalUsersEstimate: liveNetworkStats?.trailing7dUsers ?? null,
      })

  if (!slot) {
    return null
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
    totalUsersEstimate: liveNetworkStats?.trailing7dUsers ?? slot.total_users_estimate,
    totalImpressionsEstimate: slot.total_impressions_estimate,
    purchasedPercentage,
    availablePercentage,
    purchases: purchases || [],
  }
}

export async function GET() {
  const supabase = createAdminClient()
  const liveNetworkStats = await getLiveNetworkStats(supabase)
  const nextWeekStart = liveNetworkStats?.currentWeekStart
    ? addWeeksToWeekStartUTC(liveNetworkStats.currentWeekStart, 1)
    : addWeeksToWeekStartUTC(getCurrentWeekStartUTC(new Date()), 1)

  // Get slots for the next 4 weeks
  const weeks = []
  let placeholderPriceCents = 100000
  for (let i = 0; i < 4; i++) {
    const weekStart = addWeeksToWeekStartUTC(nextWeekStart, i)
    const slot = await getOrCreateSlot(supabase, weekStart, liveNetworkStats, {
      isBookableWeek: i === 0,
      placeholderPriceCents,
    })
    if (slot) {
      placeholderPriceCents = slot.basePriceCents
      weeks.push({
        ...slot,
        isNextWeek: i === 0,
        weeksFromNow: i,
      })
    }
  }

  return NextResponse.json({
    weeks,
    networkStats: liveNetworkStats,
    // Keep backwards compatibility - return first week as main slot
    ...weeks[0],
  })
}

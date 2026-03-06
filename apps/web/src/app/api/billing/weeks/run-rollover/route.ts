import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  addWeeksToWeekStartUTC,
  ensureBookableWeekSlot,
  finalizeClosedWeeks,
  getCurrentWeekStartUTC,
} from '@/lib/billing/weekly-economics'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function hasCronSecret(request: Request): boolean {
  const secret = process.env.BILLING_CRON_SECRET
  if (!secret) {
    return false
  }

  const authHeader = request.headers.get('authorization')
  const bearer = authHeader?.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : null

  const headerSecret = request.headers.get('x-billing-cron-secret')
  return bearer === secret || headerSecret === secret
}

export async function POST(request: Request) {
  if (!hasCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()
    const now = new Date()
    const currentWeekStart = getCurrentWeekStartUTC(now)
    const { accruedWeeks, bonusWeeks, nextBookableWeekStart } = await finalizeClosedWeeks(supabase, now)
    const slot = await ensureBookableWeekSlot(supabase, {
      weekStart: nextBookableWeekStart,
    })

    return NextResponse.json({
      ok: true,
      accruedWeeks,
      bonusWeeks,
      currentWeekStart,
      lockedWeekStart: currentWeekStart,
      nextBookableWeekStart,
      pricedFromWeekStart: addWeeksToWeekStartUTC(nextBookableWeekStart, -1),
      nextBookableWeekPriceCents: slot?.base_price_cents ?? null,
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to run weekly rollover.',
    }, { status: 500 })
  }
}

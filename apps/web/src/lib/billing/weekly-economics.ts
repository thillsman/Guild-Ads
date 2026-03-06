import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@guild-ads/shared'
import { formatDateUTC, getNextSundayDateUTC } from './time'

const DEFAULT_WEEKLY_PRICE_CENTS = 100000
const DEFAULT_USERS_ESTIMATE = 10000
const DEFAULT_IMPRESSIONS_ESTIMATE = 100000

interface WeeklySlotRow {
  slot_id: string
  week_start: string
  base_price_cents: number
  total_users_estimate: number
  total_impressions_estimate: number
}

function toCount(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

function addDaysUTC(date: Date, days: number): Date {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

export function getCurrentWeekStartUTC(now: Date = new Date()): string {
  const current = new Date(now)
  current.setUTCHours(0, 0, 0, 0)
  current.setUTCDate(current.getUTCDate() - current.getUTCDay())
  return formatDateUTC(current)
}

export function addWeeksToWeekStartUTC(weekStart: string, weeks: number): string {
  const date = new Date(`${weekStart}T00:00:00Z`)
  return formatDateUTC(addDaysUTC(date, weeks * 7))
}

export function calculateAdjustedWeeklyPrice(basePriceCents: number, soldPercentage: number): number {
  if (basePriceCents <= 0) {
    return DEFAULT_WEEKLY_PRICE_CENTS
  }

  if (soldPercentage >= 90) {
    return Math.max(1, Math.round(basePriceCents * 1.1))
  }

  if (soldPercentage >= 70) {
    return Math.max(1, Math.round(basePriceCents * 1.05))
  }

  if (soldPercentage >= 50) {
    return basePriceCents
  }

  if (soldPercentage >= 30) {
    return Math.max(1, Math.round(basePriceCents * 0.95))
  }

  return Math.max(1, Math.round(basePriceCents * 0.9))
}

async function getWeeklySlot(
  supabase: SupabaseClient<Database>,
  weekStart: string
): Promise<WeeklySlotRow | null> {
  const { data, error } = await supabase
    .from('weekly_slots')
    .select('slot_id, week_start, base_price_cents, total_users_estimate, total_impressions_estimate')
    .eq('week_start', weekStart)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
    ? {
        slot_id: data.slot_id,
        week_start: data.week_start,
        base_price_cents: data.base_price_cents,
        total_users_estimate: data.total_users_estimate,
        total_impressions_estimate: data.total_impressions_estimate,
      }
    : null
}

async function hasSlotPurchases(
  supabase: SupabaseClient<Database>,
  weekStart: string
): Promise<boolean> {
  const { data, error } = await (supabase as any)
    .from('slot_purchases')
    .select('purchase_id, weekly_slots!inner(week_start)')
    .eq('weekly_slots.week_start', weekStart)
    .in('status', ['pending', 'confirmed', 'completed'])
    .limit(1)

  if (error) {
    throw error
  }

  return Array.isArray(data) && data.length > 0
}

export async function getWeeklySoldPercentage(
  supabase: SupabaseClient<Database>,
  weekStart: string
): Promise<number> {
  const { data, error } = await (supabase as any).rpc('get_weekly_sold_percentage', {
    p_week_start: weekStart,
  })

  if (error) {
    throw error
  }

  return toCount(data)
}

async function upsertWeeklySlot(
  supabase: SupabaseClient<Database>,
  input: {
    weekStart: string
    basePriceCents: number
    totalUsersEstimate?: number | null
    totalImpressionsEstimate?: number | null
    allowPriceUpdate: boolean
  }
): Promise<WeeklySlotRow | null> {
  const existing = await getWeeklySlot(supabase, input.weekStart)
  const totalUsersEstimate = input.totalUsersEstimate ?? DEFAULT_USERS_ESTIMATE
  const totalImpressionsEstimate = input.totalImpressionsEstimate ?? DEFAULT_IMPRESSIONS_ESTIMATE

  if (!existing) {
    const { data, error } = await supabase
      .from('weekly_slots')
      .upsert({
        week_start: input.weekStart,
        base_price_cents: input.basePriceCents,
        total_users_estimate: totalUsersEstimate,
        total_impressions_estimate: totalImpressionsEstimate,
      }, { onConflict: 'week_start' })
      .select('slot_id, week_start, base_price_cents, total_users_estimate, total_impressions_estimate')
      .maybeSingle()

    if (error) {
      throw error
    }

    return data
      ? {
          slot_id: data.slot_id,
          week_start: data.week_start,
          base_price_cents: data.base_price_cents,
          total_users_estimate: data.total_users_estimate,
          total_impressions_estimate: data.total_impressions_estimate,
        }
      : await getWeeklySlot(supabase, input.weekStart)
  }

  const targetUsersEstimate = existing.total_users_estimate > 0
    ? existing.total_users_estimate
    : totalUsersEstimate
  const targetImpressionsEstimate = existing.total_impressions_estimate > 0
    ? existing.total_impressions_estimate
    : totalImpressionsEstimate

  if (!input.allowPriceUpdate &&
      existing.total_users_estimate > 0 &&
      existing.total_impressions_estimate > 0) {
    return existing
  }

  const { data, error } = await supabase
    .from('weekly_slots')
    .update({
      base_price_cents: input.allowPriceUpdate ? input.basePriceCents : existing.base_price_cents,
      total_users_estimate: targetUsersEstimate,
      total_impressions_estimate: targetImpressionsEstimate,
      updated_at: new Date().toISOString(),
    })
    .eq('slot_id', existing.slot_id)
    .select('slot_id, week_start, base_price_cents, total_users_estimate, total_impressions_estimate')
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
    ? {
        slot_id: data.slot_id,
        week_start: data.week_start,
        base_price_cents: data.base_price_cents,
        total_users_estimate: data.total_users_estimate,
        total_impressions_estimate: data.total_impressions_estimate,
      }
    : existing
}

export async function ensureBookableWeekSlot(
  supabase: SupabaseClient<Database>,
  input: {
    weekStart: string
    totalUsersEstimate?: number | null
    totalImpressionsEstimate?: number | null
  }
): Promise<WeeklySlotRow | null> {
  const sourceWeekStart = addWeeksToWeekStartUTC(input.weekStart, -1)
  const sourceSlot = await getWeeklySlot(supabase, sourceWeekStart)
  const soldPercentage = sourceSlot
    ? await getWeeklySoldPercentage(supabase, sourceWeekStart)
    : 0
  const basePriceCents = calculateAdjustedWeeklyPrice(
    sourceSlot?.base_price_cents ?? DEFAULT_WEEKLY_PRICE_CENTS,
    soldPercentage
  )
  const allowPriceUpdate = !(await hasSlotPurchases(supabase, input.weekStart))

  return upsertWeeklySlot(supabase, {
    weekStart: input.weekStart,
    basePriceCents,
    totalUsersEstimate: input.totalUsersEstimate,
    totalImpressionsEstimate: input.totalImpressionsEstimate,
    allowPriceUpdate,
  })
}

export async function ensurePlanningWeekSlot(
  supabase: SupabaseClient<Database>,
  input: {
    weekStart: string
    placeholderPriceCents: number
    totalUsersEstimate?: number | null
    totalImpressionsEstimate?: number | null
  }
): Promise<WeeklySlotRow | null> {
  return upsertWeeklySlot(supabase, {
    weekStart: input.weekStart,
    basePriceCents: input.placeholderPriceCents,
    totalUsersEstimate: input.totalUsersEstimate,
    totalImpressionsEstimate: input.totalImpressionsEstimate,
    allowPriceUpdate: false,
  })
}

export async function finalizeClosedWeeks(
  supabase: SupabaseClient<Database>,
  now: Date = new Date()
): Promise<{
  accruedWeeks: number
  bonusWeeks: number
  nextBookableWeekStart: string
}> {
  const currentWeekStart = getCurrentWeekStartUTC(now)
  const nextBookableWeekStart = formatDateUTC(getNextSundayDateUTC(now))

  const { data: weeksToFinalize, error: weeksError } = await supabase
    .from('weekly_slots')
    .select('week_start')
    .lt('week_start', currentWeekStart)
    .order('week_start', { ascending: true })

  if (weeksError) {
    throw weeksError
  }

  let accruedWeeks = 0
  let bonusWeeks = 0

  for (const row of weeksToFinalize ?? []) {
    if (!row?.week_start) {
      continue
    }

    const { error: accrueError } = await (supabase as any).rpc('run_weekly_earnings_accrual', {
      p_week_start: row.week_start,
    })
    if (accrueError) {
      throw accrueError
    }

    accruedWeeks += 1

    const { error: bonusError } = await (supabase as any).rpc('grant_publisher_bonus_credits', {
      p_week_start: row.week_start,
    })
    if (bonusError) {
      throw bonusError
    }

    bonusWeeks += 1
  }

  await (supabase as any)
    .from('publisher_weekly_earnings')
    .update({
      payout_status: 'eligible',
      updated_at: now.toISOString(),
    })
    .eq('payout_status', 'accrued')
    .lte('hold_until', now.toISOString())

  return {
    accruedWeeks,
    bonusWeeks,
    nextBookableWeekStart,
  }
}

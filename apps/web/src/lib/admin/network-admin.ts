import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@guild-ads/shared'

export interface AdminWeeklyNetworkSummary {
  weekStart: string
  networkPriceCents: number
  bookedSpendCents: number
  cashSpendCents: number
  creditsSpendCents: number
  purchasedPercentage: number
  advertiserAppCount: number
  publisherAppCount: number
  networkUniqueUsers: number
  platformReserveCents: number
  publisherPoolCents: number
}

export interface AdminWeeklyAdvertiser {
  advertiserAppID: string
  advertiserAppName: string
  purchasedPercentage: number
  bookedSpendCents: number
  cashSpendCents: number
  creditsSpendCents: number
  userReach: number
  networkUniqueUsers: number
  actualShareRatio: number
}

export interface AdminWeeklyPublisher {
  publisherAppID: string
  publisherAppName: string
  uniqueUsers: number
  networkUniqueUsers: number
  shareRatio: number
  duePayoutCents: number
  bonusCreditCents: number
  convertedCents: number
  payoutStatus: string | null
  holdUntil: string | null
  paidAt: string | null
}

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

export async function getAdminWeeklyNetworkSummaries(
  supabase: SupabaseClient<Database>,
  limit = 24
): Promise<AdminWeeklyNetworkSummary[]> {
  const { data, error } = await supabase.rpc('get_admin_weekly_network_summaries', {
    p_limit: limit,
  })

  if (error) {
    throw error
  }

  return (data ?? [])
    .filter((row): row is NonNullable<(typeof data)[number]> => !!row && typeof row.week_start === 'string')
    .map((row) => ({
      weekStart: row.week_start,
      networkPriceCents: toNumber(row.network_price_cents),
      bookedSpendCents: toNumber(row.booked_spend_cents),
      cashSpendCents: toNumber(row.cash_spend_cents),
      creditsSpendCents: toNumber(row.credits_spend_cents),
      purchasedPercentage: toNumber(row.purchased_percentage),
      advertiserAppCount: toNumber(row.advertiser_app_count),
      publisherAppCount: toNumber(row.publisher_app_count),
      networkUniqueUsers: toNumber(row.network_unique_users),
      platformReserveCents: toNumber(row.platform_reserve_cents),
      publisherPoolCents: toNumber(row.publisher_pool_cents),
    }))
}

export async function getAdminWeeklyAdvertiserBreakdown(
  supabase: SupabaseClient<Database>,
  weekStart: string
): Promise<AdminWeeklyAdvertiser[]> {
  const { data, error } = await supabase.rpc('get_admin_weekly_advertiser_breakdown', {
    p_week_start: weekStart,
  })

  if (error) {
    throw error
  }

  return (data ?? [])
    .filter((row): row is NonNullable<(typeof data)[number]> => !!row && typeof row.advertiser_app_id === 'string')
    .map((row) => ({
      advertiserAppID: row.advertiser_app_id,
      advertiserAppName: row.advertiser_app_name ?? 'Unknown App',
      purchasedPercentage: toNumber(row.purchased_percentage),
      bookedSpendCents: toNumber(row.booked_spend_cents),
      cashSpendCents: toNumber(row.cash_spend_cents),
      creditsSpendCents: toNumber(row.credits_spend_cents),
      userReach: toNumber(row.user_reach),
      networkUniqueUsers: toNumber(row.network_unique_users),
      actualShareRatio: toNumber(row.actual_share_ratio),
    }))
}

export async function getAdminWeeklyPublisherBreakdown(
  supabase: SupabaseClient<Database>,
  weekStart: string
): Promise<AdminWeeklyPublisher[]> {
  const { data, error } = await supabase.rpc('get_admin_weekly_publisher_breakdown', {
    p_week_start: weekStart,
  })

  if (error) {
    throw error
  }

  return (data ?? [])
    .filter((row): row is NonNullable<(typeof data)[number]> => !!row && typeof row.publisher_app_id === 'string')
    .map((row) => ({
      publisherAppID: row.publisher_app_id,
      publisherAppName: row.publisher_app_name ?? 'Unknown App',
      uniqueUsers: toNumber(row.unique_users),
      networkUniqueUsers: toNumber(row.network_unique_users),
      shareRatio: toNumber(row.share_ratio),
      duePayoutCents: toNumber(row.due_payout_cents),
      bonusCreditCents: toNumber(row.bonus_credit_cents),
      convertedCents: toNumber(row.converted_cents),
      payoutStatus: typeof row.payout_status === 'string' ? row.payout_status : null,
      holdUntil: typeof row.hold_until === 'string' ? row.hold_until : null,
      paidAt: typeof row.paid_at === 'string' ? row.paid_at : null,
    }))
}

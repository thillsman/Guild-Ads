import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@guild-ads/shared'

export interface LiveNetworkStats {
  advertiserAppsCount: number
  publisherAppsCount: number
  trailing7dUsers: number
  trailingDays: number
  currentWeekStart: string | null
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

export async function getLiveNetworkStats(
  supabase: SupabaseClient<Database>,
  trailingDays = 7
): Promise<LiveNetworkStats | null> {
  const { data, error } = await supabase.rpc('get_live_network_stats', {
    p_days: trailingDays,
  })

  if (error) {
    console.error('[network] failed to fetch live network stats', error)
    return null
  }

  const row = Array.isArray(data) ? data[0] : null
  if (!row) {
    return {
      advertiserAppsCount: 0,
      publisherAppsCount: 0,
      trailing7dUsers: 0,
      trailingDays,
      currentWeekStart: null,
    }
  }

  return {
    advertiserAppsCount: toCount(row.advertiser_app_count),
    publisherAppsCount: toCount(row.publisher_app_count),
    trailing7dUsers: toCount(row.publisher_unique_users),
    trailingDays,
    currentWeekStart: typeof row.current_week_start === 'string' ? row.current_week_start : null,
  }
}

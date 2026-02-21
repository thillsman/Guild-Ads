import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@guild-ads/shared'
import { resolveServeWeekStart } from './common'
import { fetchAdByCampaignID, fetchAdByPurchaseID, fetchWeightedAdForPublisher, type ServedAd } from './ad-serving'

interface GetStickyAdInput {
  deviceIdHash: string
  publisherAppId: string
  placementId: string
  neverNoFill?: boolean
}

interface StickyAdResult {
  ad: ServedAd
  isNewView: boolean
}

/**
 * Get the Sunday (start of week) for a given date in UTC
 */
export function getWeekStart(date: Date = new Date()): string {
  return resolveServeWeekStart(date)
}

/**
 * Get or assign a sticky ad for a user+placement+week combination.
 * Returns the same ad for the entire week, then a potentially different one next week.
 */
export async function getOrAssignStickyAd(
  supabase: SupabaseClient<Database>,
  input: GetStickyAdInput
): Promise<StickyAdResult | null> {
  const weekStart = getWeekStart()

  // Check if user already has an assigned ad for this placement+week
  const { data: existingView, error: existingError } = await (supabase as any)
    .from('unique_ad_views')
    .select('campaign_id, slot_purchase_id, view_count')
    .eq('device_id_hash', input.deviceIdHash)
    .eq('publisher_app_id', input.publisherAppId)
    .eq('placement_id', input.placementId)
    .eq('week_start', weekStart)
    .maybeSingle()

  if (existingError) {
    console.error('[sticky-ads] failed to lookup existing view', existingError)
  }

  if (existingView?.campaign_id) {
    // User already has an assigned ad - fetch and return it
    const ad = typeof existingView.slot_purchase_id === 'string'
      ? await fetchAdByPurchaseID(supabase, existingView.slot_purchase_id, input.publisherAppId)
      : await fetchAdByCampaignID(supabase, existingView.campaign_id, input.publisherAppId)
    if (ad) {
      const currentViewCount = typeof existingView.view_count === 'number' && existingView.view_count > 0
        ? existingView.view_count
        : 1

      await (supabase as any)
        .from('unique_ad_views')
        .update({
          last_seen_at: new Date().toISOString(),
          view_count: currentViewCount + 1,
        })
        .eq('device_id_hash', input.deviceIdHash)
        .eq('publisher_app_id', input.publisherAppId)
        .eq('placement_id', input.placementId)
        .eq('week_start', weekStart)

      return { ad, isNewView: false }
    }
    // Campaign no longer valid, fall through to assign new one
  }

  // No existing assignment - fetch available ad
  const ad = await fetchWeightedAdForPublisher(supabase, {
    publisherAppId: input.publisherAppId,
    neverNoFill: input.neverNoFill,
  })
  if (!ad) {
    return null
  }

  // Record the new unique view
  await (supabase as any)
    .from('unique_ad_views')
    .upsert({
      device_id_hash: input.deviceIdHash,
      publisher_app_id: input.publisherAppId,
      placement_id: input.placementId,
      campaign_id: ad.campaignID,
      slot_purchase_id: ad.adID, // adID is actually the purchase_id
      week_start: weekStart,
      first_seen_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      view_count: 1,
    }, {
      onConflict: 'device_id_hash,publisher_app_id,placement_id,week_start',
    })

  return { ad, isNewView: true }
}

/**
 * Record a click on an ad view
 */
export async function recordAdClick(
  supabase: SupabaseClient<Database>,
  input: GetStickyAdInput
): Promise<void> {
  const weekStart = getWeekStart()

  await (supabase as any)
    .from('unique_ad_views')
    .update({
      clicked: true,
      clicked_at: new Date().toISOString(),
    })
    .eq('device_id_hash', input.deviceIdHash)
    .eq('publisher_app_id', input.publisherAppId)
    .eq('placement_id', input.placementId)
    .eq('week_start', weekStart)
}

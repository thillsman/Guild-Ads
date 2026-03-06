import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@guild-ads/shared'
import { resolveServeWeekStart } from './common'
import { fetchAdByCampaignID, fetchAdByPurchaseID, getWeightedAdDecisionForPublisher, type ServedAd } from './ad-serving'

interface GetStickyAdInput {
  deviceIdHash: string
  publisherAppId: string
  placementId: string
  neverNoFill?: boolean
}

interface StickyAdResult {
  kind: 'ad'
  ad: ServedAd
  isNewView: boolean
  reason: 'sticky_existing' | 'sticky_assigned' | 'sticky_reassigned'
}

interface StickyNoFillResult {
  kind: 'no_fill'
  reason:
    | 'weighted_no_fill'
    | 'no_inventory'
    | 'sticky_reassignment_weighted_no_fill'
    | 'sticky_reassignment_no_inventory'
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
): Promise<StickyAdResult | StickyNoFillResult> {
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

      return { kind: 'ad', ad, isNewView: false, reason: 'sticky_existing' }
    }
    // Campaign no longer valid, fall through to assign new one
  }

  const hadExistingAssignment = Boolean(existingView?.campaign_id)

  // No existing assignment - fetch available ad
  const decision = await getWeightedAdDecisionForPublisher(supabase, {
    publisherAppId: input.publisherAppId,
    neverNoFill: input.neverNoFill,
  })
  if (decision.kind === 'no_fill') {
    if (!hadExistingAssignment) {
      return {
        kind: 'no_fill',
        reason: decision.reason,
      }
    }

    return {
      kind: 'no_fill',
      reason: decision.reason === 'weighted_no_fill'
        ? 'sticky_reassignment_weighted_no_fill'
        : 'sticky_reassignment_no_inventory',
    }
  }

  // Record the new unique view
  await (supabase as any)
    .from('unique_ad_views')
    .upsert({
      device_id_hash: input.deviceIdHash,
      publisher_app_id: input.publisherAppId,
      placement_id: input.placementId,
      campaign_id: decision.ad.campaignID,
      slot_purchase_id: decision.ad.adID, // adID is actually the purchase_id
      week_start: weekStart,
      first_seen_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      view_count: 1,
    }, {
      onConflict: 'device_id_hash,publisher_app_id,placement_id,week_start',
    })

  return {
    kind: 'ad',
    ad: decision.ad,
    isNewView: true,
    reason: hadExistingAssignment ? 'sticky_reassigned' : 'sticky_assigned',
  }
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

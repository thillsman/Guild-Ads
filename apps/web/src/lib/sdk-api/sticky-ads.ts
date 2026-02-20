import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@guild-ads/shared'
import { hashValue } from './common'
import { fetchHardcodedAd, type HardcodedAd } from './ad-serving'

interface GetStickyAdInput {
  deviceIdHash: string
  publisherAppId: string
  placementId: string
}

interface StickyAdResult {
  ad: HardcodedAd
  isNewView: boolean
}

/**
 * Get the Sunday (start of week) for a given date in UTC
 */
export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date)
  d.setUTCHours(0, 0, 0, 0)
  // Sunday = 0, so subtract day of week to get to Sunday
  d.setUTCDate(d.getUTCDate() - d.getUTCDay())
  return d.toISOString().split('T')[0] // YYYY-MM-DD
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
  console.log('[sticky-ads] getOrAssignStickyAd:', { ...input, weekStart })

  // Check if user already has an assigned ad for this placement+week
  const { data: existingView, error: existingError } = await (supabase as any)
    .from('unique_ad_views')
    .select('campaign_id, slot_purchase_id')
    .eq('device_id_hash', input.deviceIdHash)
    .eq('publisher_app_id', input.publisherAppId)
    .eq('placement_id', input.placementId)
    .eq('week_start', weekStart)
    .maybeSingle()

  console.log('[sticky-ads] existingView:', { existingView, existingError })

  if (existingView?.campaign_id) {
    // User already has an assigned ad - fetch and return it
    console.log('[sticky-ads] Found existing view, fetching ad by campaign:', existingView.campaign_id)
    const ad = await fetchAdByCampaignId(supabase, existingView.campaign_id, input.publisherAppId)
    console.log('[sticky-ads] fetchAdByCampaignId result:', ad ? { adID: ad.adID, title: ad.title } : null)
    if (ad) {
      // Update last_seen_at (view_count increment is nice-to-have, skip for now)
      await (supabase as any)
        .from('unique_ad_views')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('device_id_hash', input.deviceIdHash)
        .eq('publisher_app_id', input.publisherAppId)
        .eq('placement_id', input.placementId)
        .eq('week_start', weekStart)

      console.log('[sticky-ads] Returning existing ad')
      return { ad, isNewView: false }
    }
    // Campaign no longer valid, fall through to assign new one
    console.log('[sticky-ads] Existing campaign no longer valid, assigning new one')
  }

  // No existing assignment - fetch available ad
  console.log('[sticky-ads] No existing view, fetching new ad')
  const ad = await fetchHardcodedAd(supabase, input.publisherAppId)
  console.log('[sticky-ads] fetchHardcodedAd result:', ad ? { adID: ad.adID, title: ad.title } : null)
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
 * Fetch ad by campaign ID (for returning sticky ads)
 */
async function fetchAdByCampaignId(
  supabase: SupabaseClient<Database>,
  campaignId: string,
  publisherAppId: string
): Promise<HardcodedAd | null> {
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('campaign_id, app_id, headline, body, cta_text, destination_url')
    .eq('campaign_id', campaignId)
    .maybeSingle()

  if (!campaign || !campaign.destination_url) {
    return null
  }

  // Don't show ads for the same app that's requesting them
  if (campaign.app_id === publisherAppId) {
    return null
  }

  let promotedAppName = 'Sponsored App'
  let promotedAppSubtitle: string | null = null
  let promotedIconURL: string | null = null

  if (campaign.app_id) {
    const { data: promotedApp } = await supabase
      .from('apps')
      .select('name, subtitle, icon_url')
      .eq('app_id', campaign.app_id)
      .maybeSingle()

    if (promotedApp) {
      promotedAppName = promotedApp.name
      promotedAppSubtitle = promotedApp.subtitle
      promotedIconURL = promotedApp.icon_url
    }
  }

  // Get the purchase ID for this campaign
  const { data: purchase } = await (supabase as any)
    .from('slot_purchases')
    .select('purchase_id')
    .eq('campaign_id', campaignId)
    .eq('status', 'confirmed')
    .maybeSingle()

  return {
    adID: purchase?.purchase_id ?? campaignId,
    campaignID: campaign.campaign_id,
    title: campaign.headline ?? promotedAppName,
    subtitle: campaign.body ?? promotedAppSubtitle ?? 'Discover this app',
    cta: campaign.cta_text ?? 'Learn More',
    iconURL: promotedIconURL,
    destinationURL: campaign.destination_url,
    sponsoredLabel: 'Sponsored',
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

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@guild-ads/shared'
import { HARD_CODED_PURCHASE_ID, hashValue } from './common'

export interface HardcodedAd {
  adID: string
  campaignID: string
  title: string
  subtitle: string
  cta: string
  iconURL: string | null
  destinationURL: string
  sponsoredLabel: string
}

interface BuildAdResponseInput {
  ad: HardcodedAd
  origin: string
  placementID: string
}

export async function fetchHardcodedAd(
  supabase: SupabaseClient<Database>,
  publisherAppId?: string
): Promise<HardcodedAd | null> {
  const { data: purchase, error: purchaseError } = await supabase
    .from('slot_purchases')
    .select('purchase_id, campaign_id, status')
    .eq('purchase_id', HARD_CODED_PURCHASE_ID)
    .maybeSingle()

  if (purchaseError) {
    throw purchaseError
  }

  if (!purchase || !purchase.campaign_id || purchase.status === 'canceled') {
    return null
  }

  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('campaign_id, app_id, headline, body, cta_text, destination_url')
    .eq('campaign_id', purchase.campaign_id)
    .maybeSingle()

  if (campaignError) {
    throw campaignError
  }

  if (!campaign || !campaign.destination_url) {
    return null
  }

  // Don't show ads for the same app that's requesting them
  if (publisherAppId && campaign.app_id === publisherAppId) {
    return null
  }

  let promotedAppName = 'Sponsored App'
  let promotedAppSubtitle: string | null = null
  let promotedIconURL: string | null = null

  if (campaign.app_id) {
    const { data: promotedApp, error: promotedAppError } = await supabase
      .from('apps')
      .select('name, subtitle, icon_url')
      .eq('app_id', campaign.app_id)
      .maybeSingle()

    if (promotedAppError) {
      throw promotedAppError
    }

    if (promotedApp) {
      promotedAppName = promotedApp.name
      promotedAppSubtitle = promotedApp.subtitle
      promotedIconURL = promotedApp.icon_url
    }
  }

  return {
    adID: purchase.purchase_id,
    campaignID: campaign.campaign_id,
    title: campaign.headline ?? promotedAppName,
    subtitle: campaign.body ?? promotedAppSubtitle ?? 'Discover this app',
    cta: campaign.cta_text ?? 'Learn More',
    iconURL: promotedIconURL,
    destinationURL: campaign.destination_url,
    sponsoredLabel: 'Sponsored',
  }
}

export function buildServeResponse(input: BuildAdResponseInput) {
  const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000)
  // Format without milliseconds for iOS ISO8601DateFormatter compatibility
  const expiryISO = expiresAt.toISOString().replace(/\.\d{3}Z$/, 'Z')
  const nonce = hashValue(`${input.ad.adID}:${input.placementID}:${expiryISO}`)

  const impressionURL = new URL('/v1/impression', input.origin).toString()

  const clickURL = new URL(`/r/${input.ad.adID}`, input.origin)
  clickURL.searchParams.set('p', input.placementID)
  clickURL.searchParams.set('n', nonce)
  const clickURLString = clickURL.toString()

  return {
    ad_id: input.ad.adID,
    placement_id: input.placementID,
    creative: {
      headline: input.ad.title,
      body: input.ad.subtitle,
      cta: input.ad.cta,
      image_url: input.ad.iconURL,
      sponsored_label: input.ad.sponsoredLabel,
    },
    destination: {
      type: 'url',
      value: clickURLString,
    },
    reporting: {
      impression_url: impressionURL,
    },
    expiry: expiryISO,
    nonce,
  }
}

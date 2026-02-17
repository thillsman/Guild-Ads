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
  supabase: SupabaseClient<Database>
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
  const nonce = hashValue(`${input.ad.adID}:${input.placementID}:${expiresAt.toISOString()}`)

  const impressionURL = new URL('/v1/impression', input.origin).toString()

  const clickURL = new URL(`/r/${input.ad.adID}`, input.origin)
  clickURL.searchParams.set('p', input.placementID)
  clickURL.searchParams.set('n', nonce)

  return {
    ad_id: input.ad.adID,
    placement_id: input.placementID,
    title: input.ad.title,
    subtitle: input.ad.subtitle,
    icon_url: input.ad.iconURL,
    destination_url: input.ad.destinationURL,
    sponsored_label: input.ad.sponsoredLabel,
    creative: {
      headline: input.ad.title,
      body: input.ad.subtitle,
      cta: input.ad.cta,
      image_url: input.ad.iconURL,
      sponsored_label: input.ad.sponsoredLabel,
    },
    destination: {
      type: 'url',
      value: input.ad.destinationURL,
    },
    reporting: {
      impression_url: impressionURL,
      click_url: clickURL.toString(),
    },
    expiry: expiresAt.toISOString(),
    nonce,
  }
}

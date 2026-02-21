import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@guild-ads/shared'
import { hashValue, resolveServeWeekStart } from './common'

export interface ServedAd {
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
  ad: ServedAd
  origin: string
  placementID: string
}

interface CampaignRow {
  campaign_id: string
  app_id: string | null
  headline: string | null
  body: string | null
  cta_text: string | null
  destination_url: string | null
}

interface PurchaseCandidate {
  purchaseID: string
  percentagePurchased: number
  campaign: CampaignRow
}

interface PurchaseRow {
  purchase_id: string
  percentage_purchased: number
  status: string
  campaigns: unknown
}

interface EligibleCandidatesResult {
  candidates: PurchaseCandidate[]
  eligiblePurchasedPercentage: number
}

const PRIMARY_PURCHASE_STATUSES = ['confirmed']
const FORCE_FILL_FALLBACK_STATUSES = ['pending', 'confirmed', 'completed']

function normalizeCampaignRow(raw: unknown): CampaignRow | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }

  const row = Array.isArray(raw) ? raw[0] : raw
  if (!row || typeof row !== 'object') {
    return null
  }

  const campaignID = typeof (row as any).campaign_id === 'string' ? (row as any).campaign_id : null
  if (!campaignID) {
    return null
  }

  return {
    campaign_id: campaignID,
    app_id: typeof (row as any).app_id === 'string' ? (row as any).app_id : null,
    headline: typeof (row as any).headline === 'string' ? (row as any).headline : null,
    body: typeof (row as any).body === 'string' ? (row as any).body : null,
    cta_text: typeof (row as any).cta_text === 'string' ? (row as any).cta_text : null,
    destination_url: typeof (row as any).destination_url === 'string' ? (row as any).destination_url : null,
  }
}

function normalizePurchaseCandidate(row: unknown): PurchaseCandidate | null {
  if (!row || typeof row !== 'object') {
    return null
  }

  const purchaseID = typeof (row as any).purchase_id === 'string' ? (row as any).purchase_id : null
  if (!purchaseID) {
    return null
  }

  const campaign = normalizeCampaignRow((row as any).campaigns)
  if (!campaign || !campaign.destination_url) {
    return null
  }

  const rawPercentage = (row as any).percentage_purchased
  const percentagePurchased = typeof rawPercentage === 'number' && Number.isFinite(rawPercentage)
    ? Math.max(0, rawPercentage)
    : 0

  if (percentagePurchased <= 0) {
    return null
  }

  return {
    purchaseID,
    percentagePurchased,
    campaign,
  }
}

function chooseWeightedCandidate(candidates: PurchaseCandidate[]): PurchaseCandidate | null {
  if (candidates.length === 0) {
    return null
  }

  if (candidates.length === 1) {
    return candidates[0]
  }

  const totalWeight = candidates.reduce((sum, candidate) => sum + candidate.percentagePurchased, 0)
  if (totalWeight <= 0) {
    return candidates[Math.floor(Math.random() * candidates.length)]
  }

  let threshold = Math.random() * totalWeight
  for (const candidate of candidates) {
    threshold -= candidate.percentagePurchased
    if (threshold <= 0) {
      return candidate
    }
  }

  return candidates[candidates.length - 1]
}

async function fetchPurchaseRows(
  supabase: SupabaseClient<Database>,
  input: {
    statuses: string[]
    weekStart?: string
  }
): Promise<PurchaseRow[]> {
  let query = (supabase as any)
    .from('slot_purchases')
    .select(`
      purchase_id,
      percentage_purchased,
      status,
      campaigns!inner(
        campaign_id,
        app_id,
        headline,
        body,
        cta_text,
        destination_url
      ),
      weekly_slots!inner(week_start)
    `)
    .in('status', input.statuses)

  if (input.weekStart) {
    query = query.eq('weekly_slots.week_start', input.weekStart)
  }

  const { data: purchases, error } = await query

  if (error) {
    throw error
  }

  return (purchases ?? []) as PurchaseRow[]
}

async function fetchEligiblePurchaseCandidates(
  supabase: SupabaseClient<Database>,
  input: {
    publisherAppId: string
    statuses: string[]
    weekStart?: string
  }
): Promise<EligibleCandidatesResult> {
  const purchases = await fetchPurchaseRows(supabase, {
    statuses: input.statuses,
    weekStart: input.weekStart,
  })

  const candidates: PurchaseCandidate[] = []
  for (const purchase of purchases) {
    const candidate = normalizePurchaseCandidate(purchase)
    if (!candidate) {
      continue
    }

    // Never show self-promo in publisher apps.
    if (candidate.campaign.app_id === input.publisherAppId) {
      continue
    }

    candidates.push(candidate)
  }

  const eligiblePurchasedPercentage = candidates.reduce((sum, candidate) => {
    return sum + candidate.percentagePurchased
  }, 0)

  return { candidates, eligiblePurchasedPercentage }
}

async function buildServedAdFromCandidate(
  supabase: SupabaseClient<Database>,
  candidate: PurchaseCandidate
): Promise<ServedAd> {
  let promotedAppName = 'Sponsored App'
  let promotedAppSubtitle: string | null = null
  let promotedIconURL: string | null = null

  if (candidate.campaign.app_id) {
    const { data: promotedApp, error: promotedAppError } = await supabase
      .from('apps')
      .select('name, subtitle, icon_url')
      .eq('app_id', candidate.campaign.app_id)
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
    adID: candidate.purchaseID,
    campaignID: candidate.campaign.campaign_id,
    title: candidate.campaign.headline ?? promotedAppName,
    subtitle: candidate.campaign.body ?? promotedAppSubtitle ?? 'Discover this app',
    cta: candidate.campaign.cta_text ?? 'Learn More',
    iconURL: promotedIconURL,
    destinationURL: candidate.campaign.destination_url!,
    sponsoredLabel: 'Sponsored',
  }
}

async function fetchLatestCampaignPurchaseID(
  supabase: SupabaseClient<Database>,
  input: {
    campaignID: string
    statuses: string[]
    weekStart?: string
  }
): Promise<string | null> {
  let query = (supabase as any)
    .from('slot_purchases')
    .select('purchase_id, weekly_slots!inner(week_start)')
    .eq('campaign_id', input.campaignID)
    .in('status', input.statuses)
    .order('created_at', { ascending: false })
    .limit(1)

  if (input.weekStart) {
    query = query.eq('weekly_slots.week_start', input.weekStart)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  const purchaseID = Array.isArray(data) && data.length > 0 ? data[0]?.purchase_id : null
  return typeof purchaseID === 'string' ? purchaseID : null
}

export async function fetchAdByPurchaseID(
  supabase: SupabaseClient<Database>,
  purchaseID: string,
  publisherAppId?: string
): Promise<ServedAd | null> {
  const { data: purchase, error } = await (supabase as any)
    .from('slot_purchases')
    .select(`
      purchase_id,
      percentage_purchased,
      status,
      campaigns!inner(
        campaign_id,
        app_id,
        headline,
        body,
        cta_text,
        destination_url
      )
    `)
    .eq('purchase_id', purchaseID)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!purchase || purchase.status === 'canceled') {
    return null
  }

  const candidate = normalizePurchaseCandidate(purchase)
  if (!candidate) {
    return null
  }

  if (publisherAppId && candidate.campaign.app_id === publisherAppId) {
    return null
  }

  return buildServedAdFromCandidate(supabase, candidate)
}

export async function fetchAdByCampaignID(
  supabase: SupabaseClient<Database>,
  campaignID: string,
  publisherAppId?: string
): Promise<ServedAd | null> {
  const weekStart = resolveServeWeekStart()

  const weekPurchaseID = await fetchLatestCampaignPurchaseID(supabase, {
    campaignID,
    statuses: PRIMARY_PURCHASE_STATUSES,
    weekStart,
  })

  if (weekPurchaseID) {
    const weekAd = await fetchAdByPurchaseID(supabase, weekPurchaseID, publisherAppId)
    if (weekAd) {
      return weekAd
    }
  }

  const fallbackPurchaseID = await fetchLatestCampaignPurchaseID(supabase, {
    campaignID,
    statuses: PRIMARY_PURCHASE_STATUSES,
  })

  if (!fallbackPurchaseID) {
    return null
  }

  return fetchAdByPurchaseID(supabase, fallbackPurchaseID, publisherAppId)
}

export async function fetchWeightedAdForPublisher(
  supabase: SupabaseClient<Database>,
  input: {
    publisherAppId: string
    neverNoFill?: boolean
  }
): Promise<ServedAd | null> {
  const neverNoFill = input.neverNoFill === true
  const weekStart = resolveServeWeekStart()

  const weekCandidates = await fetchEligiblePurchaseCandidates(supabase, {
    publisherAppId: input.publisherAppId,
    statuses: PRIMARY_PURCHASE_STATUSES,
    weekStart,
  })

  let weekChoice: PurchaseCandidate | null = null
  if (!neverNoFill) {
    const noFillPercentage = Math.max(0, 100 - weekCandidates.eligiblePurchasedPercentage)
    if (Math.random() >= noFillPercentage / 100) {
      weekChoice = chooseWeightedCandidate(weekCandidates.candidates)
    }
  } else {
    weekChoice = chooseWeightedCandidate(weekCandidates.candidates)
  }

  if (weekChoice) {
    return buildServedAdFromCandidate(supabase, weekChoice)
  }

  if (!neverNoFill) {
    return null
  }

  // No-fill exempt publishers fall back to any confirmed week before returning empty.
  const fallbackCandidates = await fetchEligiblePurchaseCandidates(supabase, {
    publisherAppId: input.publisherAppId,
    statuses: PRIMARY_PURCHASE_STATUSES,
  })
  const fallbackChoice = chooseWeightedCandidate(fallbackCandidates.candidates)
  if (!fallbackChoice) {
    const broaderFallbackCandidates = await fetchEligiblePurchaseCandidates(supabase, {
      publisherAppId: input.publisherAppId,
      statuses: FORCE_FILL_FALLBACK_STATUSES,
    })
    const broaderFallbackChoice = chooseWeightedCandidate(broaderFallbackCandidates.candidates)
    if (!broaderFallbackChoice) {
      return null
    }

    return buildServedAdFromCandidate(supabase, broaderFallbackChoice)
  }

  return buildServedAdFromCandidate(supabase, fallbackChoice)
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

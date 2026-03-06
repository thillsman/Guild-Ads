import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildServeResponse, getWeightedAdDecisionForPublisher } from '@/lib/sdk-api/ad-serving'
import {
  extractToken,
  hashValue,
  isNoFillExemptPublisherUser,
  readJSONBody,
  resolvePublisherApp,
  resolveRequestOrigin,
  stringField,
} from '@/lib/sdk-api/common'
import { logServeAttempts } from '@/lib/sdk-api/serve-attempts'
import { getOrAssignStickyAd } from '@/lib/sdk-api/sticky-ads'
import type { PublisherApp } from '@/lib/sdk-api/common'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const supabase = createAdminClient()
  const body = await readJSONBody(request)
  const appIDHint = stringField(body, 'app_id')
  const placementID = stringField(body, 'placement_id')
  const userID = stringField(body, 'user_id')
  const token = extractToken(request, body)
  const sdkVersion = stringField(body, 'sdk_version')
  const osVersion = stringField(body, 'os_version')
  const locale = stringField(body, 'locale')

  if (!placementID) {
    return NextResponse.json({ error: 'placement_id is required' }, { status: 400 })
  }

  let publisherApp: PublisherApp | null = null

  try {
    publisherApp = await resolvePublisherApp(supabase, { token, appIDHint })
    if (!publisherApp) {
      return NextResponse.json({ error: 'Invalid app token or app_id' }, { status: 401 })
    }

    const neverNoFill = await isNoFillExemptPublisherUser(supabase, publisherApp.userId)

    // Hash the user ID for privacy
    const deviceIdHash = userID ? hashValue(userID) : null

    // Get sticky ad (same ad for user+placement for the whole week)
    if (!deviceIdHash) {
      if (!neverNoFill) {
        // No user ID - can't do sticky ads, return no fill.
        await logServeAttempts(supabase, [{
          appID: publisherApp.appId,
          campaignID: null,
          placementID,
          endpoint: 'serve',
          responseType: 'no_fill',
          decisionReason: 'missing_user_id',
          sdkVersion,
          osVersion,
          locale,
          deviceIdentifier: userID,
        }])
        return new NextResponse(null, { status: 204 })
      }

      const decision = await getWeightedAdDecisionForPublisher(supabase, {
        publisherAppId: publisherApp.appId,
        neverNoFill: true,
      })
      if (decision.kind === 'no_fill') {
        await logServeAttempts(supabase, [{
          appID: publisherApp.appId,
          campaignID: null,
          placementID,
          endpoint: 'serve',
          responseType: 'no_fill',
          decisionReason: decision.reason,
          sdkVersion,
          osVersion,
          locale,
          deviceIdentifier: userID,
        }])
        return new NextResponse(null, { status: 204 })
      }

      await logServeAttempts(supabase, [{
        appID: publisherApp.appId,
        campaignID: decision.ad.campaignID,
        slotPurchaseID: decision.ad.adID,
        placementID,
        endpoint: 'serve',
        responseType: 'ad',
        decisionReason: decision.reason,
        sdkVersion,
        osVersion,
        locale,
        deviceIdentifier: userID,
      }])

      const origin = resolveRequestOrigin(request)
      const response = buildServeResponse({
        ad: decision.ad,
        origin,
        placementID,
      })

      return NextResponse.json(response)
    }

    const result = await getOrAssignStickyAd(supabase, {
      deviceIdHash,
      publisherAppId: publisherApp.appId,
      placementId: placementID,
      neverNoFill,
    })

    if (result.kind === 'no_fill') {
      await logServeAttempts(supabase, [{
        appID: publisherApp.appId,
        campaignID: null,
        placementID,
        endpoint: 'serve',
        responseType: 'no_fill',
        decisionReason: result.reason,
        sdkVersion,
        osVersion,
        locale,
        deviceIdentifier: userID,
      }])
      return new NextResponse(null, { status: 204 })
    }

    await logServeAttempts(supabase, [{
      appID: publisherApp.appId,
      campaignID: result.ad.campaignID,
      slotPurchaseID: result.ad.adID,
      placementID,
      endpoint: 'serve',
      responseType: 'ad',
      decisionReason: result.reason,
      sdkVersion,
      osVersion,
      locale,
      deviceIdentifier: userID,
    }])

    const origin = resolveRequestOrigin(request)
    const ad = buildServeResponse({
      ad: result.ad,
      origin,
      placementID,
    })

    return NextResponse.json(ad)
  } catch (error) {
    if (publisherApp) {
      await logServeAttempts(supabase, [{
        appID: publisherApp.appId,
        campaignID: null,
        placementID,
        endpoint: 'serve',
        responseType: 'error',
        decisionReason: 'serve_handler_error',
        sdkVersion,
        osVersion,
        locale,
        deviceIdentifier: userID,
      }])
    }
    console.error('[sdk-api] /v1/serve failed', error)
    return NextResponse.json({ error: 'Failed to serve ad' }, { status: 500 })
  }
}

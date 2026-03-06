import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildServeResponse, getWeightedAdDecisionForPublisher } from '@/lib/sdk-api/ad-serving'
import {
  extractToken,
  hashValue,
  isNoFillExemptPublisherUser,
  objectField,
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
  const token = extractToken(request, body)
  const appIDHint = stringField(body, 'app_id')
  const userID = stringField(body, 'user_id')
  const sdkVersion = stringField(body, 'sdk_version')
  const deviceBody = objectField(body, 'device') ?? {}
  const osVersion = stringField(deviceBody, 'os_version')
  const locale = stringField(deviceBody, 'locale')
  const prefetchPlacements = Array.isArray(body.prefetch_placements) ? body.prefetch_placements : []
  let publisherApp: PublisherApp | null = null

  try {
    publisherApp = await resolvePublisherApp(supabase, { token, appIDHint })
    if (!publisherApp) {
      return NextResponse.json({ error: 'Invalid app token or app_id' }, { status: 401 })
    }

    const neverNoFill = await isNoFillExemptPublisherUser(supabase, publisherApp.userId)
    const origin = resolveRequestOrigin(request)
    const ads: Record<string, unknown> = {}
    const deviceIdHash = userID ? hashValue(userID) : null

    const placementsToFetch = prefetchPlacements
      .filter((p): p is string => typeof p === 'string')
      .map((placementId) => placementId.trim())
      .filter((placementId) => placementId.length > 0)
    const attemptLogs: Parameters<typeof logServeAttempts>[1] = []

    // If we have a device ID, fetch sticky ads for placements.
    if (deviceIdHash) {
      for (const placementId of placementsToFetch) {
        const result = await getOrAssignStickyAd(supabase, {
          deviceIdHash,
          publisherAppId: publisherApp.appId,
          placementId,
          neverNoFill,
        })

        if (result.kind === 'ad') {
          attemptLogs.push({
            appID: publisherApp.appId,
            campaignID: result.ad.campaignID,
            slotPurchaseID: result.ad.adID,
            placementID: placementId,
            endpoint: 'launch',
            responseType: 'ad',
            decisionReason: result.reason,
            sdkVersion,
            osVersion,
            locale,
            deviceIdentifier: userID,
          })
          ads[placementId] = buildServeResponse({
            ad: result.ad,
            origin,
            placementID: placementId,
          })
          continue
        }

        attemptLogs.push({
          appID: publisherApp.appId,
          campaignID: null,
          placementID: placementId,
          endpoint: 'launch',
          responseType: 'no_fill',
          decisionReason: result.reason,
          sdkVersion,
          osVersion,
          locale,
          deviceIdentifier: userID,
        })
      }
    } else if (neverNoFill) {
      // No device ID means no stickiness, but no-fill exempt publishers should still receive ads.
      for (const placementId of placementsToFetch) {
        const decision = await getWeightedAdDecisionForPublisher(supabase, {
          publisherAppId: publisherApp.appId,
          neverNoFill: true,
        })

        if (decision.kind === 'no_fill') {
          attemptLogs.push({
            appID: publisherApp.appId,
            campaignID: null,
            placementID: placementId,
            endpoint: 'launch',
            responseType: 'no_fill',
            decisionReason: decision.reason,
            sdkVersion,
            osVersion,
            locale,
            deviceIdentifier: userID,
          })
          continue
        }

        attemptLogs.push({
          appID: publisherApp.appId,
          campaignID: decision.ad.campaignID,
          slotPurchaseID: decision.ad.adID,
          placementID: placementId,
          endpoint: 'launch',
          responseType: 'ad',
          decisionReason: decision.reason,
          sdkVersion,
          osVersion,
          locale,
          deviceIdentifier: userID,
        })

        ads[placementId] = buildServeResponse({
          ad: decision.ad,
          origin,
          placementID: placementId,
        })
      }
    } else {
      for (const placementId of placementsToFetch) {
        attemptLogs.push({
          appID: publisherApp.appId,
          campaignID: null,
          placementID: placementId,
          endpoint: 'launch',
          responseType: 'no_fill',
          decisionReason: 'missing_user_id',
          sdkVersion,
          osVersion,
          locale,
          deviceIdentifier: userID,
        })
      }
    }

    await logServeAttempts(supabase, attemptLogs)

    return NextResponse.json({ ok: true, ads })
  } catch (error) {
    if (publisherApp) {
      const placementsToLog = prefetchPlacements
        .filter((p): p is string => typeof p === 'string')
        .map((placementId) => placementId.trim())
        .filter((placementId) => placementId.length > 0)
      const publisherAppId = publisherApp.appId

      await logServeAttempts(supabase, placementsToLog.map((placementId) => ({
        appID: publisherAppId,
        campaignID: null,
        placementID: placementId,
        endpoint: 'launch' as const,
        responseType: 'error' as const,
        decisionReason: 'launch_handler_error',
        sdkVersion,
        osVersion,
        locale,
        deviceIdentifier: userID,
      })))
    }
    console.error('[sdk-api] /v1/events/launch failed', error)
    return NextResponse.json({ error: 'Failed to process launch event' }, { status: 500 })
  }
}

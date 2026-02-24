import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildServeResponse, fetchWeightedAdForPublisher } from '@/lib/sdk-api/ad-serving'
import {
  extractToken,
  hashValue,
  isNoFillExemptPublisherUser,
  readJSONBody,
  resolvePublisherApp,
  resolveRequestOrigin,
  stringField,
} from '@/lib/sdk-api/common'
import { getOrAssignStickyAd } from '@/lib/sdk-api/sticky-ads'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const supabase = createAdminClient()
  const body = await readJSONBody(request)
  const token = extractToken(request, body)
  const appIDHint = stringField(body, 'app_id')
  const userID = stringField(body, 'user_id')
  const prefetchPlacements = Array.isArray(body.prefetch_placements) ? body.prefetch_placements : []

  try {
    const publisherApp = await resolvePublisherApp(supabase, { token, appIDHint })
    if (!publisherApp) {
      return NextResponse.json({ error: 'Invalid app token or app_id' }, { status: 401 })
    }

    const neverNoFill = await isNoFillExemptPublisherUser(supabase, publisherApp.userId)
    const origin = resolveRequestOrigin(request)
    const ads: Record<string, unknown> = {}
    const deviceIdHash = userID ? hashValue(userID) : null

    const placementsToFetch = prefetchPlacements.length > 0
      ? prefetchPlacements.filter((p): p is string => typeof p === 'string')
      : ['default']

    // If we have a device ID, fetch sticky ads for placements.
    if (deviceIdHash) {
      for (const placementId of placementsToFetch) {
        const result = await getOrAssignStickyAd(supabase, {
          deviceIdHash,
          publisherAppId: publisherApp.appId,
          placementId,
          neverNoFill,
        })

        if (result) {
          ads[placementId] = buildServeResponse({
            ad: result.ad,
            origin,
            placementID: placementId,
          })
        }
      }
    } else if (neverNoFill) {
      // No device ID means no stickiness, but no-fill exempt publishers should still receive ads.
      for (const placementId of placementsToFetch) {
        const ad = await fetchWeightedAdForPublisher(supabase, {
          publisherAppId: publisherApp.appId,
          neverNoFill: true,
        })
        if (!ad) {
          continue
        }

        ads[placementId] = buildServeResponse({
          ad,
          origin,
          placementID: placementId,
        })
      }
    }

    return NextResponse.json({ ok: true, ads })
  } catch (error) {
    console.error('[sdk-api] /v1/events/launch failed', error)
    return NextResponse.json({ error: 'Failed to process launch event' }, { status: 500 })
  }
}

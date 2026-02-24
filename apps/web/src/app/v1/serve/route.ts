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
  const appIDHint = stringField(body, 'app_id')
  const placementID = stringField(body, 'placement_id')
  const userID = stringField(body, 'user_id')
  const token = extractToken(request, body)

  if (!placementID) {
    return NextResponse.json({ error: 'placement_id is required' }, { status: 400 })
  }

  try {
    const publisherApp = await resolvePublisherApp(supabase, { token, appIDHint })
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
        return new NextResponse(null, { status: 204 })
      }

      const ad = await fetchWeightedAdForPublisher(supabase, {
        publisherAppId: publisherApp.appId,
        neverNoFill: true,
      })
      if (!ad) {
        return new NextResponse(null, { status: 204 })
      }

      const origin = resolveRequestOrigin(request)
      const response = buildServeResponse({
        ad,
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

    if (!result) {
      return new NextResponse(null, { status: 204 })
    }

    const origin = resolveRequestOrigin(request)
    const ad = buildServeResponse({
      ad: result.ad,
      origin,
      placementID,
    })

    return NextResponse.json(ad)
  } catch (error) {
    console.error('[sdk-api] /v1/serve failed', error)
    return NextResponse.json({ error: 'Failed to serve ad' }, { status: 500 })
  }
}

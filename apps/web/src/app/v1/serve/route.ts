import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAdRequest } from '@/lib/sdk-api/ad-requests'
import { buildServeResponse, fetchHardcodedAd } from '@/lib/sdk-api/ad-serving'
import { extractToken, readJSONBody, resolvePublisherApp, stringField } from '@/lib/sdk-api/common'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const supabase = createAdminClient()
  const body = await readJSONBody(request)
  const appIDHint = stringField(body, 'app_id')
  const placementID = stringField(body, 'placement_id')
  const sdkVersion = stringField(body, 'sdk_version')
  const locale = stringField(body, 'locale')
  const osVersion = stringField(body, 'os_version')
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

    const hardcodedAd = await fetchHardcodedAd(supabase)
    if (!hardcodedAd) {
      await logAdRequest(supabase, {
        appID: publisherApp.appId,
        campaignID: null,
        responseType: 'no_fill',
        sdkVersion,
        osVersion,
        locale,
        deviceIdentifier: userID,
      })

      return new NextResponse(null, { status: 204 })
    }

    await logAdRequest(supabase, {
      appID: publisherApp.appId,
      campaignID: hardcodedAd.campaignID,
      responseType: 'ad',
      sdkVersion,
      osVersion,
      locale,
      deviceIdentifier: userID,
    })

    const origin = new URL(request.url).origin
    const ad = buildServeResponse({
      ad: hardcodedAd,
      origin,
      placementID,
    })

    return NextResponse.json(ad)
  } catch (error) {
    console.error('[sdk-api] /v1/serve failed', error)
    return NextResponse.json({ error: 'Failed to serve ad' }, { status: 500 })
  }
}

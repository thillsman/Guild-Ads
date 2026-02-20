import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAdRequest } from '@/lib/sdk-api/ad-requests'
import { buildServeResponse, fetchHardcodedAd } from '@/lib/sdk-api/ad-serving'
import { extractToken, readJSONBody, resolvePublisherApp, resolveRequestOrigin, stringField } from '@/lib/sdk-api/common'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const supabase = createAdminClient()
  const body = await readJSONBody(request)
  const token = extractToken(request, body)
  const appIDHint = stringField(body, 'app_id')
  const adID = stringField(body, 'ad_id')
  const placementID = stringField(body, 'placement_id') ?? 'default'
  const sdkVersion = stringField(body, 'sdk_version')
  const locale = stringField(body, 'locale')
  const osVersion = stringField(body, 'os_version')
  const userID = stringField(body, 'user_id')

  if (!adID) {
    return NextResponse.json({ error: 'ad_id is required' }, { status: 400 })
  }

  try {
    const publisherApp = await resolvePublisherApp(supabase, { token, appIDHint })
    if (!publisherApp) {
      return NextResponse.json({ error: 'Invalid app token or app_id' }, { status: 401 })
    }

    const hardcodedAd = await fetchHardcodedAd(supabase)
    if (!hardcodedAd || hardcodedAd.adID !== adID) {
      return NextResponse.json({ error: 'Unknown ad_id' }, { status: 404 })
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

    const origin = resolveRequestOrigin(request)
    const ad = buildServeResponse({
      ad: hardcodedAd,
      origin,
      placementID,
    })

    return NextResponse.json({ ok: true, ad })
  } catch (error) {
    console.error('[sdk-api] /v1/impression failed', error)
    return NextResponse.json({ error: 'Failed to log impression' }, { status: 500 })
  }
}

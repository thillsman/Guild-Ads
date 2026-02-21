import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { markLatestRequestClicked } from '@/lib/sdk-api/ad-requests'
import { fetchAdByPurchaseID } from '@/lib/sdk-api/ad-serving'
import { recordAdClick } from '@/lib/sdk-api/sticky-ads'
import { extractToken, hashValue, readJSONBody, resolvePublisherApp, stringField } from '@/lib/sdk-api/common'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const supabase = createAdminClient()
  const body = await readJSONBody(request)
  const token = extractToken(request, body)
  const appIDHint = stringField(body, 'app_id')
  const adID = stringField(body, 'ad_id')
  const placementID = stringField(body, 'placement_id') ?? 'default'
  const userID = stringField(body, 'user_id')

  if (!adID) {
    return NextResponse.json({ error: 'ad_id is required' }, { status: 400 })
  }

  try {
    const publisherApp = await resolvePublisherApp(supabase, { token, appIDHint })
    if (!publisherApp) {
      return NextResponse.json({ error: 'Invalid app token or app_id' }, { status: 401 })
    }

    const servedAd = await fetchAdByPurchaseID(supabase, adID)
    if (!servedAd) {
      return NextResponse.json({ error: 'Unknown ad_id' }, { status: 404 })
    }

    await markLatestRequestClicked(supabase, {
      appID: publisherApp.appId,
      campaignID: servedAd.campaignID,
      placementID,
    })

    if (userID) {
      await recordAdClick(supabase, {
        deviceIdHash: hashValue(userID),
        publisherAppId: publisherApp.appId,
        placementId: placementID,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[sdk-api] /v1/events/click failed', error)
    return NextResponse.json({ error: 'Failed to log click' }, { status: 500 })
  }
}

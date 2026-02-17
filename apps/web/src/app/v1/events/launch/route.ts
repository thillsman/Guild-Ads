import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAdRequest } from '@/lib/sdk-api/ad-requests'
import { extractToken, readJSONBody, resolvePublisherApp, stringField } from '@/lib/sdk-api/common'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const supabase = createAdminClient()
  const body = await readJSONBody(request)
  const token = extractToken(request, body)
  const appIDHint = stringField(body, 'app_id')
  const sdkVersion = stringField(body, 'sdk_version')
  const locale = stringField(body, 'locale')
  const osVersion = stringField(body, 'os_version')
  const userID = stringField(body, 'user_id')

  try {
    const publisherApp = await resolvePublisherApp(supabase, { token, appIDHint })
    if (!publisherApp) {
      return NextResponse.json({ error: 'Invalid app token or app_id' }, { status: 401 })
    }

    await logAdRequest(supabase, {
      appID: publisherApp.appId,
      campaignID: null,
      responseType: 'no_fill',
      sdkVersion,
      osVersion,
      locale,
      deviceIdentifier: userID,
    })

    return NextResponse.json({ ok: true, ads: {} })
  } catch (error) {
    console.error('[sdk-api] /v1/events/launch failed', error)
    return NextResponse.json({ error: 'Failed to process launch event' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchAdByPurchaseID } from '@/lib/sdk-api/ad-serving'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  context: { params: { ad_id: string } }
) {
  const adID = context.params.ad_id

  if (!adID) {
    return NextResponse.json({ error: 'Ad not found' }, { status: 404 })
  }

  try {
    const supabase = createAdminClient()
    const servedAd = await fetchAdByPurchaseID(supabase, adID)

    if (!servedAd) {
      return NextResponse.json({ error: 'Ad not found' }, { status: 404 })
    }

    return NextResponse.redirect(servedAd.destinationURL, { status: 302 })
  } catch (error) {
    console.error('[sdk-api] /r/:ad_id failed', error)
    return NextResponse.json({ error: 'Redirect failed' }, { status: 500 })
  }
}

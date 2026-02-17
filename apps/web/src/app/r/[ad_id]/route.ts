import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchHardcodedAd } from '@/lib/sdk-api/ad-serving'
import { HARD_CODED_PURCHASE_ID } from '@/lib/sdk-api/common'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  context: { params: { ad_id: string } }
) {
  const adID = context.params.ad_id

  if (!adID || adID !== HARD_CODED_PURCHASE_ID) {
    return NextResponse.json({ error: 'Ad not found' }, { status: 404 })
  }

  try {
    const supabase = createAdminClient()
    const hardcodedAd = await fetchHardcodedAd(supabase)

    if (!hardcodedAd) {
      return NextResponse.json({ error: 'Ad not found' }, { status: 404 })
    }

    return NextResponse.redirect(hardcodedAd.destinationURL, { status: 302 })
  } catch (error) {
    console.error('[sdk-api] /r/:ad_id failed', error)
    return NextResponse.json({ error: 'Redirect failed' }, { status: 500 })
  }
}

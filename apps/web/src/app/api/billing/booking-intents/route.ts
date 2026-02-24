import { NextResponse } from 'next/server'
import { createAdminClient, getAuthUser } from '@/lib/supabase/server'
import { createBookingIntent } from '@/lib/billing/booking-intents'

export const dynamic = 'force-dynamic'

interface CreateBookingIntentBody {
  campaignId?: unknown
  slotId?: unknown
  percentage?: unknown
  applyCredits?: unknown
}

export async function POST(request: Request) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: CreateBookingIntentBody = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const campaignID = typeof body.campaignId === 'string' ? body.campaignId : null
  const slotID = typeof body.slotId === 'string' ? body.slotId : null
  const percentage = typeof body.percentage === 'number' ? body.percentage : Number(body.percentage)
  const applyCredits = body.applyCredits === true

  if (!campaignID || !slotID || !Number.isFinite(percentage)) {
    return NextResponse.json({ error: 'campaignId, slotId, and percentage are required.' }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()
    const intent = await createBookingIntent(supabase, {
      userID: user.id,
      campaignID,
      slotID,
      percentage,
      applyCredits,
    })

    return NextResponse.json({
      bookingIntentId: intent.bookingIntentID,
      status: intent.status,
      quote: intent.quote,
      creditsAppliedCents: intent.quote.creditsAppliedCents,
      cashDueCents: intent.quote.cashDueCents,
      requiresCheckout: intent.requiresCheckout,
      isInternal: intent.isInternal,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create booking intent.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}


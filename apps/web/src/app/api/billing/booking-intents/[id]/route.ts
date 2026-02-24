import { NextResponse } from 'next/server'
import { createAdminClient, getAuthUser } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: {
    id: string
  }
}

export async function GET(_request: Request, context: RouteContext) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const bookingIntentID = context.params.id
  if (!bookingIntentID) {
    return NextResponse.json({ error: 'Missing booking intent ID.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: intent, error } = await (supabase as any)
    .from('billing_booking_intents')
    .select(`
      booking_intent_id,
      status,
      failure_reason,
      percentage_purchased,
      quoted_price_cents,
      credits_applied_cents,
      cash_due_cents,
      currency,
      stripe_checkout_session_id,
      stripe_payment_intent_id,
      stripe_refund_id,
      confirmed_purchase_id,
      created_at,
      updated_at,
      confirmed_at
    `)
    .eq('booking_intent_id', bookingIntentID)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: 'Failed to load booking intent.' }, { status: 500 })
  }

  if (!intent) {
    return NextResponse.json({ error: 'Booking intent not found.' }, { status: 404 })
  }

  return NextResponse.json({
    bookingIntentId: intent.booking_intent_id,
    status: intent.status,
    failureReason: intent.failure_reason,
    quote: {
      percentage: intent.percentage_purchased,
      quotedPriceCents: intent.quoted_price_cents,
      creditsAppliedCents: intent.credits_applied_cents,
      cashDueCents: intent.cash_due_cents,
      currency: intent.currency,
    },
    stripeCheckoutSessionId: intent.stripe_checkout_session_id,
    stripePaymentIntentId: intent.stripe_payment_intent_id,
    stripeRefundId: intent.stripe_refund_id,
    confirmedPurchaseId: intent.confirmed_purchase_id,
    createdAt: intent.created_at,
    updatedAt: intent.updated_at,
    confirmedAt: intent.confirmed_at,
  })
}


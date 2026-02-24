import { NextResponse } from 'next/server'
import { createAdminClient, getAuthUser } from '@/lib/supabase/server'
import { getStripe } from '@/lib/billing/stripe'

export const dynamic = 'force-dynamic'
const CHECKOUT_EXPIRY_SECONDS = 30 * 60

interface RouteContext {
  params: {
    id: string
  }
}

export async function POST(request: Request, context: RouteContext) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const bookingIntentID = context.params.id
  if (!bookingIntentID) {
    return NextResponse.json({ error: 'Missing booking intent ID.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: intent, error: intentError } = await (supabase as any)
    .from('billing_booking_intents')
    .select(`
      booking_intent_id,
      user_id,
      campaign_id,
      slot_id,
      percentage_purchased,
      quoted_price_cents,
      credits_applied_cents,
      cash_due_cents,
      currency,
      status,
      stripe_customer_id,
      stripe_checkout_session_id
    `)
    .eq('booking_intent_id', bookingIntentID)
    .eq('user_id', user.id)
    .maybeSingle()

  if (intentError) {
    return NextResponse.json({ error: 'Failed to load booking intent.' }, { status: 500 })
  }

  if (!intent) {
    return NextResponse.json({ error: 'Booking intent not found.' }, { status: 404 })
  }

  if (intent.status === 'confirmed') {
    return NextResponse.json({ error: 'Booking is already confirmed.' }, { status: 409 })
  }

  if (intent.status === 'refunded_capacity_conflict') {
    return NextResponse.json({ error: 'Booking intent is no longer valid.' }, { status: 409 })
  }

  if (typeof intent.cash_due_cents !== 'number' || intent.cash_due_cents <= 0) {
    return NextResponse.json({ error: 'No checkout required for this booking intent.' }, { status: 400 })
  }

  try {
    const stripe = getStripe()
    let stripeCustomerID = typeof intent.stripe_customer_id === 'string' ? intent.stripe_customer_id : null

    if (!stripeCustomerID) {
      const { data: existingCustomer } = await (supabase as any)
        .from('billing_customers')
        .select('stripe_customer_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (existingCustomer?.stripe_customer_id) {
        stripeCustomerID = existingCustomer.stripe_customer_id
      } else {
        const createdCustomer = await stripe.customers.create({
          email: user.email || undefined,
          metadata: {
            user_id: user.id,
          },
        })

        stripeCustomerID = createdCustomer.id

        await (supabase as any)
          .from('billing_customers')
          .upsert({
            user_id: user.id,
            stripe_customer_id: stripeCustomerID,
            updated_at: new Date().toISOString(),
          })
      }
    }

    const requestURL = new URL(request.url)
    const appBaseURL = process.env.APP_BASE_URL ?? requestURL.origin
    const successURL = `${appBaseURL}/dashboard/book?booking_intent=${bookingIntentID}&checkout=success`
    const cancelURL = `${appBaseURL}/dashboard/book?booking_intent=${bookingIntentID}&checkout=cancel`

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: stripeCustomerID,
      expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_EXPIRY_SECONDS,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: intent.cash_due_cents,
            product_data: {
              name: `Guild Ads booking (${intent.percentage_purchased}% network share)`,
            },
          },
        },
      ],
      success_url: successURL,
      cancel_url: cancelURL,
      metadata: {
        booking_intent_id: bookingIntentID,
        user_id: user.id,
        slot_id: String(intent.slot_id),
        campaign_id: String(intent.campaign_id),
        percentage: String(intent.percentage_purchased),
        quoted_price_cents: String(intent.quoted_price_cents),
        credits_applied_cents: String(intent.credits_applied_cents),
        cash_due_cents: String(intent.cash_due_cents),
      },
      payment_intent_data: {
        metadata: {
          booking_intent_id: bookingIntentID,
          user_id: user.id,
        },
      },
    })

    await (supabase as any)
      .from('billing_booking_intents')
      .update({
        status: 'awaiting_payment',
        stripe_customer_id: stripeCustomerID,
        stripe_checkout_session_id: session.id,
        updated_at: new Date().toISOString(),
      })
      .eq('booking_intent_id', bookingIntentID)

    return NextResponse.json({
      bookingIntentId: bookingIntentID,
      checkoutSessionId: session.id,
      checkoutURL: session.url,
      status: 'awaiting_payment',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create checkout session.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

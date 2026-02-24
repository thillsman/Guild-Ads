import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { captureCreditHold, releaseCreditHold } from '@/lib/billing/credits'
import { getStripe, getStripeWebhookSecret } from '@/lib/billing/stripe'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function getExistingEventStatus(
  supabase: ReturnType<typeof createAdminClient>,
  eventID: string
): Promise<{ processed: boolean } | null> {
  const { data, error } = await (supabase as any)
    .from('billing_webhook_events')
    .select('processed')
    .eq('provider', 'stripe')
    .eq('external_event_id', eventID)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  return { processed: data.processed === true }
}

async function upsertWebhookEvent(
  supabase: ReturnType<typeof createAdminClient>,
  event: Stripe.Event
): Promise<void> {
  const { error } = await (supabase as any)
    .from('billing_webhook_events')
    .upsert({
      provider: 'stripe',
      external_event_id: event.id,
      event_type: event.type,
      payload: event,
      processed: false,
      processing_error: null,
    }, {
      onConflict: 'provider,external_event_id',
      ignoreDuplicates: false,
    })

  if (error) {
    throw error
  }
}

async function markWebhookProcessed(
  supabase: ReturnType<typeof createAdminClient>,
  eventID: string
): Promise<void> {
  await (supabase as any)
    .from('billing_webhook_events')
    .update({
      processed: true,
      processed_at: new Date().toISOString(),
      processing_error: null,
    })
    .eq('provider', 'stripe')
    .eq('external_event_id', eventID)
}

async function markWebhookFailed(
  supabase: ReturnType<typeof createAdminClient>,
  eventID: string,
  errorMessage: string
): Promise<void> {
  await (supabase as any)
    .from('billing_webhook_events')
    .update({
      processed: false,
      processing_error: errorMessage,
    })
    .eq('provider', 'stripe')
    .eq('external_event_id', eventID)
}

async function findBookingIntent(
  supabase: ReturnType<typeof createAdminClient>,
  input: {
    bookingIntentID?: string | null
    checkoutSessionID?: string | null
    paymentIntentID?: string | null
  }
) {
  if (input.bookingIntentID) {
    const { data } = await (supabase as any)
      .from('billing_booking_intents')
      .select('*')
      .eq('booking_intent_id', input.bookingIntentID)
      .maybeSingle()
    return data
  }

  if (input.checkoutSessionID) {
    const { data } = await (supabase as any)
      .from('billing_booking_intents')
      .select('*')
      .eq('stripe_checkout_session_id', input.checkoutSessionID)
      .maybeSingle()
    return data
  }

  if (input.paymentIntentID) {
    const { data } = await (supabase as any)
      .from('billing_booking_intents')
      .select('*')
      .eq('stripe_payment_intent_id', input.paymentIntentID)
      .maybeSingle()
    return data
  }

  return null
}

async function confirmBookingAfterPayment(
  supabase: ReturnType<typeof createAdminClient>,
  stripe: Stripe,
  input: {
    bookingIntentID: string
    paymentIntentID: string | null
    checkoutSessionID: string | null
  }
): Promise<void> {
  const intent = await findBookingIntent(supabase, {
    bookingIntentID: input.bookingIntentID,
  })

  if (!intent) {
    return
  }

  if (intent.status === 'confirmed' || intent.status === 'refunded_capacity_conflict') {
    return
  }

  await (supabase as any)
    .from('billing_booking_intents')
    .update({
      status: 'processing',
      stripe_payment_intent_id: input.paymentIntentID ?? intent.stripe_payment_intent_id,
      stripe_checkout_session_id: input.checkoutSessionID ?? intent.stripe_checkout_session_id,
      updated_at: new Date().toISOString(),
    })
    .eq('booking_intent_id', input.bookingIntentID)

  const { data: confirmationRows, error: confirmError } = await (supabase as any).rpc('confirm_booking_intent_atomic', {
    p_booking_intent_id: input.bookingIntentID,
  })

  if (confirmError) {
    await releaseCreditHold(supabase, {
      bookingIntentID: input.bookingIntentID,
      reason: 'confirm_error',
    })
    throw confirmError
  }

  const confirmation = Array.isArray(confirmationRows) ? confirmationRows[0] : null
  if (confirmation?.success === true) {
    await captureCreditHold(supabase, {
      bookingIntentID: input.bookingIntentID,
    })
    return
  }

  await releaseCreditHold(supabase, {
    bookingIntentID: input.bookingIntentID,
    reason: confirmation?.reason ?? 'confirmation_failed',
  })

  if (confirmation?.reason === 'capacity_exceeded' && input.paymentIntentID) {
    const refund = await stripe.refunds.create({
      payment_intent: input.paymentIntentID,
      metadata: {
        booking_intent_id: input.bookingIntentID,
        reason: 'capacity_exceeded',
      },
    })

    await (supabase as any)
      .from('billing_booking_intents')
      .update({
        status: 'refunded_capacity_conflict',
        failure_reason: 'capacity_exceeded',
        stripe_refund_id: refund.id,
        updated_at: new Date().toISOString(),
      })
      .eq('booking_intent_id', input.bookingIntentID)
  } else {
    await (supabase as any)
      .from('billing_booking_intents')
      .update({
        status: 'failed',
        failure_reason: confirmation?.reason ?? 'confirmation_failed',
        updated_at: new Date().toISOString(),
      })
      .eq('booking_intent_id', input.bookingIntentID)
  }
}

async function handleStripeEvent(
  supabase: ReturnType<typeof createAdminClient>,
  stripe: Stripe,
  event: Stripe.Event
): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const bookingIntentID = session.metadata?.booking_intent_id ?? null
      const paymentIntentID = typeof session.payment_intent === 'string' ? session.payment_intent : null

      if (!bookingIntentID) {
        return
      }

      await (supabase as any)
        .from('billing_booking_intents')
        .update({
          status: 'processing',
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: paymentIntentID,
          updated_at: new Date().toISOString(),
        })
        .eq('booking_intent_id', bookingIntentID)

      if (session.payment_status === 'paid') {
        await confirmBookingAfterPayment(supabase, stripe, {
          bookingIntentID,
          paymentIntentID,
          checkoutSessionID: session.id,
        })
      }
      return
    }
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      const metadataBookingIntentID = paymentIntent.metadata?.booking_intent_id ?? null

      const intent = await findBookingIntent(supabase, {
        bookingIntentID: metadataBookingIntentID,
        paymentIntentID: paymentIntent.id,
      })

      if (!intent?.booking_intent_id) {
        return
      }

      await confirmBookingAfterPayment(supabase, stripe, {
        bookingIntentID: intent.booking_intent_id,
        paymentIntentID: paymentIntent.id,
        checkoutSessionID: intent.stripe_checkout_session_id ?? null,
      })
      return
    }
    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      const metadataBookingIntentID = paymentIntent.metadata?.booking_intent_id ?? null
      const intent = await findBookingIntent(supabase, {
        bookingIntentID: metadataBookingIntentID,
        paymentIntentID: paymentIntent.id,
      })

      if (!intent?.booking_intent_id) {
        return
      }

      await releaseCreditHold(supabase, {
        bookingIntentID: intent.booking_intent_id,
        reason: 'payment_failed',
      })

      await (supabase as any)
        .from('billing_booking_intents')
        .update({
          status: 'failed',
          failure_reason: 'payment_failed',
          stripe_payment_intent_id: paymentIntent.id,
          updated_at: new Date().toISOString(),
        })
        .eq('booking_intent_id', intent.booking_intent_id)
      return
    }
    case 'checkout.session.expired': {
      const session = event.data.object as Stripe.Checkout.Session
      const bookingIntentID = session.metadata?.booking_intent_id ?? null
      if (!bookingIntentID) {
        return
      }

      await releaseCreditHold(supabase, {
        bookingIntentID,
        reason: 'checkout_expired',
      })

      await (supabase as any)
        .from('billing_booking_intents')
        .update({
          status: 'expired',
          failure_reason: 'checkout_expired',
          updated_at: new Date().toISOString(),
        })
        .eq('booking_intent_id', bookingIntentID)
      return
    }
    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge
      const paymentIntentID = typeof charge.payment_intent === 'string' ? charge.payment_intent : null
      const intent = await findBookingIntent(supabase, {
        paymentIntentID,
      })

      if (!intent?.booking_intent_id) {
        return
      }

      const firstRefund = charge.refunds?.data?.[0]
      await releaseCreditHold(supabase, {
        bookingIntentID: intent.booking_intent_id,
        reason: 'charge_refunded',
      })

      await (supabase as any)
        .from('billing_booking_intents')
        .update({
          status: 'refunded_capacity_conflict',
          stripe_refund_id: firstRefund?.id ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('booking_intent_id', intent.booking_intent_id)
      return
    }
    default:
      return
  }
}

export async function POST(request: Request) {
  const stripe = getStripe()
  const webhookSecret = getStripeWebhookSecret()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header.' }, { status: 400 })
  }

  const rawBody = await request.text()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid Stripe webhook signature.'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const supabase = createAdminClient()
  try {
    const existing = await getExistingEventStatus(supabase, event.id)
    if (existing?.processed) {
      return NextResponse.json({ received: true, duplicate: true })
    }

    await upsertWebhookEvent(supabase, event)
    await handleStripeEvent(supabase, stripe, event)
    await markWebhookProcessed(supabase, event.id)

    return NextResponse.json({ received: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process Stripe webhook.'
    await markWebhookFailed(supabase, event.id, message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


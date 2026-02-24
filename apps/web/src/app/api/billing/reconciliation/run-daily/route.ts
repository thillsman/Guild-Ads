import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { captureCreditHold, releaseCreditHold } from '@/lib/billing/credits'
import { getStripe } from '@/lib/billing/stripe'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const STALE_SCAN_MINUTES = 10
const FORCED_CHECKOUT_EXPIRY_MINUTES = 45

function hasCronSecret(request: Request): boolean {
  const secret = process.env.BILLING_CRON_SECRET
  if (!secret) {
    return false
  }

  const authHeader = request.headers.get('authorization')
  const bearer = authHeader?.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : null

  const headerSecret = request.headers.get('x-billing-cron-secret')
  return bearer === secret || headerSecret === secret
}

export async function POST(request: Request) {
  if (!hasCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const stripe = getStripe()
  const staleThreshold = new Date(Date.now() - STALE_SCAN_MINUTES * 60 * 1000).toISOString()
  const forceExpireBefore = Date.now() - FORCED_CHECKOUT_EXPIRY_MINUTES * 60 * 1000

  const { data: intents, error } = await (supabase as any)
    .from('billing_booking_intents')
    .select(`
      booking_intent_id,
      status,
      stripe_checkout_session_id,
      stripe_payment_intent_id,
      created_at
    `)
    .in('status', ['awaiting_payment', 'processing'])
    .lte('updated_at', staleThreshold)
    .order('updated_at', { ascending: true })
    .limit(200)

  if (error) {
    return NextResponse.json({ error: 'Failed to load stale booking intents.' }, { status: 500 })
  }

  let confirmed = 0
  let expired = 0
  let failed = 0

  for (const intent of (intents ?? [])) {
    const bookingIntentID = intent.booking_intent_id as string
    const status = typeof intent.status === 'string' ? intent.status : ''
    const checkoutSessionID = typeof intent.stripe_checkout_session_id === 'string' ? intent.stripe_checkout_session_id : null
    let paymentIntentID = typeof intent.stripe_payment_intent_id === 'string' ? intent.stripe_payment_intent_id : null
    const createdAtMs = typeof intent.created_at === 'string' ? new Date(intent.created_at).getTime() : NaN

    try {
      if (!checkoutSessionID && status === 'awaiting_payment') {
        await releaseCreditHold(supabase, {
          bookingIntentID,
          reason: 'missing_checkout_session',
        })
        await (supabase as any)
          .from('billing_booking_intents')
          .update({
            status: 'failed',
            failure_reason: 'missing_checkout_session',
            updated_at: new Date().toISOString(),
          })
          .eq('booking_intent_id', bookingIntentID)

        failed += 1
        continue
      }

      if (checkoutSessionID) {
        const session = await stripe.checkout.sessions.retrieve(checkoutSessionID)
        if (!paymentIntentID && typeof session.payment_intent === 'string') {
          paymentIntentID = session.payment_intent
        }

        if (
          session.status === 'open' &&
          session.payment_status !== 'paid' &&
          Number.isFinite(createdAtMs) &&
          createdAtMs <= forceExpireBefore
        ) {
          try {
            await stripe.checkout.sessions.expire(checkoutSessionID)
          } catch {
            // Ignore expiration race errors; we still mark intent as expired below.
          }

          await releaseCreditHold(supabase, {
            bookingIntentID,
            reason: 'checkout_expired_timeout',
          })
          await (supabase as any)
            .from('billing_booking_intents')
            .update({
              status: 'expired',
              failure_reason: 'checkout_expired_timeout',
              updated_at: new Date().toISOString(),
            })
            .eq('booking_intent_id', bookingIntentID)

          expired += 1
          continue
        }

        if (session.status === 'expired') {
          await releaseCreditHold(supabase, {
            bookingIntentID,
            reason: 'checkout_expired_reconciliation',
          })
          await (supabase as any)
            .from('billing_booking_intents')
            .update({
              status: 'expired',
              failure_reason: 'checkout_expired',
              updated_at: new Date().toISOString(),
            })
            .eq('booking_intent_id', bookingIntentID)
          expired += 1
          continue
        }

        if (session.payment_status === 'paid') {
          await (supabase as any)
            .from('billing_booking_intents')
            .update({
              status: 'processing',
              stripe_payment_intent_id: paymentIntentID,
              updated_at: new Date().toISOString(),
            })
            .eq('booking_intent_id', bookingIntentID)

          const { data: confirmationRows, error: confirmError } = await (supabase as any).rpc('confirm_booking_intent_atomic', {
            p_booking_intent_id: bookingIntentID,
          })

          if (confirmError) {
            throw confirmError
          }

          const confirmation = Array.isArray(confirmationRows) ? confirmationRows[0] : null
          if (confirmation?.success === true) {
            await captureCreditHold(supabase, {
              bookingIntentID,
            })
            confirmed += 1
            continue
          }
        }
      }
    } catch (reconcileError) {
      failed += 1
      await releaseCreditHold(supabase, {
        bookingIntentID,
        reason: 'reconciliation_error',
      })
      await (supabase as any)
        .from('billing_booking_intents')
        .update({
          status: 'failed',
          failure_reason: reconcileError instanceof Error ? reconcileError.message : 'reconciliation_error',
          updated_at: new Date().toISOString(),
        })
        .eq('booking_intent_id', bookingIntentID)
    }
  }

  return NextResponse.json({
    ok: true,
    scanned: (intents ?? []).length,
    confirmed,
    expired,
    failed,
  })
}

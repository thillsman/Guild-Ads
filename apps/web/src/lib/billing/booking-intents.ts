import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@guild-ads/shared'
import { createCreditHold, captureCreditHold, getSpendableCreditBalance, releaseCreditHold } from './credits'
import { getInternalAccountPolicy } from './internal-accounts'
import { isNextSundayUTC } from './time'

export interface BookingIntentResponse {
  bookingIntentID: string
  status: string
  quote: {
    percentage: number
    quotedPriceCents: number
    creditsAppliedCents: number
    cashDueCents: number
    currency: string
  }
  requiresCheckout: boolean
  isInternal: boolean
}

function asInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value)
  }
  return null
}

export async function createBookingIntent(
  supabase: SupabaseClient<Database>,
  input: {
    userID: string
    campaignID: string
    slotID: string
    percentage: number
    applyCredits: boolean
  }
): Promise<BookingIntentResponse> {
  const percentage = Math.round(input.percentage)
  if (!Number.isFinite(percentage) || percentage < 1 || percentage > 40) {
    throw new Error('Percentage must be between 1 and 40.')
  }

  const { data: campaign, error: campaignError } = await (supabase as any)
    .from('campaigns')
    .select('campaign_id, user_id, status')
    .eq('campaign_id', input.campaignID)
    .eq('user_id', input.userID)
    .maybeSingle()

  if (campaignError) {
    throw campaignError
  }

  if (!campaign) {
    throw new Error('Campaign not found.')
  }

  const { data: slot, error: slotError } = await (supabase as any)
    .from('weekly_slots')
    .select('slot_id, week_start, base_price_cents')
    .eq('slot_id', input.slotID)
    .maybeSingle()

  if (slotError) {
    throw slotError
  }

  if (!slot) {
    throw new Error('Slot not found.')
  }

  if (!isNextSundayUTC(slot.week_start)) {
    throw new Error('Only next week bookings are purchasable right now.')
  }

  const basePriceCents = asInt(slot.base_price_cents)
  if (basePriceCents === null || basePriceCents < 0) {
    throw new Error('Invalid slot pricing data.')
  }

  const quotedPriceCents = Math.round((basePriceCents * percentage) / 100)
  const internalPolicy = await getInternalAccountPolicy(supabase, input.userID)
  const spendableCredits = input.applyCredits ? await getSpendableCreditBalance(supabase, input.userID) : 0
  const creditsAppliedCents = Math.max(0, Math.min(spendableCredits, quotedPriceCents))

  const bypassCashDue = internalPolicy.active && internalPolicy.canBypassCheckout
  const cashDueCents = bypassCashDue ? 0 : Math.max(0, quotedPriceCents - creditsAppliedCents)
  const initialStatus = cashDueCents > 0 ? 'created' : 'processing'

  const { data: intent, error: intentError } = await (supabase as any)
    .from('billing_booking_intents')
    .insert({
      user_id: input.userID,
      campaign_id: input.campaignID,
      slot_id: input.slotID,
      percentage_purchased: percentage,
      quoted_price_cents: quotedPriceCents,
      credits_applied_cents: creditsAppliedCents,
      cash_due_cents: cashDueCents,
      status: initialStatus,
      is_internal: internalPolicy.active && internalPolicy.canBypassCheckout,
    })
    .select('booking_intent_id, status')
    .single()

  if (intentError) {
    throw intentError
  }

  const bookingIntentID = intent.booking_intent_id as string

  if (creditsAppliedCents > 0) {
    await createCreditHold(supabase, {
      userID: input.userID,
      bookingIntentID,
      amountCents: creditsAppliedCents,
    })
  }

  let status = intent.status as string
  if (cashDueCents === 0) {
    const { data: confirmationRows, error: confirmError } = await (supabase as any).rpc('confirm_booking_intent_atomic', {
      p_booking_intent_id: bookingIntentID,
    })

    if (confirmError) {
      await releaseCreditHold(supabase, {
        bookingIntentID,
        reason: 'confirm_error',
      })
      throw confirmError
    }

    const confirmation = Array.isArray(confirmationRows) ? confirmationRows[0] : null
    if (!confirmation || confirmation.success !== true) {
      await releaseCreditHold(supabase, {
        bookingIntentID,
        reason: confirmation?.reason ?? 'confirm_failed',
      })
      status = confirmation?.reason === 'capacity_exceeded' ? 'refunded_capacity_conflict' : 'failed'
      await (supabase as any)
        .from('billing_booking_intents')
        .update({
          status,
          failure_reason: confirmation?.reason ?? 'confirm_failed',
          updated_at: new Date().toISOString(),
        })
        .eq('booking_intent_id', bookingIntentID)
    } else {
      await captureCreditHold(supabase, {
        bookingIntentID,
      })
      status = 'confirmed'
    }
  }

  return {
    bookingIntentID,
    status,
    quote: {
      percentage,
      quotedPriceCents,
      creditsAppliedCents,
      cashDueCents,
      currency: 'usd',
    },
    requiresCheckout: cashDueCents > 0,
    isInternal: internalPolicy.active && internalPolicy.canBypassCheckout,
  }
}


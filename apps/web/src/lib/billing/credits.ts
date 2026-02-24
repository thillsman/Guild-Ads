import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@guild-ads/shared'

export async function getCreditBalance(
  supabase: SupabaseClient<Database>,
  userID: string
): Promise<number> {
  const { data, error } = await (supabase as any).rpc('get_user_credit_balance', {
    p_user_id: userID,
  })

  if (error) {
    throw error
  }

  if (typeof data === 'number' && Number.isFinite(data)) {
    return data
  }

  return 0
}

export async function getHeldCreditBalance(
  supabase: SupabaseClient<Database>,
  userID: string
): Promise<number> {
  const { data, error } = await (supabase as any)
    .from('credit_holds')
    .select('amount_cents')
    .eq('user_id', userID)
    .eq('status', 'held')

  if (error) {
    throw error
  }

  return (data ?? []).reduce((sum: number, hold: { amount_cents: number }) => {
    return sum + (typeof hold.amount_cents === 'number' ? hold.amount_cents : 0)
  }, 0)
}

export async function getSpendableCreditBalance(
  supabase: SupabaseClient<Database>,
  userID: string
): Promise<number> {
  const [balance, held] = await Promise.all([
    getCreditBalance(supabase, userID),
    getHeldCreditBalance(supabase, userID),
  ])

  return Math.max(0, balance - held)
}

export async function createCreditHold(
  supabase: SupabaseClient<Database>,
  input: {
    userID: string
    bookingIntentID: string
    amountCents: number
  }
): Promise<void> {
  if (input.amountCents <= 0) {
    return
  }

  const { error } = await (supabase as any)
    .from('credit_holds')
    .insert({
      user_id: input.userID,
      booking_intent_id: input.bookingIntentID,
      amount_cents: input.amountCents,
      status: 'held',
    })

  if (error) {
    throw error
  }
}

export async function captureCreditHold(
  supabase: SupabaseClient<Database>,
  input: {
    bookingIntentID: string
  }
): Promise<void> {
  const { data: hold, error: holdError } = await (supabase as any)
    .from('credit_holds')
    .select('hold_id, user_id, amount_cents, status')
    .eq('booking_intent_id', input.bookingIntentID)
    .maybeSingle()

  if (holdError) {
    throw holdError
  }

  if (!hold || hold.status !== 'held') {
    return
  }

  const { error: ledgerError } = await (supabase as any)
    .from('credit_ledger_entries')
    .insert({
      user_id: hold.user_id,
      amount_cents: -hold.amount_cents,
      entry_type: 'booking_spend',
      source_table: 'billing_booking_intents',
      source_id: input.bookingIntentID,
      metadata: {
        hold_id: hold.hold_id,
      },
    })

  if (ledgerError) {
    throw ledgerError
  }

  const { error: holdUpdateError } = await (supabase as any)
    .from('credit_holds')
    .update({
      status: 'captured',
      updated_at: new Date().toISOString(),
    })
    .eq('hold_id', hold.hold_id)

  if (holdUpdateError) {
    throw holdUpdateError
  }
}

export async function releaseCreditHold(
  supabase: SupabaseClient<Database>,
  input: {
    bookingIntentID: string
    reason: string
  }
): Promise<void> {
  const { error } = await (supabase as any)
    .from('credit_holds')
    .update({
      status: 'released',
      released_reason: input.reason,
      updated_at: new Date().toISOString(),
    })
    .eq('booking_intent_id', input.bookingIntentID)
    .eq('status', 'held')

  if (error) {
    throw error
  }
}


import { NextResponse } from 'next/server'
import { createAdminClient, getAuthUser } from '@/lib/supabase/server'
import { getStripe } from '@/lib/billing/stripe'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data: accountRow, error } = await (supabase as any)
    .from('publisher_connect_accounts')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: 'Failed to load Stripe Connect status.' }, { status: 500 })
  }

  if (!accountRow?.stripe_account_id) {
    return NextResponse.json({
      connected: false,
      payoutsEnabled: false,
      chargesEnabled: false,
      detailsSubmitted: false,
    })
  }

  try {
    const stripe = getStripe()
    const stripeAccount = await stripe.accounts.retrieve(accountRow.stripe_account_id)

    await (supabase as any)
      .from('publisher_connect_accounts')
      .update({
        details_submitted: stripeAccount.details_submitted,
        charges_enabled: stripeAccount.charges_enabled,
        payouts_enabled: stripeAccount.payouts_enabled,
        onboarding_completed_at: stripeAccount.details_submitted ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    return NextResponse.json({
      connected: true,
      stripeAccountId: stripeAccount.id,
      payoutsEnabled: stripeAccount.payouts_enabled,
      chargesEnabled: stripeAccount.charges_enabled,
      detailsSubmitted: stripeAccount.details_submitted,
    })
  } catch (stripeError) {
    const message = stripeError instanceof Error ? stripeError.message : 'Failed to query Stripe Connect account.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


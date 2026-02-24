import { NextResponse } from 'next/server'
import { createAdminClient, getAuthUser } from '@/lib/supabase/server'
import { getStripe } from '@/lib/billing/stripe'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const stripe = getStripe()

  try {
    const { data: existing } = await (supabase as any)
      .from('publisher_connect_accounts')
      .select('stripe_account_id')
      .eq('user_id', user.id)
      .maybeSingle()

    let stripeAccountID = typeof existing?.stripe_account_id === 'string' ? existing.stripe_account_id : null

    if (!stripeAccountID) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email || undefined,
        capabilities: {
          transfers: { requested: true },
        },
        metadata: {
          user_id: user.id,
        },
      })

      stripeAccountID = account.id

      await (supabase as any)
        .from('publisher_connect_accounts')
        .upsert({
          user_id: user.id,
          stripe_account_id: stripeAccountID,
          details_submitted: account.details_submitted,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          updated_at: new Date().toISOString(),
        })
    }

    const requestURL = new URL(request.url)
    const appBaseURL = process.env.APP_BASE_URL ?? requestURL.origin
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountID,
      type: 'account_onboarding',
      return_url: `${appBaseURL}/dashboard`,
      refresh_url: `${appBaseURL}/dashboard`,
    })

    return NextResponse.json({
      stripeAccountId: stripeAccountID,
      onboardingURL: accountLink.url,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start Stripe Connect onboarding.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


import { NextResponse } from 'next/server'
import { createAdminClient, getAuthUser } from '@/lib/supabase/server'
import { getCreditBalance, getHeldCreditBalance, getSpendableCreditBalance } from '@/lib/billing/credits'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()
    const [balanceCents, heldCents, spendableCents] = await Promise.all([
      getCreditBalance(supabase, user.id),
      getHeldCreditBalance(supabase, user.id),
      getSpendableCreditBalance(supabase, user.id),
    ])

    return NextResponse.json({
      balanceCents,
      heldCents,
      spendableCents,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch credit balance.' }, { status: 500 })
  }
}


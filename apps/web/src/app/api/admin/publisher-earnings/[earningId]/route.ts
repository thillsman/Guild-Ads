import { NextResponse } from 'next/server'
import { isHardcodedAdminUser } from '@/lib/admin/access'
import { createAdminClient, getAuthUser } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const ALLOWED_STATUSES = new Set(['accrued', 'eligible', 'carried_forward', 'paid'])

interface UpdatePublisherEarningBody {
  payoutStatus?: unknown
}

export async function PATCH(
  request: Request,
  { params }: { params: { earningId: string } }
) {
  const actor = await getAuthUser()
  if (!actor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isHardcodedAdminUser(actor.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { earningId } = params

  let body: UpdatePublisherEarningBody = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const payoutStatus = typeof body.payoutStatus === 'string' ? body.payoutStatus : null
  if (!payoutStatus || !ALLOWED_STATUSES.has(payoutStatus)) {
    return NextResponse.json({ error: 'Valid payoutStatus is required.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: existingRow, error: existingRowError } = await (supabase as any)
    .from('publisher_weekly_earnings')
    .select('earning_id, payout_status')
    .eq('earning_id', earningId)
    .maybeSingle()

  if (existingRowError) {
    return NextResponse.json({ error: 'Failed to load weekly earning.' }, { status: 500 })
  }

  if (!existingRow?.earning_id) {
    return NextResponse.json({ error: 'Weekly earning not found.' }, { status: 404 })
  }

  if (existingRow.payout_status === 'paid' && payoutStatus !== 'paid') {
    return NextResponse.json({
      error: 'Already-paid rows can only stay paid here. Use the database directly for reversals.',
    }, { status: 400 })
  }

  const nowISO = new Date().toISOString()
  const { error: updateError } = await (supabase as any)
    .from('publisher_weekly_earnings')
    .update({
      paid_at: payoutStatus === 'paid' ? nowISO : null,
      payout_status: payoutStatus,
      updated_at: nowISO,
    })
    .eq('earning_id', earningId)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update weekly earning.' }, { status: 500 })
  }

  return NextResponse.json({
    earningId,
    ok: true,
    payoutStatus,
  })
}

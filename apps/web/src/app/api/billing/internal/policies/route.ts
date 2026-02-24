import { NextResponse } from 'next/server'
import { createAdminClient, getAuthUser } from '@/lib/supabase/server'
import { canManageInternalAccounts } from '@/lib/billing/internal-admin'

export const dynamic = 'force-dynamic'

interface UpsertPolicyBody {
  userId?: unknown
  active?: unknown
  canBypassCheckout?: unknown
  noFillExempt?: unknown
  canManageInternal?: unknown
  notes?: unknown
}

export async function POST(request: Request) {
  const actor = await getAuthUser()
  if (!actor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  if (!(await canManageInternalAccounts(supabase, actor.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: UpsertPolicyBody = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const userID = typeof body.userId === 'string' ? body.userId : null
  if (!userID) {
    return NextResponse.json({ error: 'userId is required.' }, { status: 400 })
  }

  const payload = {
    user_id: userID,
    active: body.active === true,
    can_bypass_checkout: body.canBypassCheckout === true,
    no_fill_exempt: body.noFillExempt === true,
    can_manage_internal: body.canManageInternal === true,
    notes: typeof body.notes === 'string' ? body.notes : null,
    updated_by: actor.id,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await (supabase as any)
    .from('internal_account_policies')
    .upsert(payload)
    .select('user_id, active, can_bypass_checkout, no_fill_exempt, can_manage_internal, notes')
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to save policy.' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    policy: data,
  })
}


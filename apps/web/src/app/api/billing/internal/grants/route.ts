import { NextResponse } from 'next/server'
import { createAdminClient, getAuthUser } from '@/lib/supabase/server'
import { canManageInternalAccounts } from '@/lib/billing/internal-admin'

export const dynamic = 'force-dynamic'

interface GrantCreditsBody {
  userId?: unknown
  amountCents?: unknown
  expiresInDays?: unknown
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

  let body: GrantCreditsBody = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const userID = typeof body.userId === 'string' ? body.userId : null
  const amountCents = typeof body.amountCents === 'number' ? Math.round(body.amountCents) : Number(body.amountCents)
  const expiresInDays = typeof body.expiresInDays === 'number' ? Math.round(body.expiresInDays) : Number(body.expiresInDays)
  const notes = typeof body.notes === 'string' ? body.notes : null

  if (!userID || !Number.isFinite(amountCents) || amountCents <= 0) {
    return NextResponse.json({ error: 'userId and positive amountCents are required.' }, { status: 400 })
  }

  const expiresAt = Number.isFinite(expiresInDays) && expiresInDays > 0
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null

  const { error } = await (supabase as any)
    .from('credit_ledger_entries')
    .insert({
      user_id: userID,
      amount_cents: amountCents,
      entry_type: 'promo_grant',
      expires_at: expiresAt,
      created_by: actor.id,
      metadata: {
        notes,
      },
    })

  if (error) {
    return NextResponse.json({ error: 'Failed to grant credits.' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    userId: userID,
    amountCents,
    expiresAt,
  })
}


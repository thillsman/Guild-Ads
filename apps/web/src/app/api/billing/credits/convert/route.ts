import { NextResponse } from 'next/server'
import type { Tables } from '@guild-ads/shared'
import { createAdminClient, getAuthUser } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface ConvertCreditsBody {
  amountCents?: unknown
}

type ConvertibleEarningsRow = Pick<
  Tables<'publisher_weekly_earnings'>,
  'earning_id' | 'gross_earnings_cents' | 'converted_cents'
>

function asPositiveInt(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) {
    return null
  }
  const rounded = Math.round(parsed)
  return rounded > 0 ? rounded : null
}

export async function POST(request: Request) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: ConvertCreditsBody = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const amountCents = asPositiveInt(body.amountCents)
  if (!amountCents) {
    return NextResponse.json({ error: 'amountCents must be a positive integer.' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const nowISO = new Date().toISOString()
  const { data: eligibleRows, error: eligibleError } = await supabase
    .from('publisher_weekly_earnings')
    .select('earning_id, gross_earnings_cents, converted_cents')
    .eq('user_id', user.id)
    .in('payout_status', ['accrued', 'eligible'])
    .lte('hold_until', nowISO)
    .order('week_start', { ascending: true })

  if (eligibleError) {
    return NextResponse.json({ error: 'Failed to load eligible earnings.' }, { status: 500 })
  }

  const rows: ConvertibleEarningsRow[] = eligibleRows ?? []
  const availableCents = rows.reduce((sum, row) => {
    const gross = row.gross_earnings_cents
    const converted = row.converted_cents
    return sum + Math.max(0, gross - converted)
  }, 0)

  if (amountCents > availableCents) {
    return NextResponse.json({
      error: `Amount exceeds available convertible earnings (${availableCents} cents).`,
    }, { status: 400 })
  }

  let remaining = amountCents
  for (const row of rows) {
    if (remaining <= 0) {
      break
    }

    const gross = row.gross_earnings_cents
    const converted = row.converted_cents
    const remainingInRow = Math.max(0, gross - converted)
    if (remainingInRow <= 0) {
      continue
    }

    const applied = Math.min(remaining, remainingInRow)
    const { error: rowUpdateError } = await supabase
      .from('publisher_weekly_earnings')
      .update({
        converted_cents: converted + applied,
        updated_at: new Date().toISOString(),
      })
      .eq('earning_id', row.earning_id)

    if (rowUpdateError) {
      return NextResponse.json({ error: 'Failed to apply conversion to weekly earnings.' }, { status: 500 })
    }

    remaining -= applied
  }

  const { error: debitError } = await supabase
    .from('credit_ledger_entries')
    .insert({
      user_id: user.id,
      amount_cents: -amountCents,
      entry_type: 'cash_conversion_debit',
      source_table: 'publisher_weekly_earnings',
      metadata: {
        converted_from_cash_cents: amountCents,
      },
    })

  if (debitError) {
    return NextResponse.json({ error: 'Failed to record conversion debit.' }, { status: 500 })
  }

  const { error: creditError } = await supabase
    .from('credit_ledger_entries')
    .insert({
      user_id: user.id,
      amount_cents: amountCents,
      entry_type: 'cash_conversion_credit',
      source_table: 'publisher_weekly_earnings',
      metadata: {
        converted_from_cash_cents: amountCents,
      },
    })

  if (creditError) {
    return NextResponse.json({ error: 'Failed to record conversion credit.' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    convertedCents: amountCents,
    bonusCents: 0,
    creditGrantedCents: amountCents,
  })
}

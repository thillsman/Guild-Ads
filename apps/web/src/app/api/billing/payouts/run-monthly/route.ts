import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/billing/stripe'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const PAYOUT_MINIMUM_CENTS = 2500

function formatDateUTC(date: Date): string {
  return date.toISOString().split('T')[0]
}

function getCurrentWeekStartUTC(now: Date = new Date()): string {
  const current = new Date(now)
  current.setUTCHours(0, 0, 0, 0)
  current.setUTCDate(current.getUTCDate() - current.getUTCDay())
  return formatDateUTC(current)
}

function getCurrentMonthStartUTC(now: Date = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  return formatDateUTC(d)
}

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
  const now = new Date()
  const currentWeekStart = getCurrentWeekStartUTC(now)
  const batchMonth = getCurrentMonthStartUTC(now)

  try {
    const { data: weeksToAccrue, error: weeksError } = await (supabase as any)
      .from('weekly_slots')
      .select('week_start')
      .lt('week_start', currentWeekStart)
      .order('week_start', { ascending: true })

    if (weeksError) {
      throw weeksError
    }

    for (const week of (weeksToAccrue ?? [])) {
      if (!week?.week_start) {
        continue
      }

      const { error: accrueError } = await (supabase as any).rpc('run_weekly_earnings_accrual', {
        p_week_start: week.week_start,
      })

      if (accrueError) {
        throw accrueError
      }
    }

    await (supabase as any)
      .from('publisher_weekly_earnings')
      .update({
        payout_status: 'eligible',
        updated_at: now.toISOString(),
      })
      .eq('payout_status', 'accrued')
      .lte('hold_until', now.toISOString())

    const { data: existingBatch } = await (supabase as any)
      .from('payout_batches')
      .select('batch_id, status')
      .eq('batch_month', batchMonth)
      .maybeSingle()

    let batchID: string
    if (existingBatch?.batch_id) {
      batchID = existingBatch.batch_id
      if (existingBatch.status === 'completed') {
        return NextResponse.json({
          ok: true,
          message: `Batch for ${batchMonth} already completed.`,
          batchId: batchID,
        })
      }

      await (supabase as any)
        .from('payout_batches')
        .update({
          status: 'running',
          started_at: now.toISOString(),
          error_message: null,
        })
        .eq('batch_id', batchID)
    } else {
      const { data: createdBatch, error: createBatchError } = await (supabase as any)
        .from('payout_batches')
        .insert({
          batch_month: batchMonth,
          status: 'running',
          started_at: now.toISOString(),
        })
        .select('batch_id')
        .single()

      if (createBatchError || !createdBatch?.batch_id) {
        throw createBatchError ?? new Error('Failed to create payout batch.')
      }

      batchID = createdBatch.batch_id
    }

    const { data: eligibleRows, error: eligibleError } = await (supabase as any)
      .from('publisher_weekly_earnings')
      .select('earning_id, user_id, gross_earnings_cents, converted_cents')
      .eq('payout_status', 'eligible')
      .lte('hold_until', now.toISOString())

    if (eligibleError) {
      throw eligibleError
    }

    const rows = Array.isArray(eligibleRows) ? eligibleRows : []
    const byUser = new Map<string, { earningIDs: string[]; amountCents: number }>()
    for (const row of rows) {
      const userID = typeof row.user_id === 'string' ? row.user_id : null
      if (!userID) {
        continue
      }

      const gross = typeof row.gross_earnings_cents === 'number' ? row.gross_earnings_cents : 0
      const converted = typeof row.converted_cents === 'number' ? row.converted_cents : 0
      const payable = Math.max(0, gross - converted)
      if (payable <= 0) {
        continue
      }

      const current = byUser.get(userID) ?? { earningIDs: [], amountCents: 0 }
      current.earningIDs.push(String(row.earning_id))
      current.amountCents += payable
      byUser.set(userID, current)
    }

    let totalItems = 0
    let paidItems = 0
    let failedItems = 0
    let skippedItems = 0
    let totalAmountCents = 0

    for (const [userID, aggregate] of byUser.entries()) {
      totalItems += 1

      if (aggregate.amountCents < PAYOUT_MINIMUM_CENTS) {
        skippedItems += 1
        await (supabase as any)
          .from('payout_items')
          .insert({
            batch_id: batchID,
            user_id: userID,
            stripe_account_id: '',
            amount_cents: aggregate.amountCents,
            status: 'skipped',
            failure_reason: 'below_minimum_threshold',
          })
        continue
      }

      const { data: connectAccount } = await (supabase as any)
        .from('publisher_connect_accounts')
        .select('stripe_account_id, payouts_enabled')
        .eq('user_id', userID)
        .maybeSingle()

      if (!connectAccount?.stripe_account_id || connectAccount.payouts_enabled !== true) {
        skippedItems += 1
        await (supabase as any)
          .from('payout_items')
          .insert({
            batch_id: batchID,
            user_id: userID,
            stripe_account_id: connectAccount?.stripe_account_id ?? '',
            amount_cents: aggregate.amountCents,
            status: 'skipped',
            failure_reason: 'connect_account_not_ready',
          })
        continue
      }

      try {
        const transfer = await stripe.transfers.create({
          amount: aggregate.amountCents,
          currency: 'usd',
          destination: connectAccount.stripe_account_id,
          metadata: {
            batch_id: batchID,
            user_id: userID,
          },
        })

        const { data: payoutItem, error: payoutItemError } = await (supabase as any)
          .from('payout_items')
          .insert({
            batch_id: batchID,
            user_id: userID,
            stripe_account_id: connectAccount.stripe_account_id,
            amount_cents: aggregate.amountCents,
            status: 'paid',
            stripe_transfer_id: transfer.id,
          })
          .select('payout_item_id')
          .single()

        if (payoutItemError || !payoutItem?.payout_item_id) {
          throw payoutItemError ?? new Error('Failed to store payout item.')
        }

        await (supabase as any)
          .from('publisher_weekly_earnings')
          .update({
            payout_status: 'paid',
            paid_at: now.toISOString(),
            payout_item_id: payoutItem.payout_item_id,
            updated_at: now.toISOString(),
          })
          .in('earning_id', aggregate.earningIDs)

        paidItems += 1
        totalAmountCents += aggregate.amountCents
      } catch (transferError) {
        failedItems += 1
        await (supabase as any)
          .from('payout_items')
          .insert({
            batch_id: batchID,
            user_id: userID,
            stripe_account_id: connectAccount.stripe_account_id,
            amount_cents: aggregate.amountCents,
            status: 'failed',
            failure_reason: transferError instanceof Error ? transferError.message : 'transfer_failed',
          })
      }
    }

    const finalStatus = failedItems > 0 ? 'failed' : 'completed'
    await (supabase as any)
      .from('payout_batches')
      .update({
        status: finalStatus,
        completed_at: new Date().toISOString(),
        total_items: totalItems,
        total_amount_cents: totalAmountCents,
        error_message: failedItems > 0 ? 'One or more payouts failed.' : null,
      })
      .eq('batch_id', batchID)

    return NextResponse.json({
      ok: true,
      batchId: batchID,
      batchMonth,
      totals: {
        items: totalItems,
        paidItems,
        failedItems,
        skippedItems,
        totalAmountCents,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to run monthly payouts.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


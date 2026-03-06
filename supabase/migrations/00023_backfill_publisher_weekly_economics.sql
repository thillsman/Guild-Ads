with week_cash as (
  select
    ws.week_start,
    coalesce(sum(sp.cash_paid_cents) filter (
      where sp.status = 'confirmed'
        and coalesce(sp.is_internal, false) = false
        and sp.refunded_at is null
    ), 0)::integer as cash_spend_cents,
    coalesce(round(sum(sp.cash_paid_cents) filter (
      where sp.status = 'confirmed'
        and coalesce(sp.is_internal, false) = false
        and sp.refunded_at is null
    ) * 0.30), 0)::integer as platform_reserve_cents,
    coalesce(round(sum(sp.cash_paid_cents) filter (
      where sp.status = 'confirmed'
        and coalesce(sp.is_internal, false) = false
        and sp.refunded_at is null
    ) * 0.70), 0)::integer as pool_cents
  from weekly_slots ws
  left join slot_purchases sp on sp.slot_id = ws.slot_id
  group by ws.week_start
)
update publisher_weekly_earnings pwe
set
  cash_spend_cents = wc.cash_spend_cents,
  platform_reserve_cents = wc.platform_reserve_cents,
  pool_cents = wc.pool_cents,
  hold_until = case
    when pwe.payout_status = 'paid' then pwe.hold_until
    else ((pwe.week_start::timestamp + interval '21 days') at time zone 'utc')
  end,
  payout_status = case
    when pwe.payout_status = 'paid' then pwe.payout_status
    when pwe.payout_status = 'carried_forward' then pwe.payout_status
    when ((pwe.week_start::timestamp + interval '21 days') at time zone 'utc') <= timezone('utc', now()) then 'eligible'
    else 'accrued'
  end,
  updated_at = now()
from week_cash wc
where wc.week_start = pwe.week_start;

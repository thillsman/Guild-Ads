create or replace function grant_publisher_bonus_credits(p_week_start date)
returns table (
  week_start date,
  rows_credited integer,
  total_bonus_cents integer
)
language plpgsql
security definer
set search_path = public
as $grant_publisher_bonus_credits$
declare
  v_rows_credited integer := 0;
  v_total_bonus_cents integer := 0;
  v_bonus_rollout_week_start date := date '2026-03-01';
begin
  if p_week_start is null then
    return query select null::date, 0, 0;
    return;
  end if;

  if p_week_start < v_bonus_rollout_week_start then
    return query select p_week_start, 0, 0;
    return;
  end if;

  with eligible as (
    select
      pwe.earning_id,
      pwe.publisher_app_id,
      pwe.user_id,
      pwe.gross_earnings_cents,
      greatest(round(pwe.gross_earnings_cents * 0.10), 0)::integer as bonus_credit_cents
    from publisher_weekly_earnings pwe
    where pwe.week_start = p_week_start
      and pwe.bonus_credit_entry_id is null
      and pwe.gross_earnings_cents > 0
  ),
  inserted as (
    insert into credit_ledger_entries (
      user_id,
      amount_cents,
      entry_type,
      source_table,
      source_id,
      metadata
    )
    select
      e.user_id,
      e.bonus_credit_cents,
      'publisher_bonus_credit',
      'publisher_weekly_earnings',
      e.earning_id,
      jsonb_build_object(
        'week_start', p_week_start,
        'publisher_app_id', e.publisher_app_id,
        'gross_earnings_cents', e.gross_earnings_cents,
        'bonus_credit_cents', e.bonus_credit_cents
      )
    from eligible e
    where e.bonus_credit_cents > 0
    on conflict do nothing
    returning entry_id, source_id, amount_cents
  ),
  updated as (
    update publisher_weekly_earnings pwe
    set
      bonus_credit_cents = inserted.amount_cents,
      bonus_credit_entry_id = inserted.entry_id,
      bonus_credited_at = now(),
      updated_at = now()
    from inserted
    where pwe.earning_id = inserted.source_id
    returning inserted.amount_cents
  )
  select count(*), coalesce(sum(updated.amount_cents), 0)::integer
  into v_rows_credited, v_total_bonus_cents
  from updated;

  return query select p_week_start, v_rows_credited, v_total_bonus_cents;
end;
$grant_publisher_bonus_credits$;

create or replace function run_weekly_earnings_accrual(p_week_start date)
returns table (
  week_start date,
  pool_cents integer,
  network_unique_users integer,
  rows_upserted integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pool_cents integer := 0;
  v_network_unique_users integer := 0;
  v_rows_upserted integer := 0;
  v_hold_until timestamptz;
begin
  if p_week_start is null then
    return query select null::date, 0, 0, 0;
    return;
  end if;

  select coalesce(round(sum(sp.price_cents) * 0.70), 0)::integer
  into v_pool_cents
  from slot_purchases sp
  join weekly_slots ws on ws.slot_id = sp.slot_id
  where ws.week_start = p_week_start
    and sp.status = 'confirmed'
    and coalesce(sp.is_internal, false) = false
    and sp.refunded_at is null;

  with app_users as (
    select
      uav.publisher_app_id,
      count(distinct uav.device_id_hash)::integer as unique_users
    from unique_ad_views uav
    where uav.week_start = p_week_start
    group by uav.publisher_app_id
  )
  select coalesce(sum(au.unique_users), 0)::integer
  into v_network_unique_users
  from app_users au;

  if v_network_unique_users = 0 then
    return query select p_week_start, v_pool_cents, 0, 0;
    return;
  end if;

  v_hold_until := ((p_week_start::timestamp + interval '37 days') at time zone 'utc');

  with app_users as (
    select
      uav.publisher_app_id,
      count(distinct uav.device_id_hash)::integer as unique_users
    from unique_ad_views uav
    where uav.week_start = p_week_start
    group by uav.publisher_app_id
  ),
  app_earnings as (
    select
      p_week_start as week_start,
      au.publisher_app_id,
      a.user_id,
      au.unique_users,
      v_network_unique_users as network_unique_users,
      round(au.unique_users::numeric / v_network_unique_users::numeric, 8) as share_ratio,
      v_pool_cents as pool_cents,
      round(v_pool_cents::numeric * (au.unique_users::numeric / v_network_unique_users::numeric))::integer as gross_earnings_cents
    from app_users au
    join apps a on a.app_id = au.publisher_app_id
    where a.user_id is not null
  )
  insert into publisher_weekly_earnings (
    week_start,
    publisher_app_id,
    user_id,
    unique_users,
    network_unique_users,
    share_ratio,
    pool_cents,
    gross_earnings_cents,
    hold_until,
    payout_status,
    updated_at
  )
  select
    ae.week_start,
    ae.publisher_app_id,
    ae.user_id,
    ae.unique_users,
    ae.network_unique_users,
    ae.share_ratio,
    ae.pool_cents,
    ae.gross_earnings_cents,
    v_hold_until,
    case
      when v_hold_until <= timezone('utc', now()) then 'eligible'
      else 'accrued'
    end,
    now()
  from app_earnings ae
  on conflict (week_start, publisher_app_id)
  do update set
    user_id = excluded.user_id,
    unique_users = excluded.unique_users,
    network_unique_users = excluded.network_unique_users,
    share_ratio = excluded.share_ratio,
    pool_cents = excluded.pool_cents,
    gross_earnings_cents = excluded.gross_earnings_cents,
    hold_until = excluded.hold_until,
    payout_status = case
      when publisher_weekly_earnings.payout_status = 'paid' then publisher_weekly_earnings.payout_status
      else excluded.payout_status
    end,
    updated_at = now();

  get diagnostics v_rows_upserted = row_count;

  return query select p_week_start, v_pool_cents, v_network_unique_users, v_rows_upserted;
end;
$$;

-- Weekly economics overhaul:
-- - split booked value vs cash paid vs credits applied
-- - accrue publisher earnings from cash spend only
-- - grant persistent publisher bonus credits after week close
-- - shorten publisher hold period to 14 days after week close
-- - expose booked/cash/credit splits in admin reporting

alter table slot_purchases
  add column if not exists cash_paid_cents integer not null default 0 check (cash_paid_cents >= 0),
  add column if not exists credits_applied_cents integer not null default 0 check (credits_applied_cents >= 0);

alter table publisher_weekly_earnings
  add column if not exists cash_spend_cents integer not null default 0 check (cash_spend_cents >= 0),
  add column if not exists platform_reserve_cents integer not null default 0 check (platform_reserve_cents >= 0),
  add column if not exists bonus_credit_cents integer not null default 0 check (bonus_credit_cents >= 0),
  add column if not exists bonus_credit_entry_id uuid references credit_ledger_entries(entry_id) on delete set null,
  add column if not exists bonus_credited_at timestamptz;

alter table credit_ledger_entries
  drop constraint if exists credit_ledger_entries_entry_type_check;

alter table credit_ledger_entries
  add constraint credit_ledger_entries_entry_type_check check (
    entry_type in (
      'promo_grant',
      'booking_hold',
      'booking_spend',
      'booking_hold_release',
      'cash_conversion_debit',
      'cash_conversion_bonus',
      'cash_conversion_credit',
      'publisher_bonus_credit',
      'manual_adjustment',
      'payout_deduction'
    )
  );

create unique index if not exists idx_credit_ledger_entries_unique_publisher_bonus
  on credit_ledger_entries(source_id)
  where source_table = 'publisher_weekly_earnings'
    and entry_type = 'publisher_bonus_credit'
    and source_id is not null;

update slot_purchases sp
set
  cash_paid_cents = greatest(coalesce(bbi.cash_due_cents, 0), 0),
  credits_applied_cents = greatest(coalesce(bbi.credits_applied_cents, 0), 0),
  updated_at = now()
from billing_booking_intents bbi
where sp.booking_intent_id = bbi.booking_intent_id;

update slot_purchases
set
  cash_paid_cents = case
    when coalesce(is_internal, false) = true then 0
    when payment_provider = 'stripe' then greatest(price_cents, 0)
    else 0
  end,
  credits_applied_cents = case
    when payment_provider = 'credits' then greatest(price_cents, 0)
    else 0
  end,
  updated_at = now()
where booking_intent_id is null;

create or replace function get_user_credit_balance(p_user_id uuid)
returns integer
language sql
stable
as $$
  select coalesce(sum(cle.amount_cents), 0)::integer
  from credit_ledger_entries cle
  where cle.user_id = p_user_id
    and cle.entry_type in (
      'promo_grant',
      'booking_spend',
      'cash_conversion_bonus',
      'cash_conversion_credit',
      'publisher_bonus_credit',
      'manual_adjustment'
    )
    and (cle.expires_at is null or cle.expires_at > timezone('utc', now()));
$$;

create or replace function get_weekly_sold_percentage(p_week_start date)
returns integer
language sql
stable
as $$
  select coalesce(sum(sp.percentage_purchased), 0)::integer
  from slot_purchases sp
  join weekly_slots ws on ws.slot_id = sp.slot_id
  where ws.week_start = p_week_start
    and sp.status = 'confirmed'
    and coalesce(sp.is_internal, false) = false
    and sp.refunded_at is null;
$$;

create or replace function apply_weekly_price_adjustment(
  p_base_price_cents integer,
  p_sold_percentage integer
)
returns integer
language sql
immutable
as $$
  select greatest(
    case
      when coalesce(p_base_price_cents, 0) <= 0 then 100000
      when coalesce(p_sold_percentage, 0) >= 90 then round(p_base_price_cents * 1.10)
      when coalesce(p_sold_percentage, 0) >= 70 then round(p_base_price_cents * 1.05)
      when coalesce(p_sold_percentage, 0) >= 50 then p_base_price_cents
      when coalesce(p_sold_percentage, 0) >= 30 then round(p_base_price_cents * 0.95)
      else round(p_base_price_cents * 0.90)
    end,
    1
  )::integer;
$$;

create or replace function confirm_booking_intent_atomic(p_booking_intent_id uuid)
returns table (
  success boolean,
  reason text,
  purchase_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_intent billing_booking_intents%rowtype;
  v_total_percentage integer;
  v_user_percentage integer;
  v_purchase_id uuid;
begin
  select *
  into v_intent
  from billing_booking_intents
  where booking_intent_id = p_booking_intent_id
  for update;

  if not found then
    return query select false, 'intent_not_found', null::uuid;
    return;
  end if;

  if v_intent.status = 'confirmed' then
    return query select true, 'already_confirmed', v_intent.confirmed_purchase_id;
    return;
  end if;

  if v_intent.status not in ('created', 'awaiting_payment', 'processing') then
    return query select false, 'intent_not_confirmable', null::uuid;
    return;
  end if;

  perform 1
  from weekly_slots ws
  where ws.slot_id = v_intent.slot_id
  for update;

  if not found then
    update billing_booking_intents
    set status = 'failed',
        failure_reason = 'slot_not_found',
        updated_at = now()
    where booking_intent_id = v_intent.booking_intent_id;

    return query select false, 'slot_not_found', null::uuid;
    return;
  end if;

  select coalesce(sum(sp.percentage_purchased), 0)::integer
  into v_total_percentage
  from slot_purchases sp
  where sp.slot_id = v_intent.slot_id
    and sp.status in ('pending', 'confirmed');

  if (v_total_percentage + v_intent.percentage_purchased) > 100 then
    update billing_booking_intents
    set status = 'refunded_capacity_conflict',
        failure_reason = 'capacity_exceeded',
        updated_at = now()
    where booking_intent_id = v_intent.booking_intent_id;

    return query select false, 'capacity_exceeded', null::uuid;
    return;
  end if;

  select coalesce(sum(sp.percentage_purchased), 0)::integer
  into v_user_percentage
  from slot_purchases sp
  where sp.slot_id = v_intent.slot_id
    and sp.user_id = v_intent.user_id
    and sp.status in ('pending', 'confirmed');

  if (v_user_percentage + v_intent.percentage_purchased) > 40 then
    update billing_booking_intents
    set status = 'failed',
        failure_reason = 'user_cap_exceeded',
        updated_at = now()
    where booking_intent_id = v_intent.booking_intent_id;

    return query select false, 'user_cap_exceeded', null::uuid;
    return;
  end if;

  insert into slot_purchases (
    slot_id,
    user_id,
    campaign_id,
    percentage_purchased,
    price_cents,
    cash_paid_cents,
    credits_applied_cents,
    status,
    booking_intent_id,
    payment_provider,
    payment_reference,
    is_internal
  ) values (
    v_intent.slot_id,
    v_intent.user_id,
    v_intent.campaign_id,
    v_intent.percentage_purchased,
    v_intent.quoted_price_cents,
    case
      when v_intent.is_internal then 0
      else greatest(coalesce(v_intent.cash_due_cents, 0), 0)
    end,
    case
      when v_intent.is_internal then 0
      else greatest(coalesce(v_intent.credits_applied_cents, 0), 0)
    end,
    'confirmed',
    v_intent.booking_intent_id,
    case
      when v_intent.is_internal then 'internal'
      when v_intent.cash_due_cents = 0 then 'credits'
      else 'stripe'
    end,
    coalesce(v_intent.stripe_payment_intent_id, v_intent.stripe_checkout_session_id),
    v_intent.is_internal
  )
  returning slot_purchases.purchase_id into v_purchase_id;

  update billing_booking_intents
  set status = 'confirmed',
      confirmed_purchase_id = v_purchase_id,
      confirmed_at = now(),
      updated_at = now()
  where booking_intent_id = v_intent.booking_intent_id;

  return query select true, 'confirmed', v_purchase_id;
end;
$$;

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
  v_cash_spend_cents integer := 0;
  v_platform_reserve_cents integer := 0;
  v_pool_cents integer := 0;
  v_network_unique_users integer := 0;
  v_rows_upserted integer := 0;
  v_hold_until timestamptz;
begin
  if p_week_start is null then
    return query select null::date, 0, 0, 0;
    return;
  end if;

  select coalesce(sum(sp.cash_paid_cents) filter (
    where coalesce(sp.is_internal, false) = false
      and sp.refunded_at is null
  ), 0)::integer
  into v_cash_spend_cents
  from slot_purchases sp
  join weekly_slots ws on ws.slot_id = sp.slot_id
  where ws.week_start = p_week_start
    and sp.status = 'confirmed';

  v_platform_reserve_cents := coalesce(round(v_cash_spend_cents * 0.30), 0)::integer;
  v_pool_cents := coalesce(round(v_cash_spend_cents * 0.70), 0)::integer;

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

  v_hold_until := ((p_week_start::timestamp + interval '21 days') at time zone 'utc');

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
      v_cash_spend_cents as cash_spend_cents,
      v_platform_reserve_cents as platform_reserve_cents,
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
    cash_spend_cents,
    platform_reserve_cents,
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
    ae.cash_spend_cents,
    ae.platform_reserve_cents,
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
    cash_spend_cents = excluded.cash_spend_cents,
    platform_reserve_cents = excluded.platform_reserve_cents,
    pool_cents = excluded.pool_cents,
    gross_earnings_cents = excluded.gross_earnings_cents,
    hold_until = excluded.hold_until,
    payout_status = case
      when excluded.hold_until <= timezone('utc', now()) then 'eligible'
      else 'accrued'
    end,
    updated_at = now()
  where publisher_weekly_earnings.payout_status <> 'paid';

  get diagnostics v_rows_upserted = row_count;

  return query select p_week_start, v_pool_cents, v_network_unique_users, v_rows_upserted;
end;
$$;

create or replace function grant_publisher_bonus_credits(p_week_start date)
returns table (
  week_start date,
  rows_credited integer,
  total_bonus_cents integer
)
language plpgsql
security definer
set search_path = public
as $$
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
$$;

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

create or replace function get_admin_weekly_network_summaries(p_limit integer default 24)
returns table (
  week_start date,
  network_price_cents bigint,
  booked_spend_cents bigint,
  cash_spend_cents bigint,
  credits_spend_cents bigint,
  purchased_percentage bigint,
  advertiser_app_count bigint,
  publisher_app_count bigint,
  network_unique_users bigint,
  platform_reserve_cents bigint,
  publisher_pool_cents bigint
)
language sql
stable
as $$
with params as (
  select greatest(coalesce(p_limit, 24), 1) as limit_count
),
relevant_weeks as (
  select
    ws.week_start,
    ws.base_price_cents
  from weekly_slots ws
  where exists (
    select 1
    from slot_purchases sp
    where sp.slot_id = ws.slot_id
      and sp.status = 'confirmed'
      and coalesce(sp.is_internal, false) = false
      and sp.refunded_at is null
  )
    or exists (
      select 1
      from unique_ad_views uav
      where uav.week_start = ws.week_start
    )
    or exists (
      select 1
      from publisher_weekly_earnings pwe
      where pwe.week_start = ws.week_start
    )
  order by ws.week_start desc
  limit (select limit_count from params)
),
confirmed_purchases as (
  select
    ws.week_start,
    count(distinct c.app_id)::bigint as advertiser_app_count,
    coalesce(sum(sp.price_cents), 0)::bigint as booked_spend_cents,
    coalesce(sum(sp.cash_paid_cents), 0)::bigint as cash_spend_cents,
    coalesce(sum(sp.credits_applied_cents), 0)::bigint as credits_spend_cents,
    coalesce(sum(sp.percentage_purchased), 0)::bigint as purchased_percentage,
    coalesce(round(sum(sp.cash_paid_cents) * 0.30), 0)::bigint as platform_reserve_cents,
    coalesce(round(sum(sp.cash_paid_cents) * 0.70), 0)::bigint as publisher_pool_cents
  from relevant_weeks rw
  join weekly_slots ws on ws.week_start = rw.week_start
  left join slot_purchases sp
    on sp.slot_id = ws.slot_id
   and sp.status = 'confirmed'
   and coalesce(sp.is_internal, false) = false
   and sp.refunded_at is null
  left join campaigns c on c.campaign_id = sp.campaign_id
  group by ws.week_start
),
publisher_reach as (
  select
    app_users.week_start,
    count(app_users.publisher_app_id)::bigint as publisher_app_count,
    coalesce(sum(app_users.unique_users), 0)::bigint as network_unique_users
  from (
    select
      uav.week_start,
      uav.publisher_app_id,
      count(distinct uav.device_id_hash)::bigint as unique_users
    from unique_ad_views uav
    where uav.week_start in (select week_start from relevant_weeks)
    group by uav.week_start, uav.publisher_app_id
  ) app_users
  group by app_users.week_start
)
select
  rw.week_start,
  rw.base_price_cents::bigint as network_price_cents,
  coalesce(cp.booked_spend_cents, 0)::bigint as booked_spend_cents,
  coalesce(cp.cash_spend_cents, 0)::bigint as cash_spend_cents,
  coalesce(cp.credits_spend_cents, 0)::bigint as credits_spend_cents,
  coalesce(cp.purchased_percentage, 0)::bigint as purchased_percentage,
  coalesce(cp.advertiser_app_count, 0)::bigint as advertiser_app_count,
  coalesce(pr.publisher_app_count, 0)::bigint as publisher_app_count,
  coalesce(pr.network_unique_users, 0)::bigint as network_unique_users,
  coalesce(cp.platform_reserve_cents, 0)::bigint as platform_reserve_cents,
  coalesce(cp.publisher_pool_cents, 0)::bigint as publisher_pool_cents
from relevant_weeks rw
left join confirmed_purchases cp on cp.week_start = rw.week_start
left join publisher_reach pr on pr.week_start = rw.week_start
order by rw.week_start desc;
$$;

create or replace function get_admin_weekly_advertiser_breakdown(p_week_start date)
returns table (
  advertiser_app_id uuid,
  advertiser_app_name text,
  purchased_percentage bigint,
  booked_spend_cents bigint,
  cash_spend_cents bigint,
  credits_spend_cents bigint,
  user_reach bigint,
  network_unique_users bigint,
  actual_share_ratio numeric
)
language sql
stable
as $$
with purchase_totals as (
  select
    c.app_id as advertiser_app_id,
    coalesce(max(a.name), 'Unknown App') as advertiser_app_name,
    coalesce(sum(sp.percentage_purchased), 0)::bigint as purchased_percentage,
    coalesce(sum(sp.price_cents), 0)::bigint as booked_spend_cents,
    coalesce(sum(sp.cash_paid_cents), 0)::bigint as cash_spend_cents,
    coalesce(sum(sp.credits_applied_cents), 0)::bigint as credits_spend_cents
  from slot_purchases sp
  join weekly_slots ws on ws.slot_id = sp.slot_id
  join campaigns c on c.campaign_id = sp.campaign_id
  left join apps a on a.app_id = c.app_id
  where ws.week_start = p_week_start
    and sp.status = 'confirmed'
    and coalesce(sp.is_internal, false) = false
    and sp.refunded_at is null
    and c.app_id is not null
  group by c.app_id
),
publisher_app_reach as (
  select
    c.app_id as advertiser_app_id,
    uav.publisher_app_id,
    count(distinct uav.device_id_hash)::bigint as unique_users
  from unique_ad_views uav
  join campaigns c on c.campaign_id = uav.campaign_id
  where uav.week_start = p_week_start
    and c.app_id is not null
  group by c.app_id, uav.publisher_app_id
),
advertiser_reach as (
  select
    par.advertiser_app_id,
    coalesce(sum(par.unique_users), 0)::bigint as user_reach
  from publisher_app_reach par
  group by par.advertiser_app_id
),
network_reach as (
  select
    coalesce(sum(app_users.unique_users), 0)::bigint as network_unique_users
  from (
    select
      uav.publisher_app_id,
      count(distinct uav.device_id_hash)::bigint as unique_users
    from unique_ad_views uav
    where uav.week_start = p_week_start
    group by uav.publisher_app_id
  ) app_users
)
select
  pt.advertiser_app_id,
  pt.advertiser_app_name,
  pt.purchased_percentage,
  pt.booked_spend_cents,
  pt.cash_spend_cents,
  pt.credits_spend_cents,
  coalesce(ar.user_reach, 0)::bigint as user_reach,
  nr.network_unique_users,
  case
    when nr.network_unique_users > 0
      then round(coalesce(ar.user_reach, 0)::numeric / nr.network_unique_users::numeric, 8)
    else 0::numeric
  end as actual_share_ratio
from purchase_totals pt
cross join network_reach nr
left join advertiser_reach ar on ar.advertiser_app_id = pt.advertiser_app_id
order by pt.purchased_percentage desc, pt.booked_spend_cents desc, pt.advertiser_app_name asc;
$$;

create or replace function get_admin_weekly_publisher_breakdown(p_week_start date)
returns table (
  publisher_app_id uuid,
  publisher_app_name text,
  unique_users bigint,
  network_unique_users bigint,
  share_ratio numeric,
  due_payout_cents bigint,
  bonus_credit_cents bigint,
  converted_cents bigint,
  payout_status text,
  hold_until timestamptz,
  paid_at timestamptz
)
language sql
stable
as $$
with pool as (
  select
    coalesce(sum(sp.cash_paid_cents) filter (
      where coalesce(sp.is_internal, false) = false
        and sp.refunded_at is null
    ), 0)::bigint as cash_spend_cents,
    coalesce(round(sum(sp.cash_paid_cents) filter (
      where coalesce(sp.is_internal, false) = false
        and sp.refunded_at is null
    ) * 0.70), 0)::bigint as publisher_pool_cents
  from slot_purchases sp
  join weekly_slots ws on ws.slot_id = sp.slot_id
  where ws.week_start = p_week_start
    and sp.status = 'confirmed'
),
app_users as (
  select
    uav.publisher_app_id,
    count(distinct uav.device_id_hash)::bigint as unique_users
  from unique_ad_views uav
  where uav.week_start = p_week_start
  group by uav.publisher_app_id
),
network as (
  select
    coalesce(sum(au.unique_users), 0)::bigint as network_unique_users
  from app_users au
),
computed as (
  select
    au.publisher_app_id,
    coalesce(max(a.name), 'Unknown App') as publisher_app_name,
    au.unique_users,
    n.network_unique_users,
    case
      when n.network_unique_users > 0
        then round(au.unique_users::numeric / n.network_unique_users::numeric, 8)
      else 0::numeric
    end as share_ratio,
    case
      when n.network_unique_users > 0
        then round(p.publisher_pool_cents::numeric * (au.unique_users::numeric / n.network_unique_users::numeric))::bigint
      else 0::bigint
    end as due_payout_cents
  from app_users au
  join apps a on a.app_id = au.publisher_app_id
  cross join network n
  cross join pool p
  group by au.publisher_app_id, au.unique_users, n.network_unique_users, p.publisher_pool_cents
)
select
  c.publisher_app_id,
  c.publisher_app_name,
  c.unique_users,
  c.network_unique_users,
  c.share_ratio,
  coalesce(pwe.gross_earnings_cents, c.due_payout_cents)::bigint as due_payout_cents,
  coalesce(pwe.bonus_credit_cents, 0)::bigint as bonus_credit_cents,
  coalesce(pwe.converted_cents, 0)::bigint as converted_cents,
  pwe.payout_status,
  pwe.hold_until,
  pwe.paid_at
from computed c
left join publisher_weekly_earnings pwe
  on pwe.week_start = p_week_start
 and pwe.publisher_app_id = c.publisher_app_id
order by c.unique_users desc, c.publisher_app_name asc;
$$;

do $$
declare
  v_week_start date;
begin
  for v_week_start in
    select distinct ws.week_start
    from weekly_slots ws
    where ws.week_start < (
      timezone('utc', now())::date
      - extract(dow from timezone('utc', now())::date)::integer
    )
    order by ws.week_start asc
  loop
    perform run_weekly_earnings_accrual(v_week_start);
  end loop;
end;
$$;

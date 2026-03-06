drop function if exists get_admin_weekly_network_summaries(integer);
drop function if exists get_admin_weekly_advertiser_breakdown(date);
drop function if exists get_admin_weekly_publisher_breakdown(date);

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
as $get_admin_weekly_network_summaries$
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
$get_admin_weekly_network_summaries$;

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
as $get_admin_weekly_advertiser_breakdown$
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
$get_admin_weekly_advertiser_breakdown$;

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
as $get_admin_weekly_publisher_breakdown$
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
$get_admin_weekly_publisher_breakdown$;

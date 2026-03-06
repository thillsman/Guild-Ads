-- Admin-facing network reporting for weekly advertiser and publisher breakdowns.

create or replace function get_admin_weekly_network_summaries(p_limit integer default 24)
returns table (
  week_start date,
  network_price_cents bigint,
  confirmed_spend_cents bigint,
  purchased_percentage bigint,
  advertiser_app_count bigint,
  publisher_app_count bigint,
  network_unique_users bigint,
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
    coalesce(sum(sp.price_cents), 0)::bigint as confirmed_spend_cents,
    coalesce(sum(sp.percentage_purchased), 0)::bigint as purchased_percentage,
    coalesce(round(sum(sp.price_cents) filter (
      where coalesce(sp.is_internal, false) = false
        and sp.refunded_at is null
    ) * 0.70), 0)::bigint as publisher_pool_cents
  from relevant_weeks rw
  join weekly_slots ws on ws.week_start = rw.week_start
  left join slot_purchases sp
    on sp.slot_id = ws.slot_id
   and sp.status = 'confirmed'
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
  coalesce(cp.confirmed_spend_cents, 0)::bigint as confirmed_spend_cents,
  coalesce(cp.purchased_percentage, 0)::bigint as purchased_percentage,
  coalesce(cp.advertiser_app_count, 0)::bigint as advertiser_app_count,
  coalesce(pr.publisher_app_count, 0)::bigint as publisher_app_count,
  coalesce(pr.network_unique_users, 0)::bigint as network_unique_users,
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
  spend_cents bigint,
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
    coalesce(sum(sp.price_cents), 0)::bigint as spend_cents
  from slot_purchases sp
  join weekly_slots ws on ws.slot_id = sp.slot_id
  join campaigns c on c.campaign_id = sp.campaign_id
  left join apps a on a.app_id = c.app_id
  where ws.week_start = p_week_start
    and sp.status = 'confirmed'
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
  pt.spend_cents,
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
order by pt.purchased_percentage desc, pt.spend_cents desc, pt.advertiser_app_name asc;
$$;

create or replace function get_admin_weekly_publisher_breakdown(p_week_start date)
returns table (
  publisher_app_id uuid,
  publisher_app_name text,
  unique_users bigint,
  network_unique_users bigint,
  share_ratio numeric,
  due_payout_cents bigint,
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
    coalesce(round(sum(sp.price_cents) filter (
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

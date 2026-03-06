alter table internal_account_policies
  drop column if exists can_use_rc_grants;

drop function if exists get_next_week_start();
drop function if exists get_week_availability(date);
drop function if exists get_publisher_portfolio_weekly_totals(uuid, integer);
drop function if exists get_publisher_weekly_placement_metrics(uuid, uuid, integer);

create or replace function get_publisher_weekly_placement_metrics(
  p_user_id uuid,
  p_app_id uuid,
  p_weeks integer default 12
)
returns table (
  week_start date,
  placement_id text,
  request_users bigint,
  filled_requests bigint,
  no_fill_requests bigint,
  error_requests bigint,
  unique_filled_users bigint,
  impressions bigint,
  unique_users bigint,
  clicks bigint,
  unique_click_users bigint
)
language sql
stable
as $get_publisher_weekly_placement_metrics$
with params as (
  select
    greatest(coalesce(p_weeks, 12), 1) as weeks,
    (date_trunc('week', timezone('utc', now()) + interval '1 day') - interval '1 day')::date as current_week_start
),
serve_filtered as (
  select
    (date_trunc('week', ((sa.created_at at time zone 'utc') + interval '1 day')) - interval '1 day')::date as week_start,
    coalesce(nullif(trim(sa.placement_id), ''), 'default') as placement_id,
    sa.device_id_hash,
    sa.response_type
  from serve_attempts sa
  join apps a on a.app_id = sa.app_id
  cross join params p
  where a.user_id = p_user_id
    and sa.app_id = p_app_id
    and sa.created_at >= (p.current_week_start - ((p.weeks - 1) * interval '7 days'))
    and not (
      sa.endpoint = 'launch'
      and coalesce(nullif(trim(sa.placement_id), ''), 'default') = 'default'
    )
),
serve_weekly as (
  select
    sf.week_start,
    sf.placement_id,
    count(distinct sf.device_id_hash)::bigint as request_users,
    count(*) filter (where sf.response_type = 'ad')::bigint as filled_requests,
    count(*) filter (where sf.response_type = 'no_fill')::bigint as no_fill_requests,
    count(*) filter (where sf.response_type = 'error')::bigint as error_requests,
    count(distinct sf.device_id_hash) filter (where sf.response_type = 'ad')::bigint as unique_filled_users
  from serve_filtered sf
  group by sf.week_start, sf.placement_id
),
impression_filtered as (
  select
    (date_trunc('week', ((ar.created_at at time zone 'utc') + interval '1 day')) - interval '1 day')::date as week_start,
    coalesce(nullif(trim(ar.placement_id), ''), 'default') as placement_id,
    ar.device_id_hash,
    ar.clicked
  from ad_requests ar
  join apps a on a.app_id = ar.app_id
  cross join params p
  where a.user_id = p_user_id
    and ar.app_id = p_app_id
    and ar.response_type = 'ad'
    and ar.created_at >= (p.current_week_start - ((p.weeks - 1) * interval '7 days'))
),
impression_weekly as (
  select
    ifr.week_start,
    ifr.placement_id,
    count(*)::bigint as impressions,
    count(distinct ifr.device_id_hash)::bigint as unique_users,
    count(*) filter (where ifr.clicked)::bigint as clicks,
    count(distinct ifr.device_id_hash) filter (where ifr.clicked)::bigint as unique_click_users
  from impression_filtered ifr
  group by ifr.week_start, ifr.placement_id
)
select
  coalesce(sw.week_start, iw.week_start) as week_start,
  coalesce(sw.placement_id, iw.placement_id) as placement_id,
  coalesce(sw.request_users, 0)::bigint as request_users,
  coalesce(sw.filled_requests, 0)::bigint as filled_requests,
  coalesce(sw.no_fill_requests, 0)::bigint as no_fill_requests,
  coalesce(sw.error_requests, 0)::bigint as error_requests,
  coalesce(sw.unique_filled_users, 0)::bigint as unique_filled_users,
  coalesce(iw.impressions, 0)::bigint as impressions,
  coalesce(iw.unique_users, 0)::bigint as unique_users,
  coalesce(iw.clicks, 0)::bigint as clicks,
  coalesce(iw.unique_click_users, 0)::bigint as unique_click_users
from serve_weekly sw
full outer join impression_weekly iw
  on iw.week_start = sw.week_start
 and iw.placement_id = sw.placement_id
order by coalesce(sw.week_start, iw.week_start) desc, coalesce(sw.placement_id, iw.placement_id) asc;
$get_publisher_weekly_placement_metrics$;

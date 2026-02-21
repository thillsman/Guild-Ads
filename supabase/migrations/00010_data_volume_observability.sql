-- Data volume observability helpers for app owners.
-- Exposes current row counts and recent daily growth for storage planning.

drop function if exists get_app_data_volume(uuid, uuid);
create or replace function get_app_data_volume(
  p_user_id uuid,
  p_app_id uuid
)
returns table (
  ad_request_rows bigint,
  unique_ad_view_rows bigint,
  ad_request_rows_7d bigint,
  ad_request_rows_30d bigint,
  first_ad_request_at timestamptz,
  last_ad_request_at timestamptz
)
language sql
stable
as $$
with owned_app as (
  select a.app_id
  from apps a
  where a.app_id = p_app_id
    and a.user_id = p_user_id
  limit 1
)
select
  coalesce((
    select count(*)
    from ad_requests ar
    join owned_app oa on oa.app_id = ar.app_id
  ), 0)::bigint as ad_request_rows,
  coalesce((
    select count(*)
    from unique_ad_views uv
    join owned_app oa on oa.app_id = uv.publisher_app_id
  ), 0)::bigint as unique_ad_view_rows,
  coalesce((
    select count(*)
    from ad_requests ar
    join owned_app oa on oa.app_id = ar.app_id
    where ar.created_at >= timezone('utc', now()) - interval '7 days'
  ), 0)::bigint as ad_request_rows_7d,
  coalesce((
    select count(*)
    from ad_requests ar
    join owned_app oa on oa.app_id = ar.app_id
    where ar.created_at >= timezone('utc', now()) - interval '30 days'
  ), 0)::bigint as ad_request_rows_30d,
  (
    select min(ar.created_at)
    from ad_requests ar
    join owned_app oa on oa.app_id = ar.app_id
  ) as first_ad_request_at,
  (
    select max(ar.created_at)
    from ad_requests ar
    join owned_app oa on oa.app_id = ar.app_id
  ) as last_ad_request_at;
$$;

drop function if exists get_app_daily_storage_metrics(uuid, uuid, integer);
create or replace function get_app_daily_storage_metrics(
  p_user_id uuid,
  p_app_id uuid,
  p_days integer default 30
)
returns table (
  day date,
  ad_request_rows bigint,
  impressions bigint,
  unique_users bigint,
  clicks bigint
)
language sql
stable
as $$
with params as (
  select greatest(coalesce(p_days, 30), 1) as days
),
owned_app as (
  select a.app_id
  from apps a
  where a.app_id = p_app_id
    and a.user_id = p_user_id
  limit 1
),
series as (
  select generate_series(
    (timezone('utc', now())::date - ((select days from params) - 1)),
    timezone('utc', now())::date,
    interval '1 day'
  )::date as day
)
select
  s.day,
  count(ar.request_id)::bigint as ad_request_rows,
  count(ar.request_id) filter (where ar.response_type = 'ad')::bigint as impressions,
  count(distinct ar.device_id_hash) filter (where ar.response_type = 'ad')::bigint as unique_users,
  count(ar.request_id) filter (where ar.clicked)::bigint as clicks
from series s
left join ad_requests ar
  on ar.app_id in (select app_id from owned_app)
 and ar.created_at >= s.day::timestamptz
 and ar.created_at < (s.day::timestamptz + interval '1 day')
group by s.day
order by s.day desc;
$$;

-- Raw serve-attempt logging plus weekly publisher delivery rollups.
-- Keeps serve/no-fill/error decisions separate from impression logs.

create table if not exists serve_attempts (
  attempt_id uuid primary key default gen_random_uuid(),
  app_id uuid not null references apps(app_id) on delete cascade,
  campaign_id uuid references campaigns(campaign_id) on delete set null,
  slot_purchase_id uuid references slot_purchases(purchase_id) on delete set null,
  placement_id text not null default 'default',
  endpoint text not null check (endpoint in ('serve', 'launch')),
  response_type text not null check (response_type in ('ad', 'no_fill', 'error')),
  decision_reason text not null,
  device_id_hash text,
  sdk_version text,
  os_version text,
  locale text,
  created_at timestamptz not null default now()
);

create index if not exists idx_serve_attempts_app_created
  on serve_attempts(app_id, created_at desc);

create index if not exists idx_serve_attempts_app_placement_created
  on serve_attempts(app_id, placement_id, created_at desc);

create index if not exists idx_serve_attempts_campaign_created
  on serve_attempts(campaign_id, created_at desc);

create index if not exists idx_serve_attempts_app_device_created
  on serve_attempts(app_id, device_id_hash, created_at desc);

alter table serve_attempts enable row level security;

create policy "Users can view serve attempts for own apps" on serve_attempts
  for select using (
    app_id in (select app_id from apps where user_id = auth.uid())
  );

drop function if exists get_publisher_weekly_totals(uuid, uuid, integer);
create or replace function get_publisher_weekly_totals(
  p_user_id uuid,
  p_app_id uuid,
  p_weeks integer default 12
)
returns table (
  week_start date,
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
as $$
with params as (
  select
    greatest(coalesce(p_weeks, 12), 1) as weeks,
    (date_trunc('week', timezone('utc', now()) + interval '1 day') - interval '1 day')::date as current_week_start
),
serve_filtered as (
  select
    (date_trunc('week', ((sa.created_at at time zone 'utc') + interval '1 day')) - interval '1 day')::date as week_start,
    sa.device_id_hash,
    sa.response_type
  from serve_attempts sa
  join apps a on a.app_id = sa.app_id
  cross join params p
  where a.user_id = p_user_id
    and sa.app_id = p_app_id
    and sa.created_at >= (p.current_week_start - ((p.weeks - 1) * interval '7 days'))
),
serve_weekly as (
  select
    sf.week_start,
    count(distinct sf.device_id_hash)::bigint as request_users,
    count(*) filter (where sf.response_type = 'ad')::bigint as filled_requests,
    count(*) filter (where sf.response_type = 'no_fill')::bigint as no_fill_requests,
    count(*) filter (where sf.response_type = 'error')::bigint as error_requests,
    count(distinct sf.device_id_hash) filter (where sf.response_type = 'ad')::bigint as unique_filled_users
  from serve_filtered sf
  group by sf.week_start
),
impression_filtered as (
  select
    (date_trunc('week', ((ar.created_at at time zone 'utc') + interval '1 day')) - interval '1 day')::date as week_start,
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
    count(*)::bigint as impressions,
    count(distinct ifr.device_id_hash)::bigint as unique_users,
    count(*) filter (where ifr.clicked)::bigint as clicks,
    count(distinct ifr.device_id_hash) filter (where ifr.clicked)::bigint as unique_click_users
  from impression_filtered ifr
  group by ifr.week_start
)
select
  coalesce(sw.week_start, iw.week_start) as week_start,
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
full outer join impression_weekly iw on iw.week_start = sw.week_start
order by coalesce(sw.week_start, iw.week_start) desc;
$$;

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
as $$
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
$$;

drop function if exists get_publisher_portfolio_weekly_totals(uuid, integer);
create or replace function get_publisher_portfolio_weekly_totals(
  p_user_id uuid,
  p_weeks integer default 12
)
returns table (
  week_start date,
  app_count bigint,
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
as $$
with params as (
  select
    greatest(coalesce(p_weeks, 12), 1) as weeks,
    (date_trunc('week', timezone('utc', now()) + interval '1 day') - interval '1 day')::date as current_week_start
),
serve_app_weeks as (
  select
    (date_trunc('week', ((sa.created_at at time zone 'utc') + interval '1 day')) - interval '1 day')::date as week_start,
    sa.app_id,
    count(distinct sa.device_id_hash)::bigint as request_users,
    count(*) filter (where sa.response_type = 'ad')::bigint as filled_requests,
    count(*) filter (where sa.response_type = 'no_fill')::bigint as no_fill_requests,
    count(*) filter (where sa.response_type = 'error')::bigint as error_requests,
    count(distinct sa.device_id_hash) filter (where sa.response_type = 'ad')::bigint as unique_filled_users
  from serve_attempts sa
  join apps a on a.app_id = sa.app_id
  cross join params p
  where a.user_id = p_user_id
    and sa.created_at >= (p.current_week_start - ((p.weeks - 1) * interval '7 days'))
  group by week_start, sa.app_id
),
impression_app_weeks as (
  select
    (date_trunc('week', ((ar.created_at at time zone 'utc') + interval '1 day')) - interval '1 day')::date as week_start,
    ar.app_id,
    count(*)::bigint as impressions,
    count(distinct ar.device_id_hash)::bigint as unique_users,
    count(*) filter (where ar.clicked)::bigint as clicks,
    count(distinct ar.device_id_hash) filter (where ar.clicked)::bigint as unique_click_users
  from ad_requests ar
  join apps a on a.app_id = ar.app_id
  cross join params p
  where a.user_id = p_user_id
    and ar.response_type = 'ad'
    and ar.created_at >= (p.current_week_start - ((p.weeks - 1) * interval '7 days'))
  group by week_start, ar.app_id
),
portfolio_app_weeks as (
  select
    coalesce(sw.week_start, iw.week_start) as week_start,
    coalesce(sw.app_id, iw.app_id) as app_id,
    coalesce(sw.request_users, 0)::bigint as request_users,
    coalesce(sw.filled_requests, 0)::bigint as filled_requests,
    coalesce(sw.no_fill_requests, 0)::bigint as no_fill_requests,
    coalesce(sw.error_requests, 0)::bigint as error_requests,
    coalesce(sw.unique_filled_users, 0)::bigint as unique_filled_users,
    coalesce(iw.impressions, 0)::bigint as impressions,
    coalesce(iw.unique_users, 0)::bigint as unique_users,
    coalesce(iw.clicks, 0)::bigint as clicks,
    coalesce(iw.unique_click_users, 0)::bigint as unique_click_users
  from serve_app_weeks sw
  full outer join impression_app_weeks iw
    on iw.week_start = sw.week_start
   and iw.app_id = sw.app_id
)
select
  paw.week_start,
  count(*)::bigint as app_count,
  sum(paw.request_users)::bigint as request_users,
  sum(paw.filled_requests)::bigint as filled_requests,
  sum(paw.no_fill_requests)::bigint as no_fill_requests,
  sum(paw.error_requests)::bigint as error_requests,
  sum(paw.unique_filled_users)::bigint as unique_filled_users,
  sum(paw.impressions)::bigint as impressions,
  sum(paw.unique_users)::bigint as unique_users,
  sum(paw.clicks)::bigint as clicks,
  sum(paw.unique_click_users)::bigint as unique_click_users
from portfolio_app_weeks paw
group by paw.week_start
order by paw.week_start desc;
$$;

drop function if exists get_app_data_volume(uuid, uuid);
create or replace function get_app_data_volume(
  p_user_id uuid,
  p_app_id uuid
)
returns table (
  serve_attempt_rows bigint,
  ad_request_rows bigint,
  unique_ad_view_rows bigint,
  serve_attempt_rows_7d bigint,
  serve_attempt_rows_30d bigint,
  ad_request_rows_7d bigint,
  ad_request_rows_30d bigint,
  first_serve_attempt_at timestamptz,
  last_serve_attempt_at timestamptz,
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
    from serve_attempts sa
    join owned_app oa on oa.app_id = sa.app_id
  ), 0)::bigint as serve_attempt_rows,
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
    from serve_attempts sa
    join owned_app oa on oa.app_id = sa.app_id
    where sa.created_at >= timezone('utc', now()) - interval '7 days'
  ), 0)::bigint as serve_attempt_rows_7d,
  coalesce((
    select count(*)
    from serve_attempts sa
    join owned_app oa on oa.app_id = sa.app_id
    where sa.created_at >= timezone('utc', now()) - interval '30 days'
  ), 0)::bigint as serve_attempt_rows_30d,
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
    select min(sa.created_at)
    from serve_attempts sa
    join owned_app oa on oa.app_id = sa.app_id
  ) as first_serve_attempt_at,
  (
    select max(sa.created_at)
    from serve_attempts sa
    join owned_app oa on oa.app_id = sa.app_id
  ) as last_serve_attempt_at,
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
  serve_attempt_rows bigint,
  request_users bigint,
  filled_serves bigint,
  no_fill_serves bigint,
  error_serves bigint,
  ad_request_rows bigint,
  impressions bigint,
  unique_users bigint,
  clicks bigint,
  unique_click_users bigint
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
),
serve_daily as (
  select
    timezone('utc', sa.created_at)::date as day,
    count(*)::bigint as serve_attempt_rows,
    count(distinct sa.device_id_hash)::bigint as request_users,
    count(*) filter (where sa.response_type = 'ad')::bigint as filled_serves,
    count(*) filter (where sa.response_type = 'no_fill')::bigint as no_fill_serves,
    count(*) filter (where sa.response_type = 'error')::bigint as error_serves
  from serve_attempts sa
  where sa.app_id in (select app_id from owned_app)
    and sa.created_at >= ((select min(day) from series)::timestamptz)
  group by timezone('utc', sa.created_at)::date
),
impression_daily as (
  select
    timezone('utc', ar.created_at)::date as day,
    count(ar.request_id)::bigint as ad_request_rows,
    count(ar.request_id) filter (where ar.response_type = 'ad')::bigint as impressions,
    count(distinct ar.device_id_hash) filter (where ar.response_type = 'ad')::bigint as unique_users,
    count(ar.request_id) filter (where ar.clicked)::bigint as clicks,
    count(distinct ar.device_id_hash) filter (where ar.clicked)::bigint as unique_click_users
  from ad_requests ar
  where ar.app_id in (select app_id from owned_app)
    and ar.created_at >= ((select min(day) from series)::timestamptz)
  group by timezone('utc', ar.created_at)::date
)
select
  s.day,
  coalesce(sd.serve_attempt_rows, 0)::bigint as serve_attempt_rows,
  coalesce(sd.request_users, 0)::bigint as request_users,
  coalesce(sd.filled_serves, 0)::bigint as filled_serves,
  coalesce(sd.no_fill_serves, 0)::bigint as no_fill_serves,
  coalesce(sd.error_serves, 0)::bigint as error_serves,
  coalesce(id.ad_request_rows, 0)::bigint as ad_request_rows,
  coalesce(id.impressions, 0)::bigint as impressions,
  coalesce(id.unique_users, 0)::bigint as unique_users,
  coalesce(id.clicks, 0)::bigint as clicks,
  coalesce(id.unique_click_users, 0)::bigint as unique_click_users
from series s
left join serve_daily sd on sd.day = s.day
left join impression_daily id on id.day = s.day
order by s.day desc;
$$;

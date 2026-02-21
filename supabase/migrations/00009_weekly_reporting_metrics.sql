-- Weekly reporting helpers for advertiser and publisher dashboards.
-- Adds placement tracking to ad request rows and SQL rollup functions.

alter table ad_requests add column if not exists placement_id text;
alter table ad_requests alter column placement_id set default 'default';

update ad_requests
set placement_id = 'default'
where placement_id is null;

alter table ad_requests alter column placement_id set not null;

create index if not exists idx_ad_requests_campaign_created
  on ad_requests(campaign_id, created_at desc);

create index if not exists idx_ad_requests_app_placement_created
  on ad_requests(app_id, placement_id, created_at desc);

drop function if exists get_advertiser_weekly_metrics(uuid, uuid, integer);
create or replace function get_advertiser_weekly_metrics(
  p_user_id uuid,
  p_app_id uuid default null,
  p_weeks integer default 12
)
returns table (
  week_start date,
  campaign_id uuid,
  campaign_name text,
  impressions bigint,
  unique_users bigint,
  clicks bigint
)
language sql
stable
as $$
with params as (
  select
    greatest(coalesce(p_weeks, 12), 1) as weeks,
    (date_trunc('week', timezone('utc', now()) + interval '1 day') - interval '1 day')::date as current_week_start
),
filtered as (
  select
    (date_trunc('week', ((ar.created_at at time zone 'utc') + interval '1 day')) - interval '1 day')::date as week_start,
    ar.campaign_id,
    c.name as campaign_name,
    ar.device_id_hash,
    ar.clicked
  from ad_requests ar
  join campaigns c on c.campaign_id = ar.campaign_id
  cross join params p
  where c.user_id = p_user_id
    and (p_app_id is null or c.app_id = p_app_id)
    and ar.response_type = 'ad'
    and ar.created_at >= (p.current_week_start - ((p.weeks - 1) * interval '7 days'))
)
select
  f.week_start,
  f.campaign_id,
  max(f.campaign_name) as campaign_name,
  count(*)::bigint as impressions,
  count(distinct f.device_id_hash)::bigint as unique_users,
  count(*) filter (where f.clicked)::bigint as clicks
from filtered f
group by f.week_start, f.campaign_id
order by f.week_start desc, max(f.campaign_name) asc;
$$;

drop function if exists get_publisher_weekly_totals(uuid, uuid, integer);
create or replace function get_publisher_weekly_totals(
  p_user_id uuid,
  p_app_id uuid,
  p_weeks integer default 12
)
returns table (
  week_start date,
  impressions bigint,
  unique_users bigint,
  clicks bigint
)
language sql
stable
as $$
with params as (
  select
    greatest(coalesce(p_weeks, 12), 1) as weeks,
    (date_trunc('week', timezone('utc', now()) + interval '1 day') - interval '1 day')::date as current_week_start
),
filtered as (
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
)
select
  f.week_start,
  count(*)::bigint as impressions,
  count(distinct f.device_id_hash)::bigint as unique_users,
  count(*) filter (where f.clicked)::bigint as clicks
from filtered f
group by f.week_start
order by f.week_start desc;
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
  impressions bigint,
  unique_users bigint,
  clicks bigint
)
language sql
stable
as $$
with params as (
  select
    greatest(coalesce(p_weeks, 12), 1) as weeks,
    (date_trunc('week', timezone('utc', now()) + interval '1 day') - interval '1 day')::date as current_week_start
),
filtered as (
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
)
select
  f.week_start,
  f.placement_id,
  count(*)::bigint as impressions,
  count(distinct f.device_id_hash)::bigint as unique_users,
  count(*) filter (where f.clicked)::bigint as clicks
from filtered f
group by f.week_start, f.placement_id
order by f.week_start desc, f.placement_id asc;
$$;

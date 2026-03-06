-- Live network snapshot for public/home/booking surfaces.
-- Counts current-week advertiser apps plus trailing-N-day publisher reach.

create or replace function get_live_network_stats(p_days integer default 7)
returns table (
  advertiser_app_count bigint,
  publisher_app_count bigint,
  publisher_unique_users bigint,
  current_week_start date,
  window_start timestamptz,
  window_end timestamptz
)
language sql
stable
as $$
with params as (
  select
    greatest(coalesce(p_days, 7), 1) as days,
    now() - make_interval(days => greatest(coalesce(p_days, 7), 1)) as window_start,
    now() as window_end,
    (date_trunc('week', timezone('utc', now()) + interval '1 day') - interval '1 day')::date as current_week_start
),
advertiser_apps as (
  select
    count(distinct c.app_id)::bigint as advertiser_app_count
  from slot_purchases sp
  join weekly_slots ws on ws.slot_id = sp.slot_id
  join campaigns c on c.campaign_id = sp.campaign_id
  join params p on true
  where sp.status = 'confirmed'
    and ws.week_start = p.current_week_start
    and c.app_id is not null
),
publisher_app_reach as (
  select
    sa.app_id,
    count(distinct sa.device_id_hash)::bigint as unique_users
  from serve_attempts sa
  join params p on true
  where sa.created_at >= p.window_start
  group by sa.app_id
)
select
  coalesce(aa.advertiser_app_count, 0)::bigint as advertiser_app_count,
  count(par.app_id)::bigint as publisher_app_count,
  coalesce(sum(par.unique_users), 0)::bigint as publisher_unique_users,
  p.current_week_start,
  p.window_start,
  p.window_end
from params p
cross join advertiser_apps aa
left join publisher_app_reach par on true
group by aa.advertiser_app_count, p.current_week_start, p.window_start, p.window_end;
$$;

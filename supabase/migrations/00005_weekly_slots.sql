-- Weekly ad slot system
-- Weeks start Sunday midnight UTC
-- Network has a flat weekly price that gets divided by percentage purchased

-- Weekly network pricing and availability
create table if not exists weekly_slots (
  slot_id uuid primary key default gen_random_uuid(),
  week_start date not null unique, -- Sunday of the week
  base_price_cents integer not null default 100000, -- $1000 default
  total_impressions_estimate integer not null default 0, -- Based on publisher metrics
  total_users_estimate integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Bookings against weekly slots
create table if not exists slot_purchases (
  purchase_id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references weekly_slots(slot_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid references campaigns(campaign_id) on delete set null,
  percentage_purchased integer not null check (percentage_purchased > 0 and percentage_purchased <= 40),
  price_cents integer not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'canceled', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_weekly_slots_week on weekly_slots(week_start);
create index if not exists idx_slot_purchases_slot on slot_purchases(slot_id);
create index if not exists idx_slot_purchases_user on slot_purchases(user_id);
create index if not exists idx_slot_purchases_campaign on slot_purchases(campaign_id);

-- RLS
alter table weekly_slots enable row level security;
alter table slot_purchases enable row level security;

-- Everyone can view weekly slots (public pricing)
create policy "Anyone can view weekly slots" on weekly_slots
  for select using (true);

-- Users can view and manage their own purchases
create policy "Users can view own purchases" on slot_purchases
  for select using (user_id = auth.uid());
create policy "Users can insert own purchases" on slot_purchases
  for insert with check (user_id = auth.uid());
create policy "Users can update own purchases" on slot_purchases
  for update using (user_id = auth.uid());

-- Function to get next Sunday (week start)
create or replace function get_next_week_start()
returns date as $$
begin
  -- If today is Sunday, return next Sunday
  -- Otherwise return the coming Sunday
  return current_date + (7 - extract(dow from current_date))::integer;
end;
$$ language plpgsql;

-- Function to get availability for a week
create or replace function get_week_availability(week_date date)
returns table (
  total_percentage integer,
  purchased_percentage integer,
  available_percentage integer,
  base_price_cents integer,
  total_users_estimate integer
) as $$
begin
  return query
  select
    100 as total_percentage,
    coalesce(sum(sp.percentage_purchased), 0)::integer as purchased_percentage,
    (100 - coalesce(sum(sp.percentage_purchased), 0))::integer as available_percentage,
    ws.base_price_cents,
    ws.total_users_estimate
  from weekly_slots ws
  left join slot_purchases sp on ws.slot_id = sp.slot_id
    and sp.status in ('pending', 'confirmed')
  where ws.week_start = week_date
  group by ws.slot_id, ws.base_price_cents, ws.total_users_estimate;
end;
$$ language plpgsql;

-- Insert initial slot for next week (will be created dynamically later)
insert into weekly_slots (week_start, base_price_cents, total_impressions_estimate, total_users_estimate)
values (
  get_next_week_start(),
  100000, -- $1000
  100000, -- 100k impressions estimate
  10000   -- 10k users estimate
) on conflict (week_start) do nothing;

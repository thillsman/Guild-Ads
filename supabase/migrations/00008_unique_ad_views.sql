-- Track unique ad views per user per placement per week
-- This enables:
--   1. Sticky ads: same user+placement = same ad for the week
--   2. Billing by unique users, not impressions
--   3. Fair payment model for publishers

create table if not exists unique_ad_views (
  view_id uuid primary key default gen_random_uuid(),

  -- Who saw the ad
  device_id_hash text not null,        -- hashed identifier for vendor
  publisher_app_id uuid not null references apps(app_id) on delete cascade,
  placement_id text not null,          -- developer-defined placement string

  -- Which ad was assigned (sticky for the week)
  campaign_id uuid not null references campaigns(campaign_id) on delete cascade,
  slot_purchase_id uuid references slot_purchases(purchase_id) on delete set null,

  -- When (for weekly reset)
  week_start date not null,            -- Sunday of the week (UTC)
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),

  -- Engagement
  view_count int not null default 1,   -- how many times shown (for stats, not billing)
  clicked boolean not null default false,
  clicked_at timestamptz,

  -- Unique constraint: one record per user+app+placement+week
  unique (device_id_hash, publisher_app_id, placement_id, week_start)
);

-- Indexes for common queries
create index idx_unique_views_week on unique_ad_views(week_start);
create index idx_unique_views_campaign on unique_ad_views(campaign_id);
create index idx_unique_views_publisher on unique_ad_views(publisher_app_id);
create index idx_unique_views_device on unique_ad_views(device_id_hash);

-- RLS
alter table unique_ad_views enable row level security;

-- Publishers can see views for their apps
create policy "Publishers can view stats for own apps" on unique_ad_views
  for select using (
    publisher_app_id in (select app_id from apps where user_id = auth.uid())
  );

-- Advertisers can see views for their campaigns
create policy "Advertisers can view stats for own campaigns" on unique_ad_views
  for select using (
    campaign_id in (select campaign_id from campaigns where user_id = auth.uid())
  );

-- Add placement_id to ad_requests for tracking
alter table ad_requests add column if not exists placement_id text;

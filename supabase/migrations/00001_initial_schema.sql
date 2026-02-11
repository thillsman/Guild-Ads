-- Guild Ads v1 Schema
-- Based on docs/55-data-model.md

-- Publishers
create table publishers (
  publisher_id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  status text not null default 'review' check (status in ('active', 'paused', 'review')),
  payout_method jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Apps
create table apps (
  app_id uuid primary key default gen_random_uuid(),
  publisher_id uuid not null references publishers(publisher_id) on delete cascade,
  name text not null,
  platform text not null default 'ios' check (platform in ('ios')),
  bundle_identifier text not null,
  status text not null default 'review' check (status in ('active', 'paused', 'review')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Placements
create table placements (
  placement_id uuid primary key default gen_random_uuid(),
  app_id uuid not null references apps(app_id) on delete cascade,
  key text not null,
  category_id uuid,
  tags text[] default '{}',
  enabled boolean not null default true,
  frequency_cap_policy jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (app_id, key)
);

-- Advertisers
create table advertisers (
  advertiser_id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  billing_customer_id text,
  status text not null default 'review' check (status in ('active', 'paused', 'review')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Bundles
create table bundles (
  bundle_id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'paused')),
  base_weekly_price_cents integer not null,
  price_floor_cents integer,
  price_ceiling_cents integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Bundle-Placement join table
create table bundle_placements (
  bundle_id uuid not null references bundles(bundle_id) on delete cascade,
  placement_id uuid not null references placements(placement_id) on delete cascade,
  added_at timestamptz not null default now(),
  status text not null default 'active' check (status in ('active', 'removed')),
  primary key (bundle_id, placement_id)
);

-- Creatives
create table creatives (
  creative_id uuid primary key default gen_random_uuid(),
  advertiser_id uuid not null references advertisers(advertiser_id) on delete cascade,
  headline text not null,
  body text not null,
  cta text not null,
  sponsored_label text not null default 'Sponsored',
  destination_type text not null check (destination_type in ('url', 'universal_link', 'deep_link')),
  destination_value text not null,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'rejected', 'disabled')),
  approved_at timestamptz,
  rejected_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Assets
create table assets (
  asset_id uuid primary key default gen_random_uuid(),
  creative_id uuid not null references creatives(creative_id) on delete cascade,
  type text not null check (type in ('icon', 'image')),
  url text not null,
  bytes integer,
  mime_type text,
  width integer,
  height integer,
  sha256 text,
  created_at timestamptz not null default now()
);

-- Campaigns
create table campaigns (
  campaign_id uuid primary key default gen_random_uuid(),
  advertiser_id uuid not null references advertisers(advertiser_id) on delete cascade,
  bundle_id uuid not null references bundles(bundle_id),
  creative_id uuid not null references creatives(creative_id),
  name text not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'active', 'completed', 'paused', 'canceled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Slot Bookings
create table slot_bookings (
  slot_booking_id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(campaign_id) on delete cascade,
  bundle_id uuid not null references bundles(bundle_id),
  slot_type text not null check (slot_type in ('daily', 'weekly')),
  start_at timestamptz not null,
  end_at timestamptz not null,
  price_cents integer not null,
  payment_type text not null check (payment_type in ('card', 'credits', 'mixed')),
  created_at timestamptz not null default now()
);

-- Credit Ledger
create table credit_ledger_entries (
  entry_id uuid primary key default gen_random_uuid(),
  publisher_id uuid references publishers(publisher_id),
  advertiser_id uuid references advertisers(advertiser_id),
  type text not null check (type in ('earn', 'spend', 'grant', 'expire', 'adjust')),
  amount_cents integer not null,
  related_campaign_id uuid references campaigns(campaign_id),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  check (publisher_id is not null or advertiser_id is not null)
);

-- Serve Decisions (for debugging and attribution)
create table serve_decisions (
  serve_id uuid primary key default gen_random_uuid(),
  ad_id text not null unique,
  campaign_id uuid not null references campaigns(campaign_id),
  creative_id uuid not null references creatives(creative_id),
  placement_id uuid not null references placements(placement_id),
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  nonce_hash text,
  sdk_version text,
  os_major integer,
  locale text
);

-- Impression Events (raw, short retention)
create table impression_events (
  event_id uuid primary key default gen_random_uuid(),
  serve_id uuid references serve_decisions(serve_id),
  campaign_id uuid not null references campaigns(campaign_id),
  creative_id uuid not null references creatives(creative_id),
  placement_id uuid not null references placements(placement_id),
  ts timestamptz not null,
  dedupe_key text not null,
  ingested_at timestamptz not null default now()
);

-- Click Events (raw, short retention)
create table click_events (
  event_id uuid primary key default gen_random_uuid(),
  serve_id uuid references serve_decisions(serve_id),
  campaign_id uuid not null references campaigns(campaign_id),
  creative_id uuid not null references creatives(creative_id),
  placement_id uuid not null references placements(placement_id),
  ts timestamptz not null,
  dedupe_key text not null,
  conversion_token_id uuid,
  ingested_at timestamptz not null default now()
);

-- Indexes for common queries
create index idx_apps_publisher on apps(publisher_id);
create index idx_placements_app on placements(app_id);
create index idx_bundle_placements_placement on bundle_placements(placement_id);
create index idx_campaigns_advertiser on campaigns(advertiser_id);
create index idx_campaigns_bundle on campaigns(bundle_id);
create index idx_slot_bookings_campaign on slot_bookings(campaign_id);
create index idx_slot_bookings_time on slot_bookings(start_at, end_at);
create index idx_serve_decisions_ad_id on serve_decisions(ad_id);
create index idx_impression_events_campaign on impression_events(campaign_id, ts);
create index idx_click_events_campaign on click_events(campaign_id, ts);

-- Row Level Security (basic policies)
alter table publishers enable row level security;
alter table apps enable row level security;
alter table placements enable row level security;
alter table advertisers enable row level security;
alter table campaigns enable row level security;
alter table creatives enable row level security;

-- Publishers can read/write their own data
create policy "Publishers can view own data" on publishers
  for select using (auth.uid() = user_id);
create policy "Publishers can update own data" on publishers
  for update using (auth.uid() = user_id);

-- Advertisers can read/write their own data
create policy "Advertisers can view own data" on advertisers
  for select using (auth.uid() = user_id);
create policy "Advertisers can update own data" on advertisers
  for update using (auth.uid() = user_id);

-- Apps readable by owner publisher
create policy "Apps viewable by owner" on apps
  for select using (
    publisher_id in (select publisher_id from publishers where user_id = auth.uid())
  );

-- Campaigns readable by owner advertiser
create policy "Campaigns viewable by owner" on campaigns
  for select using (
    advertiser_id in (select advertiser_id from advertisers where user_id = auth.uid())
  );

-- Creatives readable by owner advertiser
create policy "Creatives viewable by owner" on creatives
  for select using (
    advertiser_id in (select advertiser_id from advertisers where user_id = auth.uid())
  );

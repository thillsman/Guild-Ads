-- Cleanup: Remove unused tables from original complex model
-- Guild Ads now uses a simplified model:
--   - apps (owned by users, used for both publishing and advertising)
--   - app_tokens (API keys for publisher SDK)
--   - campaigns (inline creative, linked to apps)
--   - weekly_slots (weekly pricing)
--   - slot_purchases (bookings against weekly slots)
--   - ad_requests (new: tracks SDK requests for metrics)

-- Drop unused tables (in dependency order)

-- Events tables (no dependencies)
drop table if exists click_events cascade;
drop table if exists impression_events cascade;

-- Serve decisions (referenced by events, but we're dropping those)
drop table if exists serve_decisions cascade;

-- Credit system (not needed for prepaid model)
drop table if exists credit_ledger_entries cascade;

-- Old booking system (replaced by slot_purchases)
drop table if exists slot_bookings cascade;

-- Creatives and assets (inlined in campaigns now)
drop table if exists assets cascade;
drop table if exists creatives cascade;

-- Bundle system (replaced by weekly_slots)
drop table if exists bundle_placements cascade;
drop table if exists bundles cascade;

-- Placements (overkill for MVP - one ad spot per app)
drop table if exists placements cascade;

-- Publisher/Advertiser profiles (users own apps/campaigns directly)
drop table if exists publishers cascade;
drop table if exists advertisers cascade;

-- Clean up campaigns table - remove old refs
alter table campaigns drop column if exists advertiser_id;
alter table campaigns drop column if exists bundle_id;
alter table campaigns drop column if exists creative_id;

-- Remove old budget fields (prepaid via slot_purchases)
alter table campaigns drop column if exists daily_budget_usd;
alter table campaigns drop column if exists total_budget_usd;
alter table campaigns drop column if exists start_date;
alter table campaigns drop column if exists end_date;

-- Clean up apps table - remove publisher_id
alter table apps drop column if exists publisher_id;

-- Add ad_requests table for tracking SDK requests
-- This gives us user counts and what campaigns were served
create table if not exists ad_requests (
  request_id uuid primary key default gen_random_uuid(),
  app_id uuid not null references apps(app_id) on delete cascade,
  campaign_id uuid references campaigns(campaign_id) on delete set null,

  -- Request metadata
  device_id_hash text, -- hashed device identifier for counting unique users
  sdk_version text,
  os_version text,
  locale text,

  -- What happened
  response_type text not null check (response_type in ('ad', 'no_fill', 'error')),

  -- Engagement (updated async)
  clicked boolean not null default false,
  clicked_at timestamptz,

  created_at timestamptz not null default now()
);

-- Indexes for common queries
create index if not exists idx_ad_requests_app on ad_requests(app_id);
create index if not exists idx_ad_requests_campaign on ad_requests(campaign_id);
create index if not exists idx_ad_requests_created on ad_requests(created_at);
create index if not exists idx_ad_requests_device on ad_requests(device_id_hash);

-- RLS for ad_requests
alter table ad_requests enable row level security;

-- App owners can view requests for their apps
create policy "Users can view requests for own apps" on ad_requests
  for select using (
    app_id in (select app_id from apps where user_id = auth.uid())
  );

-- SDK inserts via service role (no user auth), so no insert policy for users

-- Drop unused indexes
drop index if exists idx_apps_publisher;
drop index if exists idx_placements_app;
drop index if exists idx_bundle_placements_placement;
drop index if exists idx_campaigns_advertiser;
drop index if exists idx_campaigns_bundle;
drop index if exists idx_slot_bookings_campaign;
drop index if exists idx_slot_bookings_time;
drop index if exists idx_serve_decisions_ad_id;
drop index if exists idx_impression_events_campaign;
drop index if exists idx_click_events_campaign;

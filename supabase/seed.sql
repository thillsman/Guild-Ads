-- Seed data for local development
-- This runs after migrations when you run `supabase db reset`

-- Create a test bundle
insert into bundles (bundle_id, name, description, base_weekly_price_cents, price_floor_cents, price_ceiling_cents)
values (
  '00000000-0000-0000-0000-000000000001',
  'Indie Essentials',
  'Curated placements in popular indie productivity and utility apps',
  5000, -- $50 base weekly price
  2500, -- $25 floor
  15000 -- $150 ceiling
);

insert into bundles (bundle_id, name, description, base_weekly_price_cents, price_floor_cents, price_ceiling_cents)
values (
  '00000000-0000-0000-0000-000000000002',
  'Creator Tools',
  'Reach creators and artists using design, writing, and content tools',
  7500,
  4000,
  20000
);

-- Note: Publishers, advertisers, apps, and campaigns should be created
-- through the dashboard after user signup for realistic testing

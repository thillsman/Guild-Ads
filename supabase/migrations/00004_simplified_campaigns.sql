-- Simplified campaigns: campaigns belong directly to apps
-- Creative content is stored inline for simplicity

-- Add app_id and user_id to campaigns, make other refs optional
alter table campaigns add column if not exists app_id uuid references apps(app_id) on delete cascade;
alter table campaigns add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- Make complex refs optional for simplified model
alter table campaigns alter column advertiser_id drop not null;
alter table campaigns alter column bundle_id drop not null;
alter table campaigns alter column creative_id drop not null;

-- Add inline creative fields
alter table campaigns add column if not exists headline text;
alter table campaigns add column if not exists body text;
alter table campaigns add column if not exists cta_text text default 'Learn More';
alter table campaigns add column if not exists destination_url text;

-- Add budget fields
alter table campaigns add column if not exists daily_budget_usd numeric(10,2);
alter table campaigns add column if not exists total_budget_usd numeric(10,2);

-- Add date range
alter table campaigns add column if not exists start_date date;
alter table campaigns add column if not exists end_date date;

-- Indexes
create index if not exists idx_campaigns_app on campaigns(app_id);
create index if not exists idx_campaigns_user on campaigns(user_id);

-- RLS policies for simplified campaigns
create policy "Users can view own campaigns" on campaigns
  for select using (user_id = auth.uid());
create policy "Users can insert own campaigns" on campaigns
  for insert with check (user_id = auth.uid());
create policy "Users can update own campaigns" on campaigns
  for update using (user_id = auth.uid());
create policy "Users can delete own campaigns" on campaigns
  for delete using (user_id = auth.uid());

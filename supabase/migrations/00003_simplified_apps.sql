-- Simplified app model: apps belong directly to users
-- Can be used for advertising, publishing, or both

-- Add user_id directly to apps table (apps can exist without publisher profile)
alter table apps add column if not exists user_id uuid references auth.users(id);

-- Make publisher_id optional (for backwards compatibility)
alter table apps alter column publisher_id drop not null;

-- Add App Store metadata fields
alter table apps add column if not exists app_store_id text;
alter table apps add column if not exists subtitle text;
alter table apps add column if not exists icon_url text;
alter table apps add column if not exists app_store_url text;

-- Publisher auth tokens for SDK
create table if not exists app_tokens (
  token_id uuid primary key default gen_random_uuid(),
  app_id uuid not null references apps(app_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null, -- store hash, not raw token
  name text not null default 'Default',
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

-- Index for token lookups
create index if not exists idx_app_tokens_hash on app_tokens(token_hash) where revoked_at is null;
create index if not exists idx_apps_user on apps(user_id);
create index if not exists idx_apps_store_id on apps(app_store_id);

-- RLS for apps (users can manage their own apps)
create policy "Users can view own apps" on apps
  for select using (user_id = auth.uid());
create policy "Users can insert own apps" on apps
  for insert with check (user_id = auth.uid());
create policy "Users can update own apps" on apps
  for update using (user_id = auth.uid());
create policy "Users can delete own apps" on apps
  for delete using (user_id = auth.uid());

-- RLS for app tokens
alter table app_tokens enable row level security;
create policy "Users can view own tokens" on app_tokens
  for select using (user_id = auth.uid());
create policy "Users can insert own tokens" on app_tokens
  for insert with check (user_id = auth.uid());
create policy "Users can update own tokens" on app_tokens
  for update using (user_id = auth.uid());

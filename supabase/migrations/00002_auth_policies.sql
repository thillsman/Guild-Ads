-- Additional RLS policies for self-service profile creation

-- Publishers can insert their own profile
create policy "Users can create own publisher profile" on publishers
  for insert with check (auth.uid() = user_id);

-- Advertisers can insert their own profile
create policy "Users can create own advertiser profile" on advertisers
  for insert with check (auth.uid() = user_id);

-- Apps: publishers can manage their own apps
create policy "Publishers can insert own apps" on apps
  for insert with check (
    publisher_id in (select publisher_id from publishers where user_id = auth.uid())
  );
create policy "Publishers can update own apps" on apps
  for update using (
    publisher_id in (select publisher_id from publishers where user_id = auth.uid())
  );

-- Placements: publishers can manage placements for their apps
create policy "Publishers can view own placements" on placements
  for select using (
    app_id in (
      select app_id from apps
      where publisher_id in (select publisher_id from publishers where user_id = auth.uid())
    )
  );
create policy "Publishers can insert own placements" on placements
  for insert with check (
    app_id in (
      select app_id from apps
      where publisher_id in (select publisher_id from publishers where user_id = auth.uid())
    )
  );
create policy "Publishers can update own placements" on placements
  for update using (
    app_id in (
      select app_id from apps
      where publisher_id in (select publisher_id from publishers where user_id = auth.uid())
    )
  );

-- Creatives: advertisers can manage their own creatives
create policy "Advertisers can insert own creatives" on creatives
  for insert with check (
    advertiser_id in (select advertiser_id from advertisers where user_id = auth.uid())
  );
create policy "Advertisers can update own creatives" on creatives
  for update using (
    advertiser_id in (select advertiser_id from advertisers where user_id = auth.uid())
  );

-- Campaigns: advertisers can manage their own campaigns
create policy "Advertisers can insert own campaigns" on campaigns
  for insert with check (
    advertiser_id in (select advertiser_id from advertisers where user_id = auth.uid())
  );
create policy "Advertisers can update own campaigns" on campaigns
  for update using (
    advertiser_id in (select advertiser_id from advertisers where user_id = auth.uid())
  );

-- Bundles: everyone can view active bundles (for purchasing)
create policy "Anyone can view active bundles" on bundles
  for select using (status = 'active');
alter table bundles enable row level security;

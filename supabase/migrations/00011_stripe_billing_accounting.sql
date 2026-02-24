-- Stripe-direct billing, credits, accounting, and payout foundation.
-- This migration introduces booking intents, webhook event storage,
-- payout ledgers, and internal account policy controls.

create table if not exists billing_booking_intents (
  booking_intent_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid not null references campaigns(campaign_id) on delete cascade,
  slot_id uuid not null references weekly_slots(slot_id) on delete cascade,
  percentage_purchased integer not null check (percentage_purchased > 0 and percentage_purchased <= 40),
  quoted_price_cents integer not null check (quoted_price_cents >= 0),
  credits_applied_cents integer not null default 0 check (credits_applied_cents >= 0),
  cash_due_cents integer not null check (cash_due_cents >= 0),
  currency text not null default 'usd' check (currency = 'usd'),
  status text not null default 'created' check (
    status in (
      'created',
      'awaiting_payment',
      'processing',
      'confirmed',
      'failed',
      'refunded_capacity_conflict',
      'expired',
      'canceled'
    )
  ),
  failure_reason text,
  is_internal boolean not null default false,
  stripe_customer_id text,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  stripe_charge_id text,
  stripe_refund_id text,
  confirmed_purchase_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create index if not exists idx_billing_booking_intents_user_created on billing_booking_intents(user_id, created_at desc);
create index if not exists idx_billing_booking_intents_slot_status on billing_booking_intents(slot_id, status);
create unique index if not exists idx_billing_booking_intents_checkout_session on billing_booking_intents(stripe_checkout_session_id) where stripe_checkout_session_id is not null;
create unique index if not exists idx_billing_booking_intents_payment_intent on billing_booking_intents(stripe_payment_intent_id) where stripe_payment_intent_id is not null;

create table if not exists billing_webhook_events (
  webhook_event_id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('stripe')),
  external_event_id text not null,
  event_type text not null,
  payload jsonb not null,
  processed boolean not null default false,
  processed_at timestamptz,
  processing_error text,
  created_at timestamptz not null default now(),
  unique (provider, external_event_id)
);

create table if not exists billing_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists credit_ledger_entries (
  entry_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_cents integer not null,
  entry_type text not null check (
    entry_type in (
      'promo_grant',
      'booking_hold',
      'booking_spend',
      'booking_hold_release',
      'cash_conversion_debit',
      'cash_conversion_bonus',
      'manual_adjustment',
      'payout_deduction'
    )
  ),
  source_table text,
  source_id uuid,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_credit_ledger_entries_user_created on credit_ledger_entries(user_id, created_at desc);
create index if not exists idx_credit_ledger_entries_user_expiry on credit_ledger_entries(user_id, expires_at);

create table if not exists credit_holds (
  hold_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  booking_intent_id uuid not null references billing_booking_intents(booking_intent_id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  status text not null default 'held' check (status in ('held', 'captured', 'released')),
  released_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (booking_intent_id)
);

create index if not exists idx_credit_holds_user_status on credit_holds(user_id, status);

create table if not exists publisher_connect_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_account_id text not null unique,
  details_submitted boolean not null default false,
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists payout_batches (
  batch_id uuid primary key default gen_random_uuid(),
  batch_month date not null unique,
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  total_items integer not null default 0,
  total_amount_cents integer not null default 0,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists payout_items (
  payout_item_id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references payout_batches(batch_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_account_id text not null,
  amount_cents integer not null check (amount_cents > 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'skipped')),
  stripe_transfer_id text,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payout_items_batch on payout_items(batch_id);
create index if not exists idx_payout_items_user_status on payout_items(user_id, status);

create table if not exists publisher_weekly_earnings (
  earning_id uuid primary key default gen_random_uuid(),
  week_start date not null,
  publisher_app_id uuid not null references apps(app_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  unique_users integer not null default 0 check (unique_users >= 0),
  network_unique_users integer not null default 0 check (network_unique_users >= 0),
  share_ratio numeric(12,8) not null default 0,
  pool_cents integer not null default 0 check (pool_cents >= 0),
  gross_earnings_cents integer not null default 0 check (gross_earnings_cents >= 0),
  converted_cents integer not null default 0 check (converted_cents >= 0),
  hold_until timestamptz not null,
  payout_status text not null default 'accrued' check (
    payout_status in ('accrued', 'eligible', 'paid', 'carried_forward')
  ),
  payout_item_id uuid references payout_items(payout_item_id) on delete set null,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (week_start, publisher_app_id)
);

create index if not exists idx_publisher_weekly_earnings_user_week on publisher_weekly_earnings(user_id, week_start desc);
create index if not exists idx_publisher_weekly_earnings_hold on publisher_weekly_earnings(payout_status, hold_until);

create table if not exists internal_account_policies (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active boolean not null default true,
  can_bypass_checkout boolean not null default false,
  can_use_rc_grants boolean not null default false,
  no_fill_exempt boolean not null default false,
  can_manage_internal boolean not null default false,
  notes text,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table slot_purchases add column if not exists booking_intent_id uuid references billing_booking_intents(booking_intent_id) on delete set null;
alter table slot_purchases add column if not exists payment_provider text check (payment_provider in ('stripe', 'credits', 'internal'));
alter table slot_purchases add column if not exists payment_reference text;
alter table slot_purchases add column if not exists is_internal boolean not null default false;
alter table slot_purchases add column if not exists refund_reference text;
alter table slot_purchases add column if not exists refunded_at timestamptz;

create index if not exists idx_slot_purchases_booking_intent on slot_purchases(booking_intent_id);
create index if not exists idx_slot_purchases_internal on slot_purchases(is_internal);

alter table billing_booking_intents
  add constraint billing_booking_intents_confirmed_purchase_id_fkey
  foreign key (confirmed_purchase_id) references slot_purchases(purchase_id) on delete set null;

create or replace function get_user_credit_balance(p_user_id uuid)
returns integer
language sql
stable
as $$
  select coalesce(sum(cle.amount_cents), 0)::integer
  from credit_ledger_entries cle
  where cle.user_id = p_user_id
    and cle.entry_type in ('promo_grant', 'booking_spend', 'cash_conversion_bonus', 'manual_adjustment')
    and (cle.expires_at is null or cle.expires_at > timezone('utc', now()));
$$;

create or replace function confirm_booking_intent_atomic(p_booking_intent_id uuid)
returns table (
  success boolean,
  reason text,
  purchase_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_intent billing_booking_intents%rowtype;
  v_total_percentage integer;
  v_user_percentage integer;
  v_purchase_id uuid;
begin
  select *
  into v_intent
  from billing_booking_intents
  where booking_intent_id = p_booking_intent_id
  for update;

  if not found then
    return query select false, 'intent_not_found', null::uuid;
    return;
  end if;

  if v_intent.status = 'confirmed' then
    return query select true, 'already_confirmed', v_intent.confirmed_purchase_id;
    return;
  end if;

  if v_intent.status not in ('created', 'awaiting_payment', 'processing') then
    return query select false, 'intent_not_confirmable', null::uuid;
    return;
  end if;

  perform 1
  from weekly_slots ws
  where ws.slot_id = v_intent.slot_id
  for update;

  if not found then
    update billing_booking_intents
    set status = 'failed',
        failure_reason = 'slot_not_found',
        updated_at = now()
    where booking_intent_id = v_intent.booking_intent_id;

    return query select false, 'slot_not_found', null::uuid;
    return;
  end if;

  select coalesce(sum(sp.percentage_purchased), 0)::integer
  into v_total_percentage
  from slot_purchases sp
  where sp.slot_id = v_intent.slot_id
    and sp.status in ('pending', 'confirmed');

  if (v_total_percentage + v_intent.percentage_purchased) > 100 then
    update billing_booking_intents
    set status = 'refunded_capacity_conflict',
        failure_reason = 'capacity_exceeded',
        updated_at = now()
    where booking_intent_id = v_intent.booking_intent_id;

    return query select false, 'capacity_exceeded', null::uuid;
    return;
  end if;

  select coalesce(sum(sp.percentage_purchased), 0)::integer
  into v_user_percentage
  from slot_purchases sp
  where sp.slot_id = v_intent.slot_id
    and sp.user_id = v_intent.user_id
    and sp.status in ('pending', 'confirmed');

  if (v_user_percentage + v_intent.percentage_purchased) > 40 then
    update billing_booking_intents
    set status = 'failed',
        failure_reason = 'user_cap_exceeded',
        updated_at = now()
    where booking_intent_id = v_intent.booking_intent_id;

    return query select false, 'user_cap_exceeded', null::uuid;
    return;
  end if;

  insert into slot_purchases (
    slot_id,
    user_id,
    campaign_id,
    percentage_purchased,
    price_cents,
    status,
    booking_intent_id,
    payment_provider,
    payment_reference,
    is_internal
  ) values (
    v_intent.slot_id,
    v_intent.user_id,
    v_intent.campaign_id,
    v_intent.percentage_purchased,
    v_intent.quoted_price_cents,
    'confirmed',
    v_intent.booking_intent_id,
    case
      when v_intent.is_internal then 'internal'
      when v_intent.cash_due_cents = 0 then 'credits'
      else 'stripe'
    end,
    coalesce(v_intent.stripe_payment_intent_id, v_intent.stripe_checkout_session_id),
    v_intent.is_internal
  )
  returning slot_purchases.purchase_id into v_purchase_id;

  update billing_booking_intents
  set status = 'confirmed',
      confirmed_purchase_id = v_purchase_id,
      confirmed_at = now(),
      updated_at = now()
  where booking_intent_id = v_intent.booking_intent_id;

  return query select true, 'confirmed', v_purchase_id;
end;
$$;

create or replace function run_weekly_earnings_accrual(p_week_start date)
returns table (
  week_start date,
  pool_cents integer,
  network_unique_users integer,
  rows_upserted integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pool_cents integer := 0;
  v_network_unique_users integer := 0;
  v_rows_upserted integer := 0;
  v_hold_until timestamptz;
begin
  if p_week_start is null then
    return query select null::date, 0, 0, 0;
    return;
  end if;

  select coalesce(round(sum(sp.price_cents) * 0.70), 0)::integer
  into v_pool_cents
  from slot_purchases sp
  join weekly_slots ws on ws.slot_id = sp.slot_id
  where ws.week_start = p_week_start
    and sp.status = 'confirmed'
    and coalesce(sp.is_internal, false) = false
    and sp.refunded_at is null;

  with app_users as (
    select
      uav.publisher_app_id,
      count(distinct uav.device_id_hash)::integer as unique_users
    from unique_ad_views uav
    where uav.week_start = p_week_start
    group by uav.publisher_app_id
  )
  select coalesce(sum(au.unique_users), 0)::integer
  into v_network_unique_users
  from app_users au;

  if v_network_unique_users = 0 then
    return query select p_week_start, v_pool_cents, 0, 0;
    return;
  end if;

  v_hold_until := ((p_week_start::timestamp + interval '37 days') at time zone 'utc');

  with app_users as (
    select
      uav.publisher_app_id,
      count(distinct uav.device_id_hash)::integer as unique_users
    from unique_ad_views uav
    where uav.week_start = p_week_start
    group by uav.publisher_app_id
  ),
  app_earnings as (
    select
      p_week_start as week_start,
      au.publisher_app_id,
      a.user_id,
      au.unique_users,
      v_network_unique_users as network_unique_users,
      round(au.unique_users::numeric / v_network_unique_users::numeric, 8) as share_ratio,
      v_pool_cents as pool_cents,
      round(v_pool_cents::numeric * (au.unique_users::numeric / v_network_unique_users::numeric))::integer as gross_earnings_cents
    from app_users au
    join apps a on a.app_id = au.publisher_app_id
    where a.user_id is not null
  )
  insert into publisher_weekly_earnings (
    week_start,
    publisher_app_id,
    user_id,
    unique_users,
    network_unique_users,
    share_ratio,
    pool_cents,
    gross_earnings_cents,
    hold_until,
    payout_status,
    updated_at
  )
  select
    ae.week_start,
    ae.publisher_app_id,
    ae.user_id,
    ae.unique_users,
    ae.network_unique_users,
    ae.share_ratio,
    ae.pool_cents,
    ae.gross_earnings_cents,
    v_hold_until,
    case
      when v_hold_until <= timezone('utc', now()) then 'eligible'
      else 'accrued'
    end,
    now()
  from app_earnings ae
  on conflict (week_start, publisher_app_id)
  do update set
    user_id = excluded.user_id,
    unique_users = excluded.unique_users,
    network_unique_users = excluded.network_unique_users,
    share_ratio = excluded.share_ratio,
    pool_cents = excluded.pool_cents,
    gross_earnings_cents = excluded.gross_earnings_cents,
    hold_until = excluded.hold_until,
    payout_status = case
      when publisher_weekly_earnings.payout_status = 'paid' then publisher_weekly_earnings.payout_status
      else excluded.payout_status
    end,
    updated_at = now();

  get diagnostics v_rows_upserted = row_count;

  return query select p_week_start, v_pool_cents, v_network_unique_users, v_rows_upserted;
end;
$$;

drop policy if exists "Users can insert own purchases" on slot_purchases;
drop policy if exists "Users can update own purchases" on slot_purchases;

alter table billing_booking_intents enable row level security;
alter table billing_webhook_events enable row level security;
alter table billing_customers enable row level security;
alter table credit_ledger_entries enable row level security;
alter table credit_holds enable row level security;
alter table publisher_connect_accounts enable row level security;
alter table publisher_weekly_earnings enable row level security;
alter table payout_batches enable row level security;
alter table payout_items enable row level security;
alter table internal_account_policies enable row level security;

create policy "Users can view own booking intents" on billing_booking_intents
  for select using (user_id = auth.uid());

create policy "Users can view own billing customers" on billing_customers
  for select using (user_id = auth.uid());

create policy "Users can view own credit ledger" on credit_ledger_entries
  for select using (user_id = auth.uid());

create policy "Users can view own credit holds" on credit_holds
  for select using (user_id = auth.uid());

create policy "Users can view own connect account" on publisher_connect_accounts
  for select using (user_id = auth.uid());

create policy "Users can view own weekly earnings" on publisher_weekly_earnings
  for select using (user_id = auth.uid());

create policy "Users can view own payout items" on payout_items
  for select using (user_id = auth.uid());

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

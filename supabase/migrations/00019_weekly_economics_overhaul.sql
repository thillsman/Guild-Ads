-- Weekly economics overhaul:
-- - split booked value vs cash paid vs credits applied
-- - accrue publisher earnings from cash spend only
-- - grant persistent publisher bonus credits after week close
-- - shorten publisher hold period to 14 days after week close
-- - expose booked/cash/credit splits in admin reporting

alter table slot_purchases
  add column if not exists cash_paid_cents integer not null default 0 check (cash_paid_cents >= 0),
  add column if not exists credits_applied_cents integer not null default 0 check (credits_applied_cents >= 0);

alter table publisher_weekly_earnings
  add column if not exists cash_spend_cents integer not null default 0 check (cash_spend_cents >= 0),
  add column if not exists platform_reserve_cents integer not null default 0 check (platform_reserve_cents >= 0),
  add column if not exists bonus_credit_cents integer not null default 0 check (bonus_credit_cents >= 0),
  add column if not exists bonus_credit_entry_id uuid references credit_ledger_entries(entry_id) on delete set null,
  add column if not exists bonus_credited_at timestamptz;

alter table credit_ledger_entries
  drop constraint if exists credit_ledger_entries_entry_type_check;

alter table credit_ledger_entries
  add constraint credit_ledger_entries_entry_type_check check (
    entry_type in (
      'promo_grant',
      'booking_hold',
      'booking_spend',
      'booking_hold_release',
      'cash_conversion_debit',
      'cash_conversion_bonus',
      'cash_conversion_credit',
      'publisher_bonus_credit',
      'manual_adjustment',
      'payout_deduction'
    )
  );

create unique index if not exists idx_credit_ledger_entries_unique_publisher_bonus
  on credit_ledger_entries(source_id)
  where source_table = 'publisher_weekly_earnings'
    and entry_type = 'publisher_bonus_credit'
    and source_id is not null;

update slot_purchases sp
set
  cash_paid_cents = greatest(coalesce(bbi.cash_due_cents, 0), 0),
  credits_applied_cents = greatest(coalesce(bbi.credits_applied_cents, 0), 0),
  updated_at = now()
from billing_booking_intents bbi
where sp.booking_intent_id = bbi.booking_intent_id;

update slot_purchases
set
  cash_paid_cents = case
    when coalesce(is_internal, false) = true then 0
    when payment_provider = 'stripe' then greatest(price_cents, 0)
    else 0
  end,
  credits_applied_cents = case
    when payment_provider = 'credits' then greatest(price_cents, 0)
    else 0
  end,
  updated_at = now()
where booking_intent_id is null;

create or replace function get_user_credit_balance(p_user_id uuid)
returns integer
language sql
stable
as $get_user_credit_balance$
  select coalesce(sum(cle.amount_cents), 0)::integer
  from credit_ledger_entries cle
  where cle.user_id = p_user_id
    and cle.entry_type in (
      'promo_grant',
      'booking_spend',
      'cash_conversion_bonus',
      'cash_conversion_credit',
      'publisher_bonus_credit',
      'manual_adjustment'
    )
    and (cle.expires_at is null or cle.expires_at > timezone('utc', now()));
$get_user_credit_balance$;

create or replace function get_weekly_sold_percentage(p_week_start date)
returns integer
language sql
stable
as $get_weekly_sold_percentage$
  select coalesce(sum(sp.percentage_purchased), 0)::integer
  from slot_purchases sp
  join weekly_slots ws on ws.slot_id = sp.slot_id
  where ws.week_start = p_week_start
    and sp.status = 'confirmed'
    and coalesce(sp.is_internal, false) = false
    and sp.refunded_at is null;
$get_weekly_sold_percentage$;

create or replace function apply_weekly_price_adjustment(
  p_base_price_cents integer,
  p_sold_percentage integer
)
returns integer
language sql
immutable
as $apply_weekly_price_adjustment$
  select greatest(
    case
      when coalesce(p_base_price_cents, 0) <= 0 then 100000
      when coalesce(p_sold_percentage, 0) >= 90 then round(p_base_price_cents * 1.10)
      when coalesce(p_sold_percentage, 0) >= 70 then round(p_base_price_cents * 1.05)
      when coalesce(p_sold_percentage, 0) >= 50 then p_base_price_cents
      when coalesce(p_sold_percentage, 0) >= 30 then round(p_base_price_cents * 0.95)
      else round(p_base_price_cents * 0.90)
    end,
    1
  )::integer;
$apply_weekly_price_adjustment$;

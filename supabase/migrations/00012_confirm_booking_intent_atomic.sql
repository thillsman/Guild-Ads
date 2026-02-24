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

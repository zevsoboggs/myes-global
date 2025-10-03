-- Request purchase: buyer initiates booking and sales request
create or replace function public.request_purchase(p_property_id uuid)
returns json
language plpgsql
security definer
as $$
declare
  v_prop record;
  v_booking bookings%rowtype;
  v_request sales_requests%rowtype;
begin
  select id, realtor_id, is_active into v_prop from properties where id = p_property_id;
  if v_prop is null or v_prop.is_active is not true then
    raise exception 'property not found or inactive';
  end if;

  -- only buyers
  if not exists (select 1 from profiles where id = auth.uid() and role = 'buyer') then
    raise exception 'only buyers can request purchase';
  end if;

  -- ensure active booking for this buyer
  select * into v_booking from bookings
   where property_id = p_property_id and buyer_id = auth.uid() and status = 'active' and expires_at > now()
   order by created_at desc limit 1;
  if v_booking is null then
    insert into bookings(property_id, buyer_id, status, expires_at)
    values (p_property_id, auth.uid(), 'active', now() + interval '30 minutes')
    returning * into v_booking;
  end if;

  -- create sales request if not exists (by pair buyer/property)
  select * into v_request from sales_requests where property_id = p_property_id and buyer_id = auth.uid() order by created_at desc limit 1;
  if v_request is null then
    insert into sales_requests(property_id, booking_id, buyer_id, realtor_id, status)
    values (p_property_id, v_booking.id, auth.uid(), v_prop.realtor_id, 'pending')
    returning * into v_request;
  end if;

  -- notify realtor
  insert into notifications(user_id, title, body)
  values (v_prop.realtor_id, 'Новый запрос на покупку', 'Покупатель инициировал запрос по объекту')
  on conflict do nothing;

  return json_build_object('booking', row_to_json(v_booking), 'sales_request', row_to_json(v_request));
end;
$$;

revoke all on function public.request_purchase(uuid) from public;
grant execute on function public.request_purchase(uuid) to authenticated; 
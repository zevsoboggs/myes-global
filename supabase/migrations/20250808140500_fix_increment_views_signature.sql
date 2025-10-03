-- Fix RPC bad request: accept text and cast to uuid inside
create or replace function public.increment_property_views(p_id text)
returns void
language plpgsql
security definer
as $$
declare v uuid;
begin
  if p_id is null then return; end if;
  begin
    v := p_id::uuid;
  exception when others then
    return;
  end;
  update public.properties
    set views_count = coalesce(views_count, 0) + 1
    where id = v;

  insert into public.property_view_daily(property_id, day, views)
    values (v, current_date, 1)
  on conflict (property_id, day)
  do update set views = public.property_view_daily.views + 1;
end;
$$; 
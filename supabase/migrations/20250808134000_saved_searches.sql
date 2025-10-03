-- Saved searches
create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  filters jsonb not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_saved_searches_user on public.saved_searches(user_id);

create or replace function public.set_updated_at_saved_searches()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger trg_saved_searches_updated
  before update on public.saved_searches
  for each row execute function public.set_updated_at_saved_searches();

alter table public.saved_searches enable row level security;

drop policy if exists "saved_searches_select_own" on public.saved_searches;
create policy "saved_searches_select_own" on public.saved_searches
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "saved_searches_insert_own" on public.saved_searches;
create policy "saved_searches_insert_own" on public.saved_searches
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "saved_searches_update_own" on public.saved_searches;
create policy "saved_searches_update_own" on public.saved_searches
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "saved_searches_delete_own" on public.saved_searches;
create policy "saved_searches_delete_own" on public.saved_searches
  for delete to authenticated
  using (user_id = auth.uid());

-- Matches table
create table if not exists public.saved_search_matches (
  id uuid primary key default gen_random_uuid(),
  saved_search_id uuid not null references public.saved_searches(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(saved_search_id, property_id)
);

alter table public.saved_search_matches enable row level security;

drop policy if exists "saved_matches_select_owner" on public.saved_search_matches;
create policy "saved_matches_select_owner" on public.saved_search_matches
  for select to authenticated
  using (exists(select 1 from public.saved_searches s where s.id = saved_search_id and s.user_id = auth.uid()));

-- Helper to check match
create or replace function public.property_matches_filters(p public.properties, f jsonb)
returns boolean language sql stable as $$
  with flt as (
    select 
      nullif(f->>'search','') as search,
      nullif(f->>'propertyType','') as property_type,
      (f->>'minPrice')::numeric as min_price,
      (f->>'maxPrice')::numeric as max_price,
      coalesce((f->>'bedrooms')::int, 0) as bedrooms,
      coalesce((f->>'bathrooms')::int, 0) as bathrooms,
      (f->>'minArea')::numeric as min_area,
      (f->>'maxArea')::numeric as max_area,
      f->'features' as features
  )
  select (
    -- search by title/address
    (select coalesce(search is null or p.title ilike '%'||search||'%' or p.address ilike '%'||search||'%', true) from flt) and
    -- type
    (select coalesce(property_type is null or p.property_type = property_type, true) from flt) and
    -- price
    (select coalesce(min_price is null or p.price_usdt >= min_price, true) from flt) and
    (select coalesce(max_price is null or p.price_usdt <= max_price, true) from flt) and
    -- rooms
    (select coalesce(bedrooms = 0 or p.bedrooms >= bedrooms, true) from flt) and
    (select coalesce(bathrooms = 0 or p.bathrooms >= bathrooms, true) from flt) and
    -- area
    (select coalesce(min_area is null or p.area_sqm >= min_area, true) from flt) and
    (select coalesce(max_area is null or p.area_sqm <= max_area, true) from flt) and
    -- features overlap
    (select coalesce(features is null or jsonb_array_length(features) = 0 or (to_jsonb(p.features)::jsonb ?| (select array_agg(value::text) from jsonb_array_elements(features))), true) from flt)
  );
$$;

-- Trigger to generate matches when property is created/activated
create or replace function public.on_property_upsert_saved_search_matches()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT') or (tg_op = 'UPDATE' and (new.is_active is distinct from old.is_active) and new.is_active = true) then
    insert into public.saved_search_matches(saved_search_id, property_id)
    select s.id, new.id
    from public.saved_searches s
    where s.is_active = true
      and public.property_matches_filters(new, s.filters)
    on conflict do nothing;
  end if;
  return new;
end; $$;

create trigger trg_properties_saved_searches
  after insert or update on public.properties
  for each row execute function public.on_property_upsert_saved_search_matches(); 
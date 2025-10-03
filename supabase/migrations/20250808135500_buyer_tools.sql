-- Сравнение объектов
create table if not exists public.user_compare (
  user_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id, property_id)
);

alter table public.user_compare enable row level security;

drop policy if exists "user_compare_own" on public.user_compare;
create policy "user_compare_own" on public.user_compare
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Заметки к объекту
create table if not exists public.user_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.user_notes enable row level security;

drop policy if exists "user_notes_own" on public.user_notes;
create policy "user_notes_own" on public.user_notes
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Показы (календарь)
create table if not exists public.showings (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  scheduled_at timestamptz not null,
  status text not null default 'scheduled',
  note text,
  created_at timestamptz not null default now()
);

alter table public.showings enable row level security;

drop policy if exists "showings_buyer_own" on public.showings;
create policy "showings_buyer_own" on public.showings
  for select to authenticated
  using (buyer_id = auth.uid() or exists(select 1 from public.properties p where p.id = property_id and p.realtor_id = auth.uid()));

drop policy if exists "showings_insert_buyer" on public.showings;
create policy "showings_insert_buyer" on public.showings
  for insert to authenticated
  with check (buyer_id = auth.uid());

-- Предпочтения покупателя
create table if not exists public.buyer_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  prefs jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.buyer_preferences enable row level security;

drop policy if exists "buyer_prefs_own" on public.buyer_preferences;
create policy "buyer_prefs_own" on public.buyer_preferences
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace function public.set_updated_at_buyer_prefs()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
create trigger trg_buyer_prefs_upd before update on public.buyer_preferences for each row execute function public.set_updated_at_buyer_prefs();

-- Вьюха рекомендаций (простое сопоставление по типу/цене/комнатам)
create or replace view public.v_recommended_properties as
select p.*
from public.properties p
join public.buyer_preferences bp on true
where p.is_active = true
  and (
    (bp.prefs->>'propertyType' is null or bp.prefs->>'propertyType' = '' or p.property_type = bp.prefs->>'propertyType')
  )
  and (
    (bp.prefs->>'minPrice')::numeric is null or p.price_usdt >= (bp.prefs->>'minPrice')::numeric
  )
  and (
    (bp.prefs->>'maxPrice')::numeric is null or ( (bp.prefs->>'maxPrice')::numeric ) = 0 or p.price_usdt <= (bp.prefs->>'maxPrice')::numeric
  )
  and (
    coalesce((bp.prefs->>'bedrooms')::int,0) = 0 or p.bedrooms >= (bp.prefs->>'bedrooms')::int
  );

-- Дополнительные поля у properties для медиа
alter table if exists public.properties
  add column if not exists virtual_tour_url text,
  add column if not exists video_url text; 
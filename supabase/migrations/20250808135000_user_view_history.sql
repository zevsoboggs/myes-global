-- История просмотров объектов покупателями
create table if not exists public.user_view_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_uvh_user on public.user_view_history(user_id, created_at desc);
create index if not exists idx_uvh_property on public.user_view_history(property_id, created_at desc);

alter table public.user_view_history enable row level security;

drop policy if exists "uvh_select_own" on public.user_view_history;
create policy "uvh_select_own" on public.user_view_history
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "uvh_insert_own" on public.user_view_history;
create policy "uvh_insert_own" on public.user_view_history
  for insert to authenticated
  with check (user_id = auth.uid()); 
-- Web Push subscriptions
create table if not exists public.webpush_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  unique(user_id, endpoint)
);

alter table public.webpush_subscriptions enable row level security;

-- Replace IF NOT EXISTS with DROP + CREATE for policies
DROP POLICY IF EXISTS "webpush_select_own" ON public.webpush_subscriptions;
CREATE POLICY "webpush_select_own" ON public.webpush_subscriptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "webpush_insert_own" ON public.webpush_subscriptions;
CREATE POLICY "webpush_insert_own" ON public.webpush_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Notify user on saved_search_matches insert
create or replace function public.on_saved_search_match_notify()
returns trigger language plpgsql security definer as $$
declare s saved_searches; p properties;
begin
  select * into s from public.saved_searches where id = new.saved_search_id;
  select * into p from public.properties where id = new.property_id;
  perform public.create_notification(s.user_id, 'Новый объект по поиску', coalesce(p.title,'Объект'), jsonb_build_object('property_id', p.id, 'saved_search_id', s.id));
  return new;
end; $$;

drop trigger if exists trg_saved_search_match_notify on public.saved_search_matches;
create trigger trg_saved_search_match_notify
  after insert on public.saved_search_matches
  for each row execute procedure public.on_saved_search_match_notify(); 
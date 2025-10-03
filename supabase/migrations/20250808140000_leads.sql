-- Лиды риелтора (канбан по диалогам)
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  realtor_id uuid not null references public.profiles(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  status text not null default 'new', -- new|in_progress|won|lost
  sla_hours int not null default 24,
  last_response_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_leads_realtor on public.leads(realtor_id, status);

alter table public.leads enable row level security;

drop policy if exists "leads_realtor" on public.leads;
create policy "leads_realtor" on public.leads
  for all to authenticated
  using (realtor_id = auth.uid())
  with check (realtor_id = auth.uid());

create or replace function public.set_updated_at_leads()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
create trigger trg_leads_upd before update on public.leads for each row execute function public.set_updated_at_leads(); 
-- Create storage bucket for chat attachments
insert into storage.buckets (id, name, public) values ('chat-attachments','chat-attachments', false)
on conflict (id) do nothing;

-- Helper: check if current user participates in conversation
create or replace function public.is_conversation_participant(cid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from conversations c
    where c.id = cid
      and (c.buyer_id = auth.uid() or c.realtor_id = auth.uid())
  );
$$;

-- Policies for storage.objects in chat-attachments bucket
-- Read objects if user is participant of conversation in first path segment
drop policy if exists "chat_attachments_read" on storage.objects;
create policy "chat_attachments_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'chat-attachments'
    and (
      case when position('/' in name) > 0
           then public.is_conversation_participant((split_part(name, '/', 1))::uuid)
           else false end
    )
  );

-- Upload/insert objects
drop policy if exists "chat_attachments_insert" on storage.objects;
create policy "chat_attachments_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'chat-attachments'
    and (
      case when position('/' in name) > 0
           then public.is_conversation_participant((split_part(name, '/', 1))::uuid)
           else false end
    )
  );

-- Update/delete own conversation files (optional)
drop policy if exists "chat_attachments_update" on storage.objects;
create policy "chat_attachments_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'chat-attachments'
    and (
      case when position('/' in name) > 0
           then public.is_conversation_participant((split_part(name, '/', 1))::uuid)
           else false end
    )
  )
  with check (
    bucket_id = 'chat-attachments'
    and (
      case when position('/' in name) > 0
           then public.is_conversation_participant((split_part(name, '/', 1))::uuid)
           else false end
    )
  );

-- Extend messages with attachment fields
alter table if exists public.messages
  add column if not exists attachment_url text,
  add column if not exists attachment_name text,
  add column if not exists attachment_type text,
  add column if not exists attachment_size integer;

-- Message read receipts
create table if not exists public.message_receipts (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(message_id, user_id)
);

alter table public.message_receipts enable row level security;

-- Policies: participants can read receipts for messages из своих диалогов
create or replace function public.is_message_in_user_conversation(mid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from messages m
    join conversations c on c.id = m.conversation_id
    where m.id = mid and (c.buyer_id = auth.uid() or c.realtor_id = auth.uid())
  );
$$;

drop policy if exists "receipts_read" on public.message_receipts;
create policy "receipts_read" on public.message_receipts
  for select to authenticated
  using (public.is_message_in_user_conversation(message_id));

drop policy if exists "receipts_insert" on public.message_receipts;
create policy "receipts_insert" on public.message_receipts
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_message_in_user_conversation(message_id)
  );

-- Optional: cleanup duplicates via upsert trigger (not required due to unique) 
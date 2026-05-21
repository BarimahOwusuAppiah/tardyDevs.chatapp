/**
 * Full Supabase Database Schema for tardyDevs Chat
 * Run this via the Supabase SQL Editor or the management API.
 *
 * Contains:
 *   profiles          — synced 1-1 with auth.users via trigger
 *   channels          — public chat rooms
 *   messages          — channel-scoped messages
 *   conversations     — DM conversation metadata
 *   dm_messages       — direct message payloads
 *   conversations_read_by — per-user read receipts in DMs
 *
 * Also fixes the FK bug in the project README where
 *   messages.channel_id → profiles  (wrong)
 * should be
 *   messages.channel_id → channels  (correct)
 */

-- ── profiles (extends auth.users) ───────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique,
  email       text,
  avatar_url  text,
  role        text default 'user' not null,
  created_at  timestamptz default timezone('utc'::text, now()) not null
);

-- Auto-create a profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql as $$
begin
  insert into public.profiles (id, username, email)
  values (new.id, new.raw_user_meta_data->>'username', new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill any existing users without a profile
insert into public.profiles (id, email, username)
select id, email, coalesce(raw_user_meta_data->>'username', email, 'user' || id)
from auth.users
where id not in (select id from public.profiles)
on conflict do nothing;

-- Update any existing profiles that have NULL usernames
update public.profiles
set username = coalesce(email, 'user' || id)
where username is null;


-- ── channels ────────────────────────────────────────────────────────────────
create table if not exists public.channels (
  id          uuid default uuid_generate_v4() primary key,
  name        text not null,
  created_at  timestamptz default timezone('utc'::text, now()) not null
);

-- Seed default channels (safe to run again)
insert into public.channels (name) values
  ('general'), ('random'), ('announcements'), ('dev-updates')
on conflict do nothing;
insert into public.channels (name) values ('help')
on conflict (name) do nothing;

create index if not exists idx_channels_name on public.channels(name);


-- ── messages ────────────────────────────────────────────────────────────────
create table if not exists public.messages (
  id          uuid default uuid_generate_v4() primary key,
  content     text not null,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  channel_id  uuid references public.channels(id) on delete cascade not null,
  created_at  timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists idx_messages_channel   on public.messages(channel_id, created_at asc);
create index if not exists idx_messages_created   on public.messages(created_at);


-- ── conversations (DM metadata) ─────────────────────────────────────────────
create table if not exists public.conversations (
  id              uuid default uuid_generate_v4() primary key,
  participants    uuid[] not null,          -- sorted array of profile IDs
  last_message_at timestamptz default timezone('utc'::text, now()) not null,
  created_at      timestamptz default timezone('utc'::text, now()) not null
);

-- Enforce exactly 2 unique participants per DM conversation
create unique index if not exists idx_conversations_participants
  on public.conversations using gin (participants);


-- ── dm_messages ─────────────────────────────────────────────────────────────
create table if not exists public.dm_messages (
  id             uuid default uuid_generate_v4() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id      uuid references public.profiles(id) on delete cascade not null,
  content        text not null,
  created_at     timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists idx_dm_messages_conv_time
  on public.dm_messages(conversation_id, created_at asc);
create index if not exists idx_dm_messages_sender
  on public.dm_messages(sender_id);


-- ── conversations_read_by (realtime read receipts) ──────────────────────────
create table if not exists public.conversations_read_by (
  id              uuid default uuid_generate_v4() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  user_id         uuid references public.profiles(id) on delete cascade not null,
  last_read_id    uuid references public.dm_messages(id) on delete set null,
  updated_at      timestamptz default timezone('utc'::text, now()) not null,
  unique(conversation_id, user_id)
);

create index if not exists idx_read_by_conv
  on public.conversations_read_by(conversation_id);


-- ==========================================================================
--  ROW-LEVEL SECURITY POLICIES
-- ==========================================================================

alter table public.profiles          enable row level security;
alter table public.channels          enable row level security;
alter table public.messages          enable row level security;
alter table public.conversations     enable row level security;
alter table public.dm_messages       enable row level security;
alter table public.conversations_read_by enable row level security;


-- profiles: anyone authenticated can read all profiles; users can edit their own
create policy if not exists "Profiles readable by all"
  on public.profiles for select using (auth.role() = 'authenticated');

create policy if not exists "Users insert own profile on signup"
  on public.profiles for insert with check (auth.uid() = id);

create policy if not exists "Users update own profile"
  on public.profiles for update using (auth.uid() = id);


-- channels: readable by all authenticated users; only super-admins can create/edit
create policy if not exists "Channels readable by all"
  on public.channels for select using (auth.role() = 'authenticated');

create policy if not exists "Anyone can create a channel"
  on public.channels for insert with check (auth.role() = 'authenticated');


-- messages: anyone authenticated can read channel messages; authenticated users can insert
create policy if not exists "Channel messages readable by all"
  on public.messages for select using (auth.role() = 'authenticated');

create policy if not exists "Authenticated users can send channel messages"
  on public.messages for insert with check (auth.uid() = user_id);

create policy if not exists "Users can delete own channel messages"
  on public.messages for delete using (auth.uid() = user_id);


-- conversations: only members of a conversation can view it
create policy if not exists "DM conversation viewable by participants"
  on public.conversations for select using (
    auth.uid() = any (participants)
  );

create policy if not exists "Authenticated users can create conversations"
  on public.conversations for insert with check (
    auth.role() = 'authenticated' and auth.uid() = any (participants)
  );


-- dm_messages: only conversation participants can read/send/delete
create policy if not exists "DM messages readable by participants"
  on public.dm_messages for select using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and auth.uid() = any (c.participants)
    )
  );

create policy if not exists "Participants can send DM messages"
  on public.dm_messages for insert with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and auth.uid() = any (c.participants)
    )
  );

create policy if not exists "Users can delete own DM messages"
  on public.dm_messages for delete using (auth.uid() = sender_id);


-- conversations_read_by: participants can manage their own receipts
create policy if not exists "Read receipts updatable by participant"
  on public.conversations_read_by for all using (
    auth.uid() = user_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and auth.uid() = any (c.participants)
    )
  );


-- ==========================================================================
--  REAL-TIME PUBLICATION
-- ==========================================================================

-- New channel messages broadcast on the messages channel
alter publication if exists supabase_realtime add table public.messages;

-- New DM messages broadcast on the dm_messages channel
alter publication if exists supabase_realtime add table public.dm_messages;

-- Conversations list updates
alter publication if exists supabase_realtime add table public.conversations;

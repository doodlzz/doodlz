-- Run once in Supabase: SQL Editor → New query → paste → Run.
-- The game server connects with the service-role key (server only). Row Level Security is switched on
-- with no policies, so the public/anon key can't read or write any of this.

create table if not exists accounts (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists sessions (
  token text primary key,
  account_id text not null,
  created_at bigint not null
);
create index if not exists sessions_account_idx on sessions (account_id);

create table if not exists account_images (
  account_id text primary key,
  ext text not null,
  data text not null -- base64 picture, at most 200 KB before encoding
);

alter table accounts enable row level security;
alter table sessions enable row level security;
alter table account_images enable row level security;
  
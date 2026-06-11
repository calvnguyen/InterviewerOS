create extension if not exists "uuid-ossp";

create table if not exists applications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  company text not null,
  role text not null,
  stage text not null default 'applied' check (stage in ('applied','phone_screen','interview','offer','rejected')),
  date_applied date not null default current_date,
  notes text,
  gmail_message_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists applications_user_id_idx on applications(user_id);
create unique index if not exists applications_gmail_msg_idx on applications(user_id, gmail_message_id) where gmail_message_id is not null;

create table if not exists user_meta (
  user_id uuid primary key,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

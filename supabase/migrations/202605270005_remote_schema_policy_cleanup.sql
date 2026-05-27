begin;

alter table public.users
  add column if not exists updated_at timestamptz not null default now();

alter table public.events
  add column if not exists updated_at timestamptz not null default now();

alter table public.bookings
  add column if not exists updated_at timestamptz not null default now();

alter table public.events
  alter column status set default 'published',
  alter column latitude type double precision using latitude::double precision,
  alter column longitude type double precision using longitude::double precision;

alter table public.personal_profiles
  alter column trust_score type integer using round(coalesce(trust_score, 0))::integer,
  alter column trust_score set default 0;

alter table public.business_profiles
  alter column trust_score set default 0;

alter table public.event_tags
  drop constraint if exists event_tags_event_id_tag_id_key,
  drop constraint if exists event_tags_event_id_tag_id_unique;

do $$
declare
  v_pk_columns text[];
begin
  select array_agg(a.attname order by cols.ordinality)
    into v_pk_columns
  from pg_constraint c
  join unnest(c.conkey) with ordinality as cols(attnum, ordinality)
    on true
  join pg_attribute a
    on a.attrelid = c.conrelid
   and a.attnum = cols.attnum
  where c.conrelid = 'public.event_tags'::regclass
    and c.contype = 'p';

  if v_pk_columns is distinct from array['event_id', 'tag_id'] then
    alter table public.event_tags drop constraint if exists event_tags_pkey;
    alter table public.event_tags add constraint event_tags_pkey primary key (event_id, tag_id);
  end if;
end
$$;

alter table public.event_tags
  drop column if exists event_tag_id;

drop policy if exists "Anyone can insert user row" on public.users;
drop policy if exists "Anyone can insert personal profile" on public.personal_profiles;
drop policy if exists "Anyone can insert business profile" on public.business_profiles;

drop policy if exists "Authenticated users can read event chats" on public.event_chats;
drop policy if exists "authenticated users can view event chats" on public.event_chats;

drop policy if exists "Authenticated users can read chat messages" on public.chat_messages;
drop policy if exists "authenticated users can view chat messages" on public.chat_messages;
drop policy if exists "authenticated users can insert chat messages" on public.chat_messages;

drop policy if exists "authenticated users can upload event images" on storage.objects;
drop policy if exists "authenticated users can view event images" on storage.objects;

commit;

begin;

-- Older remote schemas may still have this trigger. It inserts into
-- event_chats without conflict handling and races the idempotent trigger below.
drop trigger if exists trg_create_event_chat on public.events;

create or replace function public.create_event_chat_for_new_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.event_chats (event_id)
  values (new.event_id)
  on conflict (event_id) do nothing;

  return new;
end;
$$;

create or replace function public.ensure_event_chat()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.event_chats (event_id)
  values (new.event_id)
  on conflict (event_id) do nothing;

  return new;
end;
$$;

drop trigger if exists events_ensure_event_chat on public.events;
create trigger events_ensure_event_chat
after insert on public.events
for each row execute function public.ensure_event_chat();

commit;

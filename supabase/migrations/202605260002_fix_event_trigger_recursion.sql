begin;

-- The event trigger must not update public.events, otherwise INSERT/UPDATE on
-- events recursively fires the same trigger until Postgres hits max_stack_depth.
-- Event rating rollups are handled by reviews_refresh_rollups instead.
create or replace function public.handle_event_trust_refresh()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.refresh_user_trust_score(new.organizer_user_id);
  end if;

  if tg_op in ('UPDATE', 'DELETE') then
    perform public.refresh_user_trust_score(old.organizer_user_id);
  end if;

  return coalesce(new, old);
end;
$$;

commit;

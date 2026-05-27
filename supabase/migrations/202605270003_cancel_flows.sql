begin;

create or replace function public.cancel_own_booking(p_event_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.bookings
    set booking_status = 'cancelled'
  where event_id = p_event_id
    and user_id = auth.uid()
    and booking_status in ('pending', 'confirmed');

  get diagnostics v_updated_count = row_count;

  if v_updated_count = 0 then
    raise exception 'Booking not found';
  end if;
end;
$$;

create or replace function public.cancel_own_event(p_event_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.events
    set status = 'cancelled'
  where event_id = p_event_id
    and organizer_user_id = auth.uid()
    and status <> 'cancelled';

  get diagnostics v_updated_count = row_count;

  if v_updated_count = 0 then
    raise exception 'Event not found';
  end if;

  update public.bookings
    set booking_status = 'cancelled'
  where event_id = p_event_id
    and booking_status in ('pending', 'confirmed');
end;
$$;

grant execute on function public.cancel_own_booking(bigint) to authenticated;
grant execute on function public.cancel_own_event(bigint) to authenticated;

commit;

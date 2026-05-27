begin;

create or replace function public.can_access_booking(p_booking_id bigint, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.bookings b
    join public.events e on e.event_id = b.event_id
    where b.booking_id = p_booking_id
      and (b.user_id = p_user_id or e.organizer_user_id = p_user_id)
  );
$$;

grant execute on function public.can_access_booking(bigint, uuid) to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'payments_booking_id_fkey'
      and conrelid = 'public.payments'::regclass
  ) then
    alter table public.payments
      add constraint payments_booking_id_fkey
      foreign key (booking_id)
      references public.bookings (booking_id)
      on delete cascade
      not valid;
  end if;
end
$$;

alter table public.bookings enable row level security;
alter table public.payments enable row level security;

drop policy if exists bookings_select_authenticated on public.bookings;
create policy bookings_select_authenticated
  on public.bookings for select
  to authenticated
  using (true);

drop policy if exists payments_select_related_booking on public.payments;
create policy payments_select_related_booking
  on public.payments for select
  to authenticated
  using (public.can_access_booking(booking_id, auth.uid()));

drop policy if exists payments_insert_related_booking on public.payments;
create policy payments_insert_related_booking
  on public.payments for insert
  to authenticated
  with check (public.can_access_booking(booking_id, auth.uid()));

drop policy if exists payments_update_related_booking on public.payments;
create policy payments_update_related_booking
  on public.payments for update
  to authenticated
  using (public.can_access_booking(booking_id, auth.uid()))
  with check (public.can_access_booking(booking_id, auth.uid()));

commit;

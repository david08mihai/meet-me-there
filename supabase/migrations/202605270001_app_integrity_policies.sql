begin;

alter table public.reviews
  add column if not exists booking_id bigint;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reviews_booking_id_fkey'
      and conrelid = 'public.reviews'::regclass
  ) then
    alter table public.reviews
      add constraint reviews_booking_id_fkey
      foreign key (booking_id)
      references public.bookings (booking_id)
      on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'reviews_booking_id_key'
      and conrelid = 'public.reviews'::regclass
  ) then
    alter table public.reviews
      add constraint reviews_booking_id_key unique (booking_id);
  end if;
end
$$;

create index if not exists reviews_booking_idx
  on public.reviews (booking_id);

alter table public.event_chats enable row level security;
alter table public.chat_messages enable row level security;
alter table public.message_reports enable row level security;
alter table public.payments enable row level security;
alter table public.reviews enable row level security;

drop policy if exists event_chats_select_member on public.event_chats;
create policy event_chats_select_member
  on public.event_chats for select
  to authenticated
  using (
    exists (
      select 1
      from public.events e
      where e.event_id = event_chats.event_id
        and (
          e.organizer_user_id = auth.uid()
          or exists (
            select 1
            from public.bookings b
            where b.event_id = e.event_id
              and b.user_id = auth.uid()
              and b.booking_status in ('pending', 'confirmed')
          )
        )
    )
  );

drop policy if exists event_chats_insert_member on public.event_chats;
create policy event_chats_insert_member
  on public.event_chats for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.events e
      where e.event_id = event_chats.event_id
        and (
          e.organizer_user_id = auth.uid()
          or exists (
            select 1
            from public.bookings b
            where b.event_id = e.event_id
              and b.user_id = auth.uid()
              and b.booking_status in ('pending', 'confirmed')
          )
        )
    )
  );

drop policy if exists chat_messages_select_chat_member on public.chat_messages;
create policy chat_messages_select_chat_member
  on public.chat_messages for select
  to authenticated
  using (
    exists (
      select 1
      from public.event_chats c
      join public.events e on e.event_id = c.event_id
      where c.chat_id = chat_messages.chat_id
        and (
          e.organizer_user_id = auth.uid()
          or exists (
            select 1
            from public.bookings b
            where b.event_id = e.event_id
              and b.user_id = auth.uid()
              and b.booking_status in ('pending', 'confirmed')
          )
        )
    )
  );

drop policy if exists chat_messages_insert_chat_member on public.chat_messages;
create policy chat_messages_insert_chat_member
  on public.chat_messages for insert
  to authenticated
  with check (
    sender_user_id = auth.uid()
    and exists (
      select 1
      from public.event_chats c
      join public.events e on e.event_id = c.event_id
      where c.chat_id = chat_messages.chat_id
        and (
          e.organizer_user_id = auth.uid()
          or exists (
            select 1
            from public.bookings b
            where b.event_id = e.event_id
              and b.user_id = auth.uid()
              and b.booking_status in ('pending', 'confirmed')
          )
        )
    )
  );

drop policy if exists chat_messages_update_own on public.chat_messages;
create policy chat_messages_update_own
  on public.chat_messages for update
  to authenticated
  using (sender_user_id = auth.uid())
  with check (sender_user_id = auth.uid());

drop policy if exists message_reports_select_own on public.message_reports;
create policy message_reports_select_own
  on public.message_reports for select
  to authenticated
  using (reporter_user_id = auth.uid());

drop policy if exists message_reports_insert_visible_message on public.message_reports;
create policy message_reports_insert_visible_message
  on public.message_reports for insert
  to authenticated
  with check (
    reporter_user_id = auth.uid()
    and exists (
      select 1
      from public.chat_messages m
      join public.event_chats c on c.chat_id = m.chat_id
      join public.events e on e.event_id = c.event_id
      where m.message_id = message_reports.message_id
        and (
          e.organizer_user_id = auth.uid()
          or exists (
            select 1
            from public.bookings b
            where b.event_id = e.event_id
              and b.user_id = auth.uid()
              and b.booking_status in ('pending', 'confirmed')
          )
        )
    )
  );

drop policy if exists payments_select_related_booking on public.payments;
create policy payments_select_related_booking
  on public.payments for select
  to authenticated
  using (
    exists (
      select 1
      from public.bookings b
      join public.events e on e.event_id = b.event_id
      where b.booking_id = payments.booking_id
        and (b.user_id = auth.uid() or e.organizer_user_id = auth.uid())
    )
  );

drop policy if exists payments_insert_related_booking on public.payments;
create policy payments_insert_related_booking
  on public.payments for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.bookings b
      join public.events e on e.event_id = b.event_id
      where b.booking_id = payments.booking_id
        and (b.user_id = auth.uid() or e.organizer_user_id = auth.uid())
    )
  );

drop policy if exists payments_update_related_booking on public.payments;
create policy payments_update_related_booking
  on public.payments for update
  to authenticated
  using (
    exists (
      select 1
      from public.bookings b
      join public.events e on e.event_id = b.event_id
      where b.booking_id = payments.booking_id
        and (b.user_id = auth.uid() or e.organizer_user_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.bookings b
      join public.events e on e.event_id = b.event_id
      where b.booking_id = payments.booking_id
        and (b.user_id = auth.uid() or e.organizer_user_id = auth.uid())
    )
  );

drop policy if exists reviews_select_authenticated on public.reviews;
create policy reviews_select_authenticated
  on public.reviews for select
  to authenticated
  using (true);

drop policy if exists reviews_insert_own on public.reviews;
create policy reviews_insert_own
  on public.reviews for insert
  to authenticated
  with check (
    reviewer_user_id = auth.uid()
    and (target_user_id is null or target_user_id <> auth.uid())
    and exists (
      select 1
      from public.bookings b
      where b.booking_id = reviews.booking_id
        and b.event_id = reviews.event_id
        and b.user_id = auth.uid()
        and b.booking_status = 'confirmed'
    )
  );

drop policy if exists reviews_update_own on public.reviews;
create policy reviews_update_own
  on public.reviews for update
  to authenticated
  using (reviewer_user_id = auth.uid())
  with check (
    reviewer_user_id = auth.uid()
    and (target_user_id is null or target_user_id <> auth.uid())
    and exists (
      select 1
      from public.bookings b
      where b.booking_id = reviews.booking_id
        and b.event_id = reviews.event_id
        and b.user_id = auth.uid()
        and b.booking_status = 'confirmed'
    )
  );

drop policy if exists reviews_delete_own on public.reviews;
create policy reviews_delete_own
  on public.reviews for delete
  to authenticated
  using (reviewer_user_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-images',
  'event-images',
  true,
  5242880,
  array['image/jpeg', 'image/png']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists event_images_select_public on storage.objects;
create policy event_images_select_public
  on storage.objects for select
  to public
  using (bucket_id = 'event-images');

drop policy if exists event_images_insert_own_folder on storage.objects;
create policy event_images_insert_own_folder
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'event-images'
    and (storage.foldername(name))[1] = 'covers'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists event_images_update_own_folder on storage.objects;
create policy event_images_update_own_folder
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'event-images'
    and (storage.foldername(name))[1] = 'covers'
    and (storage.foldername(name))[2] = auth.uid()::text
  )
  with check (
    bucket_id = 'event-images'
    and (storage.foldername(name))[1] = 'covers'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists event_images_delete_own_folder on storage.objects;
create policy event_images_delete_own_folder
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'event-images'
    and (storage.foldername(name))[1] = 'covers'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

commit;

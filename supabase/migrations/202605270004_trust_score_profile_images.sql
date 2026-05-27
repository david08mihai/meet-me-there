begin;

alter table public.personal_profiles
  add column if not exists updated_at timestamptz not null default now();

alter table public.business_profiles
  add column if not exists updated_at timestamptz not null default now();

alter table public.personal_profiles
  alter column trust_score set default 0;

alter table public.business_profiles
  alter column trust_score set default 0;

update public.personal_profiles
set trust_score = 0;

update public.business_profiles
set trust_score = 0;

create or replace function public.calculate_user_trust_score(p_user_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_avg_stars numeric := 3;
  v_review_count integer := 0;
  v_attended_count integer := 0;
  v_hosted_count integer := 0;
  v_report_count integer := 0;
  v_review_component numeric := 0;
  v_score numeric := 0;
begin
  if p_user_id is null then
    return 0;
  end if;

  select coalesce(avg(stars), 3), count(*)
    into v_avg_stars, v_review_count
  from public.reviews
  where target_user_id = p_user_id;

  select count(*)
    into v_attended_count
  from public.bookings b
  join public.events e on e.event_id = b.event_id
  where b.user_id = p_user_id
    and b.booking_status = 'confirmed'
    and e.end_datetime < now();

  select count(*)
    into v_hosted_count
  from public.events e
  where e.organizer_user_id = p_user_id
    and e.end_datetime < now()
    and coalesce(e.status, 'published') <> 'cancelled';

  select count(*)
    into v_report_count
  from public.message_reports mr
  join public.chat_messages cm on cm.message_id = mr.message_id
  where cm.sender_user_id = p_user_id
    and mr.status in ('pending', 'confirmed', 'resolved');

  v_review_component := ((v_avg_stars - 3) * 10) + least(10, v_review_count * 2);
  v_score :=
    least(35, greatest(0, v_review_component))
    + least(25, v_attended_count * 2)
    + least(25, v_hosted_count * 3)
    - least(20, v_report_count * 4);

  return greatest(0, least(100, round(v_score)))::integer;
end;
$$;

grant execute on function public.calculate_user_trust_score(uuid) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-images',
  'profile-images',
  true,
  5242880,
  array['image/jpeg', 'image/png']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists profile_images_select_public on storage.objects;
create policy profile_images_select_public
  on storage.objects for select
  to public
  using (bucket_id = 'profile-images');

drop policy if exists profile_images_insert_own_folder on storage.objects;
create policy profile_images_insert_own_folder
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'profile-images'
    and (storage.foldername(name))[1] = 'profiles'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists profile_images_update_own_folder on storage.objects;
create policy profile_images_update_own_folder
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'profile-images'
    and (storage.foldername(name))[1] = 'profiles'
    and (storage.foldername(name))[2] = auth.uid()::text
  )
  with check (
    bucket_id = 'profile-images'
    and (storage.foldername(name))[1] = 'profiles'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists profile_images_delete_own_folder on storage.objects;
create policy profile_images_delete_own_folder
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'profile-images'
    and (storage.foldername(name))[1] = 'profiles'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

commit;

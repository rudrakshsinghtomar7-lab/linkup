-- Applied 2026-09-13 via Supabase MCP apply_migration.
-- Photos can belong to a trip OR a plan (one album per trip/plan). Storage paths stay
-- "<album id>/<file>"; the policies accept either a trip id or a plan id as the prefix.
alter table public.trip_photos alter column trip_id drop not null;
alter table public.trip_photos add column if not exists plan_id uuid references public.plans(id) on delete cascade;
alter table public.trip_photos drop constraint if exists trip_photos_album_check;
alter table public.trip_photos add constraint trip_photos_album_check
  check ((trip_id is not null and plan_id is null) or (trip_id is null and plan_id is not null));
create index if not exists trip_photos_plan_id_idx on public.trip_photos(plan_id);

drop policy if exists "photos by member" on public.trip_photos;
create policy "photos by member" on public.trip_photos for all
  using (
    (trip_id is not null and exists (select 1 from trips t where t.id = trip_photos.trip_id and is_crew_member(t.crew_id)))
    or (plan_id is not null and exists (select 1 from plans p where p.id = trip_photos.plan_id and is_crew_member(p.crew_id)))
  )
  with check (
    (trip_id is not null and exists (select 1 from trips t where t.id = trip_photos.trip_id and is_crew_member(t.crew_id)))
    or (plan_id is not null and exists (select 1 from plans p where p.id = trip_photos.plan_id and is_crew_member(p.crew_id)))
  );

drop policy if exists "read trip photos" on storage.objects;
create policy "read trip photos" on storage.objects for select
  using (bucket_id = 'trip-photos' and (
    exists (select 1 from trips t where t.id::text = split_part(objects.name, '/', 1) and is_crew_member(t.crew_id))
    or exists (select 1 from plans p where p.id::text = split_part(objects.name, '/', 1) and is_crew_member(p.crew_id))
  ));
drop policy if exists "upload trip photos" on storage.objects;
create policy "upload trip photos" on storage.objects for insert
  with check (bucket_id = 'trip-photos' and (
    exists (select 1 from trips t where t.id::text = split_part(objects.name, '/', 1) and is_crew_member(t.crew_id))
    or exists (select 1 from plans p where p.id::text = split_part(objects.name, '/', 1) and is_crew_member(p.crew_id))
  ));

alter table public.guests
  add column
if not exists profile_photo_bucket text null default 'guest-photos',
add column
if not exists profile_photo_path text null,
add column
if not exists profile_photo_mime_type text null,
add column
if not exists profile_photo_updated_at timestamptz null;

do $$
begin
    if not exists (
    select 1
    from pg_constraint
    where conname = 'guests_profile_photo_bucket_check'
  ) then
    alter table public.guests
      add constraint guests_profile_photo_bucket_check
      check (
        profile_photo_bucket is null
        or profile_photo_bucket = 'guest-photos'
      );
end
if;

  if not exists (
    select 1
from pg_constraint
where conname = 'guests_profile_photo_mime_type_check'
  ) then
alter table public.guests
      add constraint guests_profile_photo_mime_type_check
      check (
        profile_photo_mime_type is null
        or profile_photo_mime_type in (
          'image/jpeg',
          'image/png',
          'image/webp'
        )
      );
end
if;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'guest-photos',
  'guest-photos',
  false,
  4194304,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

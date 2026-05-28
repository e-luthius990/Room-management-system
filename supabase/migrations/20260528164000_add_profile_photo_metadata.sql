alter table public.profiles
  add column if not exists profile_photo_bucket text,
  add column if not exists profile_photo_path text,
  add column if not exists profile_photo_mime_type text,
  add column if not exists profile_photo_updated_at timestamptz;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-photos',
  'profile-photos',
  false,
  4194304,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

comment on column public.profiles.profile_photo_bucket is
  'Private storage bucket containing the user profile photo.';
comment on column public.profiles.profile_photo_path is
  'Private storage path for the user profile photo.';
comment on column public.profiles.profile_photo_mime_type is
  'MIME type of the uploaded user profile photo.';
comment on column public.profiles.profile_photo_updated_at is
  'Timestamp used to invalidate cached user profile photo URLs.';

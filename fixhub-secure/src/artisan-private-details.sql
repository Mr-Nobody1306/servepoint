-- Run after the Supabase schema that creates public.profiles.
-- Contact numbers are kept separate from the artisan directory, whose profiles
-- are readable by authenticated users.
create table if not exists public.artisan_private_details (
  artisan_id uuid primary key references public.profiles(id) on delete cascade,
  phone text not null check (char_length(btrim(phone)) between 9 and 24),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.artisan_private_details enable row level security;
revoke all on public.artisan_private_details from anon, authenticated;
grant select, insert, update on public.artisan_private_details to authenticated;

drop policy if exists artisan_private_details_own_select on public.artisan_private_details;
create policy artisan_private_details_own_select
  on public.artisan_private_details for select to authenticated
  using (artisan_id = auth.uid());

drop policy if exists artisan_private_details_own_insert on public.artisan_private_details;
create policy artisan_private_details_own_insert
  on public.artisan_private_details for insert to authenticated
  with check (artisan_id = auth.uid());

drop policy if exists artisan_private_details_own_update on public.artisan_private_details;
create policy artisan_private_details_own_update
  on public.artisan_private_details for update to authenticated
  using (artisan_id = auth.uid())
  with check (artisan_id = auth.uid());

-- Migrate existing artisan contact numbers from Supabase Auth metadata.
insert into public.artisan_private_details (artisan_id, phone)
select p.id, btrim(u.raw_user_meta_data->>'artisan_phone')
from public.profiles p
join auth.users u on u.id = p.id
where p.role = 'artisan'
  and jsonb_typeof(u.raw_user_meta_data->'artisan_phone') = 'string'
  and char_length(btrim(u.raw_user_meta_data->>'artisan_phone')) between 9 and 24
on conflict (artisan_id) do nothing;

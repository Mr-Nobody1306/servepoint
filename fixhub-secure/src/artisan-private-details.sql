-- Run after the main schema creates public.profiles, public.bookings, and
-- public.applications.
-- Contact numbers are kept separate from the artisan directory, whose profiles
-- are readable by authenticated users.
create table if not exists public.artisan_private_details (
  artisan_id uuid primary key references public.profiles(id) on delete cascade,
  phone text not null check (char_length(btrim(phone)) between 9 and 24),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.artisan_private_details
    add constraint artisan_private_details_phone_format_check
    check (btrim(phone) ~ '^\+?[0-9[:space:]()-]{7,24}$');
exception when duplicate_object then null;
end $$;

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

drop policy if exists artisan_private_details_accepted_customer_select on public.artisan_private_details;
create policy artisan_private_details_accepted_customer_select
  on public.artisan_private_details for select to authenticated
  using (
    exists (
      select 1
      from public.applications a
      join public.bookings b on b.id = a.booking_id
      where a.artisan_id = artisan_private_details.artisan_id
        and a.status = 'accepted'
        and b.customer_id = auth.uid()
    )
  );

-- Keep the booking amounts and Paystack reference available for receipts.
alter table public.bookings
  add column if not exists service_amount numeric(10,2) null check (service_amount is null or service_amount >= 0),
  add column if not exists transport_amount numeric(10,2) null check (transport_amount is null or transport_amount >= 0),
  add column if not exists discount_amount numeric(10,2) null check (discount_amount is null or discount_amount >= 0),
  add column if not exists payment_reference text null check (payment_reference is null or char_length(payment_reference) <= 120);

-- Migrate existing artisan contact numbers from Supabase Auth metadata.
insert into public.artisan_private_details (artisan_id, phone)
select p.id, btrim(u.raw_user_meta_data->>'artisan_phone')
from public.profiles p
join auth.users u on u.id = p.id
where p.role = 'artisan'
  and jsonb_typeof(u.raw_user_meta_data->'artisan_phone') = 'string'
  and char_length(btrim(u.raw_user_meta_data->>'artisan_phone')) between 9 and 24
  and btrim(u.raw_user_meta_data->>'artisan_phone') ~ '^\+?[0-9[:space:]()-]{7,24}$'
on conflict (artisan_id) do nothing;

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

-- Only matching artisans can discover open jobs; booking owners still see
-- their own rows. This restrictive policy also narrows broader legacy policies.
alter table public.bookings add column if not exists artisan_id uuid references public.profiles(id);
with accepted as (
  select distinct on (booking_id) booking_id, artisan_id, artisan_name, rating, jobs
  from public.applications
  where status = 'accepted'
  order by booking_id, created_at asc
)
update public.bookings b
set artisan_id = a.artisan_id,
    tech = coalesce(b.tech, a.artisan_name),
    tech_rating = coalesce(b.tech_rating, a.rating),
    tech_jobs = coalesce(b.tech_jobs, a.jobs)
from accepted a
where b.id = a.booking_id and b.artisan_id is null;

create or replace function public.can_view_servepoint_booking(
  booking_customer_id uuid, booking_artisan_id uuid, booking_service text
) returns boolean
language sql stable security definer
set search_path = public, auth
as $$
  select booking_customer_id = auth.uid()
    or booking_artisan_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.role = 'admin' or (
          p.role = 'artisan'
          and lower(btrim(coalesce(p.trade, ''))) = lower(btrim(coalesce(booking_service, '')))
        ))
    );
$$;
revoke all on function public.can_view_servepoint_booking(uuid, uuid, text) from public;
grant execute on function public.can_view_servepoint_booking(uuid, uuid, text) to authenticated;
alter table public.bookings enable row level security;
drop policy if exists bookings_matching_artisan_select on public.bookings;
create policy bookings_matching_artisan_select
  on public.bookings for select to authenticated
  using (public.can_view_servepoint_booking(customer_id, artisan_id, service));
drop policy if exists bookings_skill_scoped_visibility on public.bookings;
create policy bookings_skill_scoped_visibility
  on public.bookings as restrictive for select to authenticated
  using (public.can_view_servepoint_booking(customer_id, artisan_id, service));

create unique index if not exists applications_one_accepted_per_booking
  on public.applications (booking_id) where status = 'accepted';
alter table public.applications enable row level security;
drop policy if exists applications_matching_trade_insert on public.applications;
create policy applications_matching_trade_insert
  on public.applications as restrictive for insert to authenticated
  with check (
    artisan_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      join public.bookings b on b.service = p.trade
      where p.id = auth.uid() and p.role = 'artisan'
        and p.trade = applications.trade and b.id = applications.booking_id and b.status = 'open'
    )
  );
drop policy if exists applications_customer_decision_update on public.applications;
create policy applications_customer_decision_update
  on public.applications as restrictive for update to authenticated
  using (
    status = 'pending'
    and exists (
      select 1 from public.bookings b
      where b.id = applications.booking_id and b.customer_id = auth.uid() and b.status = 'open'
    )
  )
  with check (
    status in ('accepted', 'declined')
    and exists (
      select 1 from public.bookings b
      where b.id = applications.booking_id and b.customer_id = auth.uid()
    )
  );

create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  booking_id text,
  type text not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_recipient_created_idx
  on public.notifications (recipient_id, created_at desc);
create unique index if not exists notifications_dedupe_idx
  on public.notifications (recipient_id, booking_id, type, message);
alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant all on public.notifications to service_role;
grant usage, select on sequence public.notifications_id_seq to service_role;
drop policy if exists notifications_recipient_select on public.notifications;
create policy notifications_recipient_select on public.notifications
  for select to authenticated using (recipient_id = auth.uid());
drop policy if exists notifications_recipient_read on public.notifications;
create policy notifications_recipient_read on public.notifications
  for update to authenticated using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

create or replace function public.notify_servepoint_application()
returns trigger language plpgsql security definer set search_path = public
as $$
declare customer uuid;
begin
  select customer_id into customer from public.bookings where id = new.booking_id;
  if tg_op = 'INSERT' and customer is not null then
    insert into public.notifications (recipient_id, booking_id, type, message)
    values (customer, new.booking_id, 'artisan_applied',
      coalesce(new.artisan_name, 'An artisan') || ' applied to booking ' || new.booking_id || '.');
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status
    and new.status in ('accepted', 'declined') then
    insert into public.notifications (recipient_id, booking_id, type, message)
    values (new.artisan_id, new.booking_id,
      case when new.status = 'accepted' then 'application_accepted' else 'application_declined' end,
      case when new.status = 'accepted' then 'Your application was accepted for booking '
        else 'Your application was not selected for booking ' end || new.booking_id || '.');
  end if;
  return new;
end;
$$;
drop trigger if exists servepoint_application_notifications on public.applications;
create trigger servepoint_application_notifications
  after insert or update of status on public.applications
  for each row execute function public.notify_servepoint_application();

create or replace function public.notify_servepoint_open_booking()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.status = 'open' then
    insert into public.notifications (recipient_id, booking_id, type, message)
    select p.id, new.id, 'matching_job', 'A new ' || new.service || ' request is available in ' || coalesce(new.area, 'your area') || '.'
    from public.profiles p
    where p.role = 'artisan'
      and lower(btrim(coalesce(p.trade, ''))) = lower(btrim(coalesce(new.service, '')))
      and p.id <> coalesce(new.customer_id, '00000000-0000-0000-0000-000000000000'::uuid);
  end if;
  return new;
end;
$$;
drop trigger if exists servepoint_open_booking_notifications on public.bookings;
create trigger servepoint_open_booking_notifications
  after insert on public.bookings
  for each row execute function public.notify_servepoint_open_booking();

-- Payment state and Paystack recipient codes are server-managed only.
create table if not exists public.booking_payment_state (
  booking_id text primary key references public.bookings(id) on delete cascade,
  payment_reference text not null unique,
  payment_status text not null check (payment_status in ('confirmed')),
  payout_status text not null check (payout_status in ('awaiting_completion', 'processing', 'paid', 'failed')),
  payout_reference text unique,
  updated_at timestamptz not null default now()
);
alter table public.booking_payment_state enable row level security;
revoke all on public.booking_payment_state from anon, authenticated;
grant all on public.booking_payment_state to service_role;

create table if not exists public.artisan_payout_accounts (
  artisan_id uuid primary key references public.profiles(id) on delete cascade,
  recipient_code text not null,
  updated_at timestamptz not null default now()
);
alter table public.artisan_payout_accounts enable row level security;
revoke all on public.artisan_payout_accounts from anon, authenticated;
grant all on public.artisan_payout_accounts to service_role;

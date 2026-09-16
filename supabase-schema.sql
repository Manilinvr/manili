create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  date_text text not null,
  time_text text,
  venue text,
  status text not null default 'draft' check (status in ('published','draft','archived')),
  description text,
  ticket_url text,
  poster_url text,
  poster_path text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_content (
  id integer primary key default 1 check (id = 1),
  hero_title text not null default 'МаниЛи',
  hero_subtitle text not null default 'Музыка. Люди. События.',
  hero_text text default 'Мы создаём события, на которые хочется возвращаться.',
  about_title text default 'МаниЛи — больше, чем просто события.',
  about_text text default 'Вечеринки, концерты, артисты и собственная сцена. Мы строим комьюнити вокруг музыки и атмосферы.',
  contact_email text default 'hello@manili.ru',
  telegram_url text default '',
  instagram_url text default '',
  updated_at timestamptz not null default now()
);

insert into public.site_content (id) values (1) on conflict (id) do nothing;

create or replace function public.is_manili_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists events_updated_at on public.events;
create trigger events_updated_at before update on public.events for each row execute function public.set_updated_at();

drop trigger if exists site_content_updated_at on public.site_content;
create trigger site_content_updated_at before update on public.site_content for each row execute function public.set_updated_at();

alter table public.admin_users enable row level security;
alter table public.events enable row level security;
alter table public.site_content enable row level security;

drop policy if exists "public published events" on public.events;
create policy "public published events" on public.events for select to anon, authenticated using (status = 'published');

drop policy if exists "admins read all events" on public.events;
create policy "admins read all events" on public.events for select to authenticated using (public.is_manili_admin());

drop policy if exists "admins insert events" on public.events;
create policy "admins insert events" on public.events for insert to authenticated with check (public.is_manili_admin());

drop policy if exists "admins update events" on public.events;
create policy "admins update events" on public.events for update to authenticated using (public.is_manili_admin()) with check (public.is_manili_admin());

drop policy if exists "admins delete events" on public.events;
create policy "admins delete events" on public.events for delete to authenticated using (public.is_manili_admin());

drop policy if exists "public site content" on public.site_content;
create policy "public site content" on public.site_content for select to anon, authenticated using (id = 1);

drop policy if exists "admins update site content" on public.site_content;
create policy "admins update site content" on public.site_content for update to authenticated using (public.is_manili_admin()) with check (public.is_manili_admin());

grant select on public.events to anon, authenticated;
grant insert, update, delete on public.events to authenticated;
grant select on public.site_content to anon, authenticated;
grant update on public.site_content to authenticated;
grant execute on function public.is_manili_admin() to authenticated;

-- Storage bucket for posters. If your project disallows this SQL, create a public bucket named "posters" manually in Storage.
insert into storage.buckets (id, name, public) values ('posters', 'posters', true) on conflict (id) do update set public = true;

drop policy if exists "public poster read" on storage.objects;
create policy "public poster read" on storage.objects for select to anon, authenticated using (bucket_id = 'posters');

drop policy if exists "admins poster upload" on storage.objects;
create policy "admins poster upload" on storage.objects for insert to authenticated with check (bucket_id = 'posters' and public.is_manili_admin());

drop policy if exists "admins poster update" on storage.objects;
create policy "admins poster update" on storage.objects for update to authenticated using (bucket_id = 'posters' and public.is_manili_admin()) with check (bucket_id = 'posters' and public.is_manili_admin());

drop policy if exists "admins poster delete" on storage.objects;
create policy "admins poster delete" on storage.objects for delete to authenticated using (bucket_id = 'posters' and public.is_manili_admin());

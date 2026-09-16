-- МИГРАЦИЯ (всё в одном файле): расширенный контент, соцсети, карусель/архив событий,
-- фотогалерея, свой логотип, формат афиш, фон сайта.
-- Выполни этот файл ЦЕЛИКОМ один раз в Supabase → SQL Editor. Ничего не удаляет,
-- только добавляет новые поля/таблицы/бакеты поверх текущей базы. Повторный запуск безопасен.

-- Он ничего не удаляет, только добавляет новые колонки/таблицы поверх текущей базы.

-- 1) Новые редактируемые поля сайта
alter table public.site_content
  add column if not exists hero_eyebrow text default 'МАНИЛИ EVENT / 2026',
  add column if not exists hero_button_text text default 'Смотреть события',
  add column if not exists nav_events_label text default 'События',
  add column if not exists nav_about_label text default 'О нас',
  add column if not exists nav_contacts_label text default 'Контакты',
  add column if not exists events_eyebrow text default 'БЛИЖАЙШИЕ',
  add column if not exists events_title text default 'СОБЫТИЯ',
  add column if not exists events_loading_text text default 'Загружаем события…',
  add column if not exists events_empty_text text default 'Скоро здесь появятся новые события.',
  add column if not exists events_error_text text default 'Не удалось загрузить события.',
  add column if not exists ticket_button_text text default 'Билеты',
  add column if not exists about_eyebrow text default 'МАНИФЕСТ',
  add column if not exists manifest_line text default 'СЕГОДНЯ — ВЕЧЕРИНКИ.
ЗАВТРА — КОНЦЕРТЫ.
ДАЛЬШЕ — БОЛЬШИЕ СОБЫТИЯ.',
  add column if not exists contact_eyebrow text default 'НА СВЯЗИ',
  add column if not exists contact_title text default 'ДЕЛАЕМ ГРОМЧЕ.',
  add column if not exists footer_left text default 'МАНИЛИ EVENT',
  add column if not exists footer_right text default 'МУЗЫКА. ЛЮДИ. СОБЫТИЯ.';

-- 2) Гибкая таблица соцсетей / ссылок контактов (телеграм, ватсап, вк и т.д.)
create table if not exists public.social_links (
  id uuid primary key default gen_random_uuid(),
  platform text not null default 'custom', -- ключ иконки: telegram, whatsapp, instagram, vk, tiktok, youtube, phone, custom
  label text not null default '',
  url text not null,
  sort_order integer not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists social_links_updated_at on public.social_links;
create trigger social_links_updated_at before update on public.social_links for each row execute function public.set_updated_at();

alter table public.social_links enable row level security;

drop policy if exists "public visible social links" on public.social_links;
create policy "public visible social links" on public.social_links for select to anon, authenticated using (visible = true);

drop policy if exists "admins read all social links" on public.social_links;
create policy "admins read all social links" on public.social_links for select to authenticated using (public.is_manili_admin());

drop policy if exists "admins insert social links" on public.social_links;
create policy "admins insert social links" on public.social_links for insert to authenticated with check (public.is_manili_admin());

drop policy if exists "admins update social links" on public.social_links;
create policy "admins update social links" on public.social_links for update to authenticated using (public.is_manili_admin()) with check (public.is_manili_admin());

drop policy if exists "admins delete social links" on public.social_links;
create policy "admins delete social links" on public.social_links for delete to authenticated using (public.is_manili_admin());

grant select on public.social_links to anon, authenticated;
grant insert, update, delete on public.social_links to authenticated;

-- 3) Переносим существующие telegram_url / instagram_url (если были заполнены) в новую таблицу
insert into public.social_links (platform, label, url, sort_order, visible)
select 'telegram', 'Telegram', telegram_url, 1, true
from public.site_content
where id = 1 and telegram_url is not null and telegram_url <> ''
  and not exists (select 1 from public.social_links where platform = 'telegram');

insert into public.social_links (platform, label, url, sort_order, visible)
select 'instagram', 'Instagram', instagram_url, 2, true
from public.site_content
where id = 1 and instagram_url is not null and instagram_url <> ''
  and not exists (select 1 from public.social_links where platform = 'instagram');


-- 1) Новые тексты
alter table public.site_content
  add column if not exists events_next_label text default 'БЛИЖАЙШЕЕ',
  add column if not exists events_past_label text default 'ПРОШЛО',
  add column if not exists nav_gallery_label text default 'Фото',
  add column if not exists gallery_eyebrow text default 'ФОТООТЧЁТЫ',
  add column if not exists gallery_title text default 'ПОСЛЕ ВЕЧЕРИНКИ',
  add column if not exists gallery_empty_text text default 'Скоро добавим фото с последних событий.';

-- 2) Таблица фотогалереи
create table if not exists public.gallery_photos (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  image_path text,
  caption text default '',
  sort_order integer not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists gallery_photos_updated_at on public.gallery_photos;
create trigger gallery_photos_updated_at before update on public.gallery_photos for each row execute function public.set_updated_at();

alter table public.gallery_photos enable row level security;

drop policy if exists "public visible gallery photos" on public.gallery_photos;
create policy "public visible gallery photos" on public.gallery_photos for select to anon, authenticated using (visible = true);

drop policy if exists "admins read all gallery photos" on public.gallery_photos;
create policy "admins read all gallery photos" on public.gallery_photos for select to authenticated using (public.is_manili_admin());

drop policy if exists "admins insert gallery photos" on public.gallery_photos;
create policy "admins insert gallery photos" on public.gallery_photos for insert to authenticated with check (public.is_manili_admin());

drop policy if exists "admins update gallery photos" on public.gallery_photos;
create policy "admins update gallery photos" on public.gallery_photos for update to authenticated using (public.is_manili_admin()) with check (public.is_manili_admin());

drop policy if exists "admins delete gallery photos" on public.gallery_photos;
create policy "admins delete gallery photos" on public.gallery_photos for delete to authenticated using (public.is_manili_admin());

grant select on public.gallery_photos to anon, authenticated;
grant insert, update, delete on public.gallery_photos to authenticated;

-- 3) Бакет для фото галереи
insert into storage.buckets (id, name, public) values ('gallery', 'gallery', true) on conflict (id) do update set public = true;

drop policy if exists "public gallery read" on storage.objects;
create policy "public gallery read" on storage.objects for select to anon, authenticated using (bucket_id = 'gallery');

drop policy if exists "admins gallery upload" on storage.objects;
create policy "admins gallery upload" on storage.objects for insert to authenticated with check (bucket_id = 'gallery' and public.is_manili_admin());

drop policy if exists "admins gallery update" on storage.objects;
create policy "admins gallery update" on storage.objects for update to authenticated using (bucket_id = 'gallery' and public.is_manili_admin()) with check (bucket_id = 'gallery' and public.is_manili_admin());

drop policy if exists "admins gallery delete" on storage.objects;
create policy "admins gallery delete" on storage.objects for delete to authenticated using (bucket_id = 'gallery' and public.is_manili_admin());


alter table public.site_content
  add column if not exists logo_url text,
  add column if not exists logo_path text,
  add column if not exists poster_aspect_ratio text default 'portrait'; -- portrait | square | landscape


alter table public.site_content
  add column if not exists bg_color text default '#11100e',
  add column if not exists bg_image_url text,
  add column if not exists bg_image_path text,
  add column if not exists bg_overlay_opacity numeric default 0.6;

-- =====================================================================
-- ЧАСТЬ 6 (билеты, промо, альбомы): полноценная платформа продажи билетов
-- =====================================================================

-- 1) События: реальные дата/время (для countdown), город, статус билетов, промо-видео, слаг для персональной страницы
alter table public.events
  add column if not exists slug text,
  add column if not exists starts_at timestamptz,
  add column if not exists city text,
  add column if not exists ticket_status text not null default 'coming_soon', -- coming_soon | on_sale | almost_sold_out | sold_out | sales_closed
  add column if not exists promo_video_url text,
  add column if not exists promo_video_path text,
  add column if not exists promo_published boolean not null default false;

-- слаг обязателен и уникален только когда заполнен; заполняем пустые слаги на основе id, чтобы не сломать существующие события
update public.events set slug = id::text where slug is null or slug = '';
create unique index if not exists events_slug_key on public.events(slug);

-- 2) Категории билетов (у одного события их может быть несколько: обычный / VIP и т.д.)
create table if not exists public.ticket_categories (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null default 'Билет',
  price numeric,
  currency text not null default '₽',
  status text not null default 'on_sale', -- coming_soon | on_sale | almost_sold_out | sold_out | sales_closed
  ticket_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists ticket_categories_updated_at on public.ticket_categories;
create trigger ticket_categories_updated_at before update on public.ticket_categories for each row execute function public.set_updated_at();
alter table public.ticket_categories enable row level security;
drop policy if exists "public read ticket categories" on public.ticket_categories;
create policy "public read ticket categories" on public.ticket_categories for select to anon, authenticated using (true);
drop policy if exists "admins write ticket categories" on public.ticket_categories;
create policy "admins write ticket categories" on public.ticket_categories for all to authenticated using (public.is_manili_admin()) with check (public.is_manili_admin());
grant select on public.ticket_categories to anon, authenticated;
grant insert, update, delete on public.ticket_categories to authenticated;

-- 3) Альбомы (фото + видео вместо плоской галереи)
create table if not exists public.albums (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete set null,
  title text not null default 'Альбом',
  description text default '',
  status text not null default 'draft', -- draft | published
  cover_media_id uuid,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists albums_updated_at on public.albums;
create trigger albums_updated_at before update on public.albums for each row execute function public.set_updated_at();

create table if not exists public.album_media (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums(id) on delete cascade,
  type text not null default 'image', -- image | video
  url text not null,
  path text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'albums_cover_media_fk') then
    alter table public.albums add constraint albums_cover_media_fk foreign key (cover_media_id) references public.album_media(id) on delete set null;
  end if;
end $$;

alter table public.albums enable row level security;
alter table public.album_media enable row level security;

drop policy if exists "public read published albums" on public.albums;
create policy "public read published albums" on public.albums for select to anon, authenticated using (status = 'published');
drop policy if exists "admins read all albums" on public.albums;
create policy "admins read all albums" on public.albums for select to authenticated using (public.is_manili_admin());
drop policy if exists "admins write albums" on public.albums;
create policy "admins write albums" on public.albums for insert to authenticated with check (public.is_manili_admin());
drop policy if exists "admins update albums" on public.albums;
create policy "admins update albums" on public.albums for update to authenticated using (public.is_manili_admin()) with check (public.is_manili_admin());
drop policy if exists "admins delete albums" on public.albums;
create policy "admins delete albums" on public.albums for delete to authenticated using (public.is_manili_admin());

drop policy if exists "public read media of published albums" on public.album_media;
create policy "public read media of published albums" on public.album_media for select to anon, authenticated using (exists (select 1 from public.albums a where a.id = album_media.album_id and a.status = 'published'));
drop policy if exists "admins read all album media" on public.album_media;
create policy "admins read all album media" on public.album_media for select to authenticated using (public.is_manili_admin());
drop policy if exists "admins write album media" on public.album_media;
create policy "admins write album media" on public.album_media for insert to authenticated with check (public.is_manili_admin());
drop policy if exists "admins update album media" on public.album_media;
create policy "admins update album media" on public.album_media for update to authenticated using (public.is_manili_admin()) with check (public.is_manili_admin());
drop policy if exists "admins delete album media" on public.album_media;
create policy "admins delete album media" on public.album_media for delete to authenticated using (public.is_manili_admin());

grant select on public.albums, public.album_media to anon, authenticated;
grant insert, update, delete on public.albums, public.album_media to authenticated;

-- 4) Новые редактируемые тексты (промо-блок, статусы билетов, раздел альбомов)
alter table public.site_content
  add column if not exists promo_eyebrow text default 'БЛИЖАЙШЕЕ СОБЫТИЕ',
  add column if not exists promo_cta_text text default 'Купить билет',
  add column if not exists albums_eyebrow text default 'МЕДИА',
  add column if not exists albums_title text default 'АЛЬБОМЫ',
  add column if not exists albums_empty_text text default 'Скоро здесь появятся альбомы с прошедших событий.',
  add column if not exists countdown_days_label text default 'дн',
  add column if not exists countdown_hours_label text default 'ч',
  add column if not exists countdown_minutes_label text default 'мин',
  add column if not exists countdown_seconds_label text default 'сек';


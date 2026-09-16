-- МИГРАЦИЯ: собственная аналитика МаниЛи (без сторонних сервисов).
-- Выполни целиком один раз в Supabase → SQL Editor. Повторный запуск безопасен.
--
-- Что добавляем:
--   analytics_sessions — одна строка на посетителя за сессию (визиты, устройство,
--                         сколько страниц посмотрел, сколько активно провёл времени)
--   analytics_events    — построчный лог событий (просмотр страницы, клик по кнопке,
--                         клик по афише, клик "Купить", открытие альбома и т.д.)
--
-- Безопасность (см. ТЗ раздел 24):
--   - анонимный посетитель МОЖЕТ добавлять записи (иначе трекинг не будет работать),
--     но НЕ МОЖЕТ ничего читать и НЕ МОЖЕТ менять/удалять чужие события;
--   - читать агрегаты может только авторизованный админ (is_manili_admin());
--   - event_name ограничен белым списком через CHECK — нельзя вставить произвольную
--     техническую "мусорную" строку;
--   - metadata (jsonb) ограничена по размеру, чтобы никто не мог заливать мегабайты
--     в поле аналитики.
--
-- Осознанное ограничение: полноценная защита от спама/накрутки (rate limiting по IP,
-- капча и т.п.) требует серверной прослойки (Netlify Function) — см. AUDIT_REPORT.md.
-- Прямая запись с клиента — стандартный первый шаг, применяемый большинством
-- self-hosted аналитик; при реальных признаках накрутки данных это можно усилить
-- отдельным шагом, не меняя схему таблиц.

create table if not exists public.analytics_sessions (
  id uuid primary key default gen_random_uuid(),
  session_id text unique not null,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  ended_at timestamptz,
  landing_page text,
  referrer text,
  device_type text check (device_type in ('mobile','tablet','desktop')),
  page_views integer not null default 0,
  duration_seconds integer not null default 0
);

create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  session_id text not null,
  event_name text not null check (event_name in (
    'page_view','session_start','session_heartbeat',
    'button_click','poster_click','event_view','ticket_click',
    'album_view','share_click','download_click','social_click','outbound_click'
  )),
  page text,
  path text,
  referrer text,
  device_type text check (device_type in ('mobile','tablet','desktop')),
  viewport_width integer,
  viewport_height integer,
  event_id uuid,
  album_id uuid,
  ticket_category_id uuid,
  element_id text,
  element_label text,
  metadata jsonb,
  constraint metadata_size_limit check (metadata is null or octet_length(metadata::text) < 2000)
);

create index if not exists analytics_events_created_at_idx on public.analytics_events(created_at desc);
create index if not exists analytics_events_name_idx on public.analytics_events(event_name);
create index if not exists analytics_events_session_idx on public.analytics_events(session_id);
create index if not exists analytics_events_event_id_idx on public.analytics_events(event_id) where event_id is not null;
create index if not exists analytics_sessions_started_idx on public.analytics_sessions(started_at desc);

alter table public.analytics_sessions enable row level security;
alter table public.analytics_events enable row level security;

-- Анонимный посетитель может создать свою сессию и обновлять её (last_seen_at,
-- page_views, duration_seconds по мере визита), но не может читать чужие сессии.
drop policy if exists "anon insert own session" on public.analytics_sessions;
create policy "anon insert own session" on public.analytics_sessions
  for insert to anon, authenticated with check (true);

drop policy if exists "anon update session" on public.analytics_sessions;
create policy "anon update session" on public.analytics_sessions
  for update to anon, authenticated using (true) with check (true);

drop policy if exists "admins read sessions" on public.analytics_sessions;
create policy "admins read sessions" on public.analytics_sessions
  for select to authenticated using (public.is_manili_admin());

-- События: только добавление с клиента, никакого чтения/изменения анонимом.
drop policy if exists "anon insert events" on public.analytics_events;
create policy "anon insert events" on public.analytics_events
  for insert to anon, authenticated with check (true);

drop policy if exists "admins read events" on public.analytics_events;
create policy "admins read events" on public.analytics_events
  for select to authenticated using (public.is_manili_admin());

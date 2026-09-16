-- МИГРАЦИЯ БЕЗОПАСНОСТИ: закрываем утечку данных через public.ticket_categories.
-- Выполни этот файл ЦЕЛИКОМ один раз в Supabase → SQL Editor (после migration_all.sql).
-- Повторный запуск безопасен.
--
-- Проблема: политика "public read ticket categories" была задана как
--   for select to anon, authenticated using (true)
-- то есть ЛЮБОЙ человек мог напрямую запросить таблицу ticket_categories через
-- публичный API и увидеть цены/ссылки на билеты ЧЕРНОВЫХ (ещё не опубликованных)
-- событий, хотя сама таблица events для черновиков анониму недоступна.
-- Исправление: категория билетов видна анониму, только если её событие
-- опубликовано или в архиве — то есть согласно тем же правилам, что и event.html.

drop policy if exists "public read ticket categories" on public.ticket_categories;
create policy "public read ticket categories" on public.ticket_categories
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = ticket_categories.event_id
        and e.status in ('published','archived')
    )
  );

-- Политика для админов (полный доступ) не менялась и остаётся как в migration_all.sql:
-- "admins write ticket categories" ... using (public.is_manili_admin()) with check (public.is_manili_admin());

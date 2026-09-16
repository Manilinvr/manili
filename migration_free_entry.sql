-- МИГРАЦИЯ: отметка "Вход бесплатный" у события.
-- Выполни целиком один раз в Supabase → SQL Editor.
-- Повторный запуск безопасен, ничего не удаляет.

alter table public.events
  add column if not exists is_free boolean not null default false;

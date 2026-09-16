-- МИГРАЦИЯ: редактируемый текст страниц privacy.html и terms.html из админки.
-- Выполни целиком один раз в Supabase → SQL Editor. Повторный запуск безопасен.

alter table public.site_content
  add column if not exists privacy_content text,
  add column if not exists terms_content text;

-- МИГРАЦИЯ: раздельный фон для тёмной и светлой темы.
-- Выполни целиком один раз в Supabase → SQL Editor (после предыдущих миграций).
-- Повторный запуск безопасен, ничего не удаляет.

alter table public.site_content
  add column if not exists bg_color_dark text default '#11100e',
  add column if not exists bg_image_url_dark text,
  add column if not exists bg_image_path_dark text,
  add column if not exists bg_overlay_opacity_dark numeric default 0.6,
  add column if not exists bg_color_light text default '#f3efe4',
  add column if not exists bg_image_url_light text,
  add column if not exists bg_image_path_light text,
  add column if not exists bg_overlay_opacity_light numeric default 0.6;

-- Переносим то, что уже было настроено в старых bg_color/bg_image_url (по умолчанию
-- сайт всегда открывался в тёмной теме, поэтому старые значения — это фон тёмной темы).
update public.site_content
set
  bg_color_dark = coalesce(bg_color_dark, bg_color, '#11100e'),
  bg_image_url_dark = coalesce(bg_image_url_dark, bg_image_url),
  bg_image_path_dark = coalesce(bg_image_path_dark, bg_image_path),
  bg_overlay_opacity_dark = coalesce(bg_overlay_opacity_dark, bg_overlay_opacity, 0.6)
where id = 1;

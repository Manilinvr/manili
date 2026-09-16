window.MANILI_CONFIG = {
  SUPABASE_URL: "https://kyhavsiyvebrgaslwsxr.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_fVEB1p0X97-8yrWriWDaNA_wcokWR2k",

  // Базовый URL продакшн-сайта БЕЗ слэша на конце — используется для canonical/Open Graph
  // ссылок на страницах событий и альбомов (event.js/album.js). Если подключаешь другой
  // домен вместо manili.ru — поменяй здесь и в sitemap-функции (netlify/functions/sitemap.js).
  SITE_URL: "https://manili-event.ru",

  // Аналитика выключена по умолчанию (см. analytics.js). Чтобы включить, раскомментируй
  // и заполни один из вариантов:
  // ANALYTICS: { provider: 'plausible', domain: 'manili-event.ru' },
  // ANALYTICS: { provider: 'ga4', measurementId: 'G-XXXXXXX' },
  ANALYTICS: null
};

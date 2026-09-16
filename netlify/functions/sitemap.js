// Netlify Function — отдаёт sitemap.xml, собранный на лету из опубликованных
// событий и альбомов. Не требует сборки/билд-шага — обычная serverless-функция
// на Node (Netlify запускает её как есть).
//
// Подключена в netlify.toml редиректом: /sitemap.xml -> /.netlify/functions/sitemap
//
// Почему так, а не статический файл: сайт статический, без build-пайплайна,
// поэтому единственный способ включить в sitemap реальные /event.html?slug=...
// и /album.html?id=... без ручного обновления файла при каждой публикации —
// сформировать список при каждом запросе краулера напрямую из Supabase
// (используется тот же публичный anon-ключ, что и на клиенте — те же RLS-правила,
// то есть черновики и так не попадут в список).

const SITE_URL = 'https://manili-event.ru';
const SUPABASE_URL = 'https://kyhavsiyvebrgaslwsxr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_fVEB1p0X97-8yrWriWDaNA_wcokWR2k';

async function fetchJson(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  if (!res.ok) return [];
  return res.json();
}

function urlEntry(loc, lastmod) {
  return `  <url><loc>${loc}</loc>${lastmod ? `<lastmod>${lastmod.slice(0, 10)}</lastmod>` : ''}</url>`;
}

exports.handler = async function () {
  let events = [];
  let albums = [];
  try {
    events = await fetchJson('events?select=slug,id,updated_at&status=in.(published,archived)');
  } catch (e) { /* если Supabase недоступен — отдаём sitemap хотя бы со статичными страницами */ }
  try {
    albums = await fetchJson('albums?select=id,updated_at&status=eq.published');
  } catch (e) { /* см. выше */ }

  const staticUrls = [
    urlEntry(`${SITE_URL}/`),
    urlEntry(`${SITE_URL}/index.html`),
  ];

  const eventUrls = (events || []).map((e) =>
    urlEntry(`${SITE_URL}/event.html?slug=${encodeURIComponent(e.slug || e.id)}`, e.updated_at)
  );
  const albumUrls = (albums || []).map((a) =>
    urlEntry(`${SITE_URL}/album.html?id=${encodeURIComponent(a.id)}`, a.updated_at)
  );

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticUrls, ...eventUrls, ...albumUrls].join('\n')}
</urlset>`;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
    body,
  };
};

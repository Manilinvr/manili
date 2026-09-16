const STATUS_LABELS={coming_soon:'Скоро',on_sale:'В продаже',almost_sold_out:'Почти распроданы',sold_out:'Распроданы',sales_closed:'Продажи закрыты'};

function setText(id,val){if(val==null)return;const el=document.getElementById(id);if(el)el.textContent=val}
function escapeHtml(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function safeImg(url,alt,cls){
  if(!url)return '';
  return `<img class="${cls}" src="${url}" alt="${escapeHtml(alt||'')}" loading="lazy" onerror="this.style.display='none'">`;
}
function renderState(root,text){root.innerHTML=`<div class="section" style="text-align:center"><p class="loading">${escapeHtml(text)}</p></div>`}

function startCountdown(container,startsAt,content){
  if(!container)return;
  const dL=(content&&content.countdown_days_label)||'дн',hL=(content&&content.countdown_hours_label)||'ч',mL=(content&&content.countdown_minutes_label)||'мин',sL=(content&&content.countdown_seconds_label)||'сек';
  const target=new Date(startsAt).getTime();
  if(isNaN(target)){container.innerHTML='';return}
  const timer=setInterval(tick,1000);
  function tick(){
    const diff=target-Date.now();
    if(diff<=0){container.innerHTML='';clearInterval(timer);return}
    const d=Math.floor(diff/86400000),h=Math.floor(diff/3600000)%24,m=Math.floor(diff/60000)%60,s=Math.floor(diff/1000)%60;
    container.innerHTML=`<div class="cd-unit"><b>${d}</b><span>${escapeHtml(dL)}</span></div><div class="cd-unit"><b>${String(h).padStart(2,'0')}</b><span>${escapeHtml(hL)}</span></div><div class="cd-unit"><b>${String(m).padStart(2,'0')}</b><span>${escapeHtml(mL)}</span></div><div class="cd-unit"><b>${String(s).padStart(2,'0')}</b><span>${escapeHtml(sL)}</span></div>`;
  }
  tick();
}

/* ---- SEO: подставляем title/description/OG под конкретное событие ----
   Важно: это работает только для реальных браузеров и части краулеров, выполняющих JS.
   Часть соцсетей (напр. старые парсеры) читают только исходный HTML без JS —
   для них будет показан общий (дефолтный) OG сайта из <head>. Это ограничение
   статического сайта без серверного рендеринга; см. README/отчёт по деплою. */
function applyEventSeo(ev){
  try{
    const cfg=window.MANILI_CONFIG||{};
    const siteUrl=(cfg.SITE_URL||'').replace(/\/$/,'');
    const title=`${ev.name} — МаниЛи EVENT`;
    const desc=(ev.description||'').slice(0,200)||`${ev.name}: дата, билеты и подробности на МаниЛи EVENT.`;
    document.title=title;
    const setMeta=(sel,attr,val)=>{const el=document.querySelector(sel);if(el&&val)el.setAttribute(attr,val)};
    setMeta('meta[name="description"]','content',desc);
    setMeta('meta[property="og:title"]','content',title);
    setMeta('meta[property="og:description"]','content',desc);
    if(ev.poster_url)setMeta('meta[property="og:image"]','content',ev.poster_url);
    setMeta('meta[name="twitter:title"]','content',title);
    setMeta('meta[name="twitter:description"]','content',desc);
    if(siteUrl){
      const canonicalHref=`${siteUrl}/event.html?slug=${encodeURIComponent(ev.slug||ev.id)}`;
      setMeta('link[rel="canonical"]','href',canonicalHref);
      setMeta('meta[property="og:url"]','content',canonicalHref);
    }
    if(ev.starts_at||ev.date_text){
      const ld=document.createElement('script');
      ld.type='application/ld+json';
      const jsonLd={
        '@context':'https://schema.org',
        '@type':'Event',
        name:ev.name,
        startDate:ev.starts_at||undefined,
        eventStatus:'https://schema.org/EventScheduled',
        eventAttendanceMode:'https://schema.org/OfflineEventAttendanceMode',
        location:(ev.venue||ev.city)?{'@type':'Place',name:ev.venue||ev.city,address:ev.city||undefined}:undefined,
        image:ev.poster_url?[ev.poster_url]:undefined,
        description:ev.description||undefined
      };
      ld.textContent=JSON.stringify(jsonLd);
      document.head.appendChild(ld);
    }
  }catch(e){/* SEO — best effort, никогда не должно ломать страницу */}
}

(async()=>{
  const root=document.querySelector('#eventContent');
  const cfg=window.MANILI_CONFIG||{};
  if(!cfg.SUPABASE_URL||cfg.SUPABASE_URL.includes('YOUR-')){
    renderState(root,'Сайт временно недоступен. Попробуйте обновить страницу позже.');
    return;
  }

  let sb;
  try{
    sb=supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
  }catch(e){
    renderState(root,'Не удалось загрузить данные. Проверьте подключение к интернету и обновите страницу.');
    return;
  }

  const slug=new URLSearchParams(location.search).get('slug');

  let content=null;
  try{
    const r=await sb.from('site_content').select('*').eq('id',1).maybeSingle();
    content=r.data||null;
  }catch(e){/* контент шапки — не критично, продолжаем без него */}

  if(content){
    setText('footerLeft',content.footer_left);setText('footerRight',content.footer_right);
    const mlBadge=document.querySelector('#mlBadge');
    if(content.logo_url&&mlBadge){mlBadge.classList.add('has-logo');mlBadge.innerHTML=`<img src="${content.logo_url}" alt="МаниЛи" onerror="this.closest('.ml').classList.remove('has-logo');this.remove()">`}
    window.manili_setThemeBgContent?.(content);
  }

  if(!slug){renderState(root,'Событие не найдено.');return}

  renderState(root,'Загружаем событие…');

  let ev,evError;
  try{
    const r=await sb.from('events').select('*, ticket_categories(*)').eq('slug',slug).in('status',['published','archived']).maybeSingle();
    ev=r.data;evError=r.error;
  }catch(e){
    renderState(root,'Не удалось загрузить событие. Проверьте подключение к интернету.');
    return;
  }
  if(evError){renderState(root,(content&&content.events_error_text)||'Не удалось загрузить событие.');return}
  if(!ev){renderState(root,'Событие не найдено — возможно, оно было удалено или ещё не опубликовано.');return}

  applyEventSeo(ev);

  let album=null;
  try{
    const {data:albumRow}=await sb.from('albums').select('*').eq('event_id',ev.id).eq('status','published').order('sort_order',{ascending:true}).limit(1).maybeSingle();
    if(albumRow){
      const {data:mediaRows}=await sb.from('album_media').select('*').eq('album_id',albumRow.id).order('sort_order',{ascending:true});
      album={...albumRow,album_media:mediaRows||[]};
    }
  }catch(e){/* альбом опционален — молча пропускаем, событие всё равно показываем */}

  const isPast=ev.status==='archived';
  const cats=(ev.ticket_categories||[]).slice().sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
  const ticketLabel=(content&&content.ticket_button_text)||'Билеты';
  const pastLabel=(content&&content.events_past_label)||'ПРОШЛО';

  const heroHtml=ev.promo_video_url
    ? `<video class="event-hero-media" src="${ev.promo_video_url}" autoplay muted loop playsinline poster="${ev.poster_url||''}" onerror="this.replaceWith(document.createElement('div'))"></video>`
    : safeImg(ev.poster_url,ev.name,'event-hero-media');

  const metaBits=[ev.date_text,ev.time_text,ev.city,ev.venue].filter(Boolean).map(escapeHtml).join(' &middot; ');

  const mapQuery=[ev.venue,ev.city].filter(Boolean).join(', ');
  const mapHtml=mapQuery?`<div class="event-map"><iframe src="https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Карта: ${escapeHtml(mapQuery)}" allowfullscreen></iframe></div>`:'';

  const ticketsHtml=isPast
    ? `<p style="color:var(--muted)">Событие уже прошло${album?', смотри фото и видео ниже.':'.'}</p>`
    : (ev.is_free
      ? `<p class="tname" style="margin-bottom:6px">Вход свободный</p><p style="color:var(--muted)">Билет не нужен — просто приходи к началу.</p>`
      : (cats.length
        ? cats.map(t=>{
            const isBlocked=t.status==='sold_out'||t.status==='sales_closed';
            const url=t.ticket_url||ev.ticket_url;
            const hasValidUrl=!!(url&&/^https?:\/\//i.test(url));
            return `<div class="ticket-row"><div><div class="tname">${escapeHtml(t.name)}</div><div class="tprice">${t.price!=null?escapeHtml(String(t.price))+' '+escapeHtml(t.currency||'₽'):''} · <span class="status-pill status-${t.status||'on_sale'}">${escapeHtml(STATUS_LABELS[t.status]||STATUS_LABELS.on_sale)}</span></div></div>${!isBlocked&&hasValidUrl?`<a class="btn" target="_blank" rel="noopener" href="${url}" data-analytics="ticket_click" data-event="${escapeHtml(ev.name)}">${escapeHtml(ticketLabel)}</a>`:''}</div>`;
          }).join('')
        : (ev.ticket_url&&/^https?:\/\//i.test(ev.ticket_url)
            ?`<div class="ticket-row"><div><div class="tname">${escapeHtml(ev.name)}</div><div class="tprice"><span class="status-pill status-${ev.ticket_status||'coming_soon'}">${escapeHtml(STATUS_LABELS[ev.ticket_status]||STATUS_LABELS.coming_soon)}</span></div></div>${ev.ticket_status!=='sold_out'&&ev.ticket_status!=='sales_closed'?`<a class="btn" target="_blank" rel="noopener" href="${ev.ticket_url}" data-analytics="ticket_click" data-event="${escapeHtml(ev.name)}">${escapeHtml(ticketLabel)}</a>`:''}</div>`
            :'<p style="color:var(--muted)">Билеты скоро появятся.</p>')));

  root.innerHTML=`
    <div class="event-hero">${heroHtml}</div>
    <div class="event-detail-body">
      <div>
        ${isPast?`<span class="event-tag past" style="position:static;display:inline-block;margin-bottom:14px">${escapeHtml(pastLabel)}</span>`:''}
        <h1>${escapeHtml(ev.name)}</h1>
        <p style="color:var(--muted);letter-spacing:.5px;margin-bottom:20px">${metaBits}</p>
        ${ev.description?`<p class="desc">${escapeHtml(ev.description)}</p>`:''}
        ${!isPast&&ev.starts_at?`<div class="countdown" id="eventCountdown" style="margin-top:30px"></div>`:''}
        ${mapHtml}
      </div>
      <div class="ticket-box"><h3>${isPast?'Как это было':(ev.is_free?'Вход':'Билеты')}</h3>${ticketsHtml}</div>
    </div>
    ${album&&album.album_media?.length?`<div class="event-media-block"><div class="section-head" style="margin-bottom:24px"><p class="eyebrow">МЕДИА</p><h2 style="font-size:clamp(28px,4vw,48px)">${escapeHtml(album.title)}</h2></div><div class="albums-grid" id="eventAlbumGrid"></div></div>`:''}
  `;

  if(!isPast&&ev.starts_at)startCountdown(document.querySelector('#eventCountdown'),ev.starts_at,content);

  if(album?.album_media?.length){
    const media=album.album_media.slice().sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
    const grid=document.querySelector('#eventAlbumGrid');
    grid.innerHTML=media.map((m,i)=>m.type==='video'
      ? `<article class="album-card" data-i="${i}"><video class="cover" src="${m.url}" muted loop autoplay playsinline preload="metadata" onerror="this.closest('.album-card').style.display='none'"></video></article>`
      : `<article class="album-card" data-i="${i}"><img class="cover" src="${m.url}" loading="lazy" alt="" onerror="this.closest('.album-card').style.display='none'"></article>`
    ).join('');
    grid.querySelectorAll('.album-card').forEach(card=>{
      card.onclick=()=>window.manili_openLightbox?.(media,+card.dataset.i);
    });
  }

  document.querySelectorAll('[data-analytics="ticket_click"]').forEach(a=>{
    a.addEventListener('click',()=>{window.manili_track?.('ticket_click',{event_id:ev.id,element_label:ev.name})});
  });
  window.manili_track?.('event_view',{event_id:ev.id,element_label:ev.name});
})();

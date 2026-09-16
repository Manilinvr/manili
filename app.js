const STATUS_LABELS={coming_soon:'Скоро',on_sale:'В продаже',almost_sold_out:'Почти распроданы',sold_out:'Распроданы',sales_closed:'Продажи закрыты'};

function setText(id,val){if(val==null)return;const el=document.getElementById(id);if(el)el.textContent=val}
function setLines(id,val){const el=document.getElementById(id);if(!el||val==null)return;el.textContent='';String(val).split('\n').forEach((line,i)=>{if(i>0)el.appendChild(document.createElement('br'));el.appendChild(document.createTextNode(line))})}
function escapeHtml(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

function renderPromo(ev,content){
  const el=document.querySelector('#promoSection');if(!el)return;
  if(!ev){el.style.display='none';return}
  el.style.display='block';
  const mediaHtml=ev.promo_video_url
    ? `<video class="promo-media" src="${ev.promo_video_url}" autoplay muted loop playsinline preload="auto" poster="${ev.poster_url||''}" onerror="this.replaceWith(document.createElement('div'))"></video>`
    : (ev.poster_url?`<img class="promo-media" src="${ev.poster_url}" alt="${escapeHtml(ev.name)}" onerror="this.style.display='none'">`:'');
  const cats=(ev.ticket_categories||[]).filter(t=>t.price!=null).sort((a,b)=>a.price-b.price);
  const detailUrl=`event.html?slug=${encodeURIComponent(ev.slug||ev.id)}`;
  const cfg=window.MANILI_CONFIG||{};
  const siteUrl=(cfg.SITE_URL||location.origin).replace(/\/$/,'');
  const shareUrl=`${siteUrl}/${detailUrl}`;
  const infoText=(content&&content.promo_cta_text)||'Информация';
  el.innerHTML=`${mediaHtml}<div class="promo-overlay">
    <p class="promo-eyebrow">${escapeHtml((content&&content.promo_eyebrow)||'БЛИЖАЙШЕЕ СОБЫТИЕ')}</p>
    <h2>${escapeHtml(ev.name)}</h2>
    <div class="promo-meta">${ev.date_text?`<span>${escapeHtml(ev.date_text)}${ev.time_text?' · '+escapeHtml(ev.time_text):''}</span>`:''}${(ev.city||ev.venue)?`<span>${escapeHtml([ev.city,ev.venue].filter(Boolean).join(', '))}</span>`:''}</div>
    <div class="countdown" id="promoCountdown"></div>
    <div class="promo-actions">
      <a class="btn" href="${detailUrl}" data-track="button_click" data-track-event-id="${ev.id}" data-track-label="Информация о событии">${escapeHtml(infoText)} <span class="icon icon-arrow-up-right">${window.manili_icon?window.manili_icon('arrow-up-right'):''}</span></a>
      <button class="btn btn-share" id="promoShare" type="button" data-track="share_click" data-track-event-id="${ev.id}" data-track-label="Поделиться событием">Поделиться</button>
    </div>
  </div>`;
  if(ev.starts_at)startCountdown(document.querySelector('#promoCountdown'),ev.starts_at,content);

  const shareBtn=document.querySelector('#promoShare');
  if(shareBtn){
    shareBtn.addEventListener('click',()=>{
      if(navigator.share){navigator.share({title:ev.name,url:shareUrl}).catch(()=>{});return}
      navigator.clipboard?.writeText(shareUrl).then(()=>{
        const old=shareBtn.textContent;shareBtn.textContent='Ссылка скопирована ✓';
        setTimeout(()=>{shareBtn.textContent=old},1600);
      }).catch(()=>{window.prompt('Скопируйте ссылку:',shareUrl)});
    });
  }
}

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

function renderAlbums(albums,content){
  const grid=document.querySelector('#albumsGrid');if(!grid)return;
  if(!albums?.length){grid.innerHTML=`<div class="loading">${escapeHtml((content&&content.albums_empty_text)||'Скоро здесь появятся альбомы с прошедших событий.')}</div>`;return}
  const PLAY_SVG='<svg viewBox="0 0 24 24" fill="none"><path d="M8 5v14l11-7L8 5Z" fill="currentColor"/></svg>';
  grid.innerHTML=albums.map((a,ai)=>{
    const media=(a.album_media||[]).slice().sort((x,y)=>(x.sort_order||0)-(y.sort_order||0));
    const cover=media.find(m=>m.id===a.cover_media_id)||media[0];
    const photos=media.filter(m=>m.type==='image').length,videos=media.filter(m=>m.type==='video').length;
    const coverHtml=cover?(cover.type==='video'?`<video class="cover" src="${cover.url}" muted loop autoplay playsinline onerror="this.closest('.album-card').style.opacity='.4'"></video>`:`<img class="cover" src="${cover.url}" alt="${escapeHtml(a.title)}" loading="lazy" onerror="this.closest('.album-card').style.opacity='.4'">`):'';
    return `<article class="album-card" data-album="${ai}">${coverHtml}<span class="play-badge">${PLAY_SVG}</span><div class="album-info"><b>${escapeHtml(a.title)}</b><span>${photos} фото · ${videos} видео</span></div></article>`;
  }).join('');
  grid.querySelectorAll('.album-card').forEach(card=>{
    card.onclick=()=>{location.href=`album.html?id=${encodeURIComponent(albums[+card.dataset.album].id)}`};
  });
}

(async()=>{
  const cfg=window.MANILI_CONFIG||{};
  const eventsGrid=document.querySelector('#eventsGrid');
  const albumsGrid=document.querySelector('#albumsGrid');

  if(!cfg.SUPABASE_URL||cfg.SUPABASE_URL.includes('YOUR-')){
    if(eventsGrid)eventsGrid.innerHTML=`<div class="loading">Сайт временно недоступен. Попробуйте обновить страницу позже.</div>`;
    if(albumsGrid)albumsGrid.innerHTML='';
    return;
  }

  let sb;
  try{
    sb=supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
  }catch(e){
    if(eventsGrid)eventsGrid.innerHTML=`<div class="loading">Не удалось загрузить данные. Проверьте подключение к интернету и обновите страницу.</div>`;
    return;
  }

  let content=null;
  try{
    const r=await sb.from('site_content').select('*').eq('id',1).maybeSingle();
    content=r.data||null;
  }catch(e){/* контент опционален — продолжаем с дефолтными текстами из HTML */}

  if(content){
    setText('navEvents',content.nav_events_label);setText('navAbout',content.nav_about_label);setText('navContacts',content.nav_contacts_label);setText('navGallery',content.nav_gallery_label);
    setText('heroEyebrow',content.hero_eyebrow);setText('heroTitle',content.hero_title);setText('heroSubtitle',content.hero_subtitle);setText('heroText',content.hero_text);setText('heroBtnText',content.hero_button_text);
    setText('eventsEyebrow',content.events_eyebrow);setText('eventsTitle',content.events_title);
    setText('aboutEyebrow',content.about_eyebrow);setText('aboutTitle',content.about_title);setText('aboutText',content.about_text);
    setLines('manifestLine',content.manifest_line);
    setText('albumsEyebrow',content.albums_eyebrow);setText('albumsTitle',content.albums_title);
    setText('contactEyebrow',content.contact_eyebrow);setText('contactTitle',content.contact_title);
    setText('footerLeft',content.footer_left);setText('footerRight',content.footer_right);
    const emailEl=document.querySelector('#email');
    if(content.contact_email&&emailEl){emailEl.textContent=content.contact_email;emailEl.href='mailto:'+content.contact_email}
    const mlBadge=document.querySelector('#mlBadge');
    if(content.logo_url&&mlBadge){mlBadge.classList.add('has-logo');mlBadge.innerHTML=`<img src="${content.logo_url}" alt="МаниЛи" onerror="this.closest('.ml').classList.remove('has-logo');this.remove()">`}
    window.manili_setThemeBgContent?.(content);
  }

  try{
    const {data:socials}=await sb.from('social_links').select('*').eq('visible',true).order('sort_order',{ascending:true});
    const socGrid=document.querySelector('#contactGrid');
    if(socGrid){
      (socials||[]).forEach((s,i)=>{
        const a=document.createElement('a');a.href=s.url;a.target='_blank';a.rel='noopener';a.className=`social-icon accent-${(i%3)+1}`;
        a.setAttribute('data-track','social_click');a.setAttribute('data-track-label',s.label||s.platform);
        a.innerHTML=`<span class="icon">${window.manili_icon?window.manili_icon(s.platform):''}</span> ${escapeHtml(s.label||s.platform)} <span class="icon icon-arrow-up-right">${window.manili_icon?window.manili_icon('arrow-up-right'):''}</span>`;
        socGrid.appendChild(a);
      });
    }
  }catch(e){/* соцсети опциональны */}

  /* ---- Промо ближайшего события + countdown ---- */
  try{
    const {data:promoEvent}=await sb.from('events').select('*, ticket_categories(*)').eq('status','published').eq('promo_published',true).not('promo_video_url','is',null).order('starts_at',{ascending:true}).limit(1).maybeSingle();
    renderPromo(promoEvent,content);
  }catch(e){renderPromo(null,content)}

  /* ---- События: карточки накладываются друг на друга, листаются по кругу стрелками ---- */
  if(eventsGrid){
    const ticketLabel=(content&&content.ticket_button_text)||'Билеты';
    const nextLabel=(content&&content.events_next_label)||'БЛИЖАЙШЕЕ';
    const pastLabel=(content&&content.events_past_label)||'ПРОШЛО';
    const ratio=(content&&content.poster_aspect_ratio)||'portrait';
    eventsGrid.classList.toggle('ratio-square',ratio==='square');
    eventsGrid.classList.toggle('ratio-landscape',ratio==='landscape');

    let events=null,eventsErr=null;
    try{
      const r=await sb.from('events').select('*, ticket_categories(*)').in('status',['published','archived']).order('sort_order',{ascending:true}).order('created_at',{ascending:false});
      events=r.data;eventsErr=r.error;
    }catch(e){eventsErr=e}

    if(eventsErr){
      eventsGrid.innerHTML=`<div class="loading">${escapeHtml((content&&content.events_error_text)||'Не удалось загрузить события. Проверьте подключение к интернету.')}</div>`;
    }else if(!events?.length){
      eventsGrid.innerHTML=`<div class="loading">${escapeHtml((content&&content.events_empty_text)||'Скоро здесь появятся новые события.')}</div>`;
    }else{
      const RING_SVG='<svg viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="26" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="30" cy="30" r="16" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="30" cy="30" r="6" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
      const upcoming=events.filter(e=>e.status==='published');
      const nextId=upcoming[0]?.id;
      eventsGrid.innerHTML=events.map((e,i)=>{
        const isNext=e.id===nextId;const isPast=e.status==='archived';
        const cls=['event',`accent-${(i%3)+1}`];if(isPast)cls.push('is-past');
        const tag=isNext?`<span class="event-tag next">${escapeHtml(nextLabel)}</span>`:(isPast?`<span class="event-tag past">${escapeHtml(pastLabel)}</span>`:'');
        const cats=(e.ticket_categories||[]).filter(t=>t.price!=null).sort((a,b)=>a.price-b.price);
        const statusPill=!isPast?(e.is_free?'<span class="status-pill status-free">Вход свободный</span>':`<span class="status-pill status-${e.ticket_status||'coming_soon'}">${escapeHtml(STATUS_LABELS[e.ticket_status]||STATUS_LABELS.coming_soon)}</span>`):'';
        const detailUrl=`event.html?slug=${encodeURIComponent(e.slug||e.id)}`;
        let ticketBtn='';
        if(!isPast&&e.is_free){ticketBtn=`<a class="btn ticket-btn" href="${detailUrl}">Подробнее <span class="icon icon-arrow-up-right">${window.manili_icon?window.manili_icon('arrow-up-right'):''}</span></a>`}
        else if(!isPast&&cats.length){ticketBtn=`<a class="btn ticket-btn" href="${detailUrl}">${escapeHtml(ticketLabel)} от ${cats[0].price}${escapeHtml(cats[0].currency||'₽')} <span class="icon icon-arrow-up-right">${window.manili_icon?window.manili_icon('arrow-up-right'):''}</span></a>`}
        else if(!isPast&&e.ticket_url&&/^https?:\/\//i.test(e.ticket_url)){ticketBtn=`<a class="btn ticket-btn" target="_blank" rel="noopener" href="${e.ticket_url}" data-track="ticket_click" data-track-event-id="${e.id}" data-track-label="${escapeHtml(e.name)}">${escapeHtml(ticketLabel)} <span class="icon icon-arrow-up-right">${window.manili_icon?window.manili_icon('arrow-up-right'):''}</span></a>`}
        return `<article class="${cls.join(' ')}">${tag}<div class="event-ring">${RING_SVG}</div><a href="${detailUrl}" data-track="poster_click" data-track-event-id="${e.id}" data-track-label="${escapeHtml(e.name)}">${e.poster_url?`<div class="event-poster"><img class="event-poster-bg" src="${e.poster_url}" alt="" aria-hidden="true" loading="lazy"><img class="event-poster-fg" src="${e.poster_url}" alt="${escapeHtml(e.name)}" loading="lazy" onerror="this.closest('.event-poster').style.display='none'"></div>`:''}<div class="event-body">${statusPill}<div class="event-date">${escapeHtml(e.date_text||'')}${e.time_text?' / '+escapeHtml(e.time_text):''}</div><h3>${escapeHtml(e.name)}</h3>${e.venue?`<p>${escapeHtml(e.venue)}</p>`:''}</div></a>${ticketBtn?`<div style="padding:0 16px 16px">${ticketBtn}</div>`:''}</article>`;
      }).join('');
      eventsGrid.querySelectorAll('[data-analytics="ticket_click"]').forEach(a=>{
        a.addEventListener('click',()=>{window.manili_track?.('ticket_click',{event:a.dataset.event})});
      });
      const cardsEls=[...eventsGrid.querySelectorAll('.event')];
      let current=Math.max(0,events.findIndex(e=>e.id===nextId));
      const wrapOffset=i=>{let o=i-current;const n=cardsEls.length;if(o>n/2)o-=n;if(o<-n/2)o+=n;return o};
      const updateStack=()=>{
        cardsEls.forEach((el,i)=>{
          const o=wrapOffset(i);const abs=Math.abs(o);
          el.classList.toggle('is-active',o===0);
          el.style.zIndex=String(10-abs);
          if(abs>2){el.style.opacity='0';el.style.pointerEvents='none';el.style.transform=`translate(-50%,-50%) translateX(${o*70}%) scale(.55)`;return}
          el.style.opacity=abs===0?'1':abs===1?'.7':'.35';
          el.style.pointerEvents=abs===0?'auto':'none';
          el.style.transform=`translate(-50%,-50%) translateX(${o*64}%) scale(${1-abs*0.15}) rotate(${o*6}deg)`;
        });
      };
      updateStack();
      const prevBtn=document.querySelector('#eventsPrev'),nextBtn=document.querySelector('#eventsNext');
      if(prevBtn)prevBtn.onclick=()=>{current=(current-1+cardsEls.length)%cardsEls.length;updateStack()};
      if(nextBtn)nextBtn.onclick=()=>{current=(current+1)%cardsEls.length;updateStack()};
    }
  }

  /* ---- Альбомы (фото + видео) ---- */
  try{
    const {data:albumRows}=await sb.from('albums').select('*').eq('status','published').order('sort_order',{ascending:true});
    let albums=albumRows||[];
    if(albums.length){
      const ids=albums.map(a=>a.id);
      const {data:mediaRows}=await sb.from('album_media').select('*').in('album_id',ids).order('sort_order',{ascending:true});
      albums=albums.map(a=>({...a,album_media:(mediaRows||[]).filter(m=>m.album_id===a.id)}));
    }
    renderAlbums(albums,content);
  }catch(e){renderAlbums([],content)}

  /* ---- Плавное появление секций ---- */
  if('IntersectionObserver' in window){
    const io=new IntersectionObserver(entries=>{entries.forEach(en=>{if(en.isIntersecting){en.target.classList.add('is-visible');io.unobserve(en.target)}})},{threshold:.15});
    document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
  }else{document.querySelectorAll('.reveal').forEach(el=>el.classList.add('is-visible'))}
})();

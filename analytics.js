/* МаниЛи — собственная аналитика (без сторонних сервисов, ТЗ раздел 11-26).
   Это тот же analytics.js, что и раньше, — просто расширенный, а не заменённый:
   window.manili_track(name, params) как и прежде складывает события в
   window.manili_events (для отладки) и, если настроен provider в config.js,
   шлёт их в Plausible/GA4. Новое — события ДОПОЛНИТЕЛЬНО пишутся в Supabase
   (analytics_events / analytics_sessions), это и есть "своя" аналитика,
   которую видно в /admin/.

   Приватность (ТЗ раздел 25): не собираем email/пароль/точный адрес/IP,
   никакого агрессивного fingerprinting — только session_id (случайная строка
   в localStorage) и грубая информация об устройстве/экране.

   Ошибка аналитики никогда не должна ронять сайт — все обращения к Supabase
   обёрнуты в try/catch и просто молча пропускаются при сбое (ТЗ раздел 26). */
(function(){
  const cfg=(window.MANILI_CONFIG||{}).ANALYTICS||null;
  window.manili_events=window.manili_events||[];
  let providerReady=false;

  function loadPlausible(domain){
    if(!domain||document.querySelector('script[data-manili-analytics]'))return;
    const s=document.createElement('script');
    s.defer=true;s.setAttribute('data-manili-analytics','plausible');
    s.setAttribute('data-domain',domain);
    s.src='https://plausible.io/js/script.js';
    document.head.appendChild(s);
    providerReady=true;
  }
  function loadGa4(id){
    if(!id||document.querySelector('script[data-manili-analytics]'))return;
    const s=document.createElement('script');
    s.async=true;s.setAttribute('data-manili-analytics','ga4');
    s.src=`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    document.head.appendChild(s);
    window.dataLayer=window.dataLayer||[];
    window.gtag=function(){window.dataLayer.push(arguments)};
    window.gtag('js',new Date());
    window.gtag('config',id,{anonymize_ip:true});
    providerReady=true;
  }
  if(cfg&&cfg.provider==='plausible')loadPlausible(cfg.domain);
  if(cfg&&cfg.provider==='ga4')loadGa4(cfg.measurementId);

  /* ---------------------------------------------------------------------
     СОБСТВЕННАЯ АНАЛИТИКА (Supabase)
  --------------------------------------------------------------------- */
  const SESSION_KEY='manili_session_id';
  const SESSION_STARTED_KEY='manili_session_started';
  const SESSION_TTL_MS=30*60*1000; // 30 минут без активности — новая сессия
  const HEARTBEAT_MS=20000;

  function deviceType(){
    const w=window.innerWidth;
    if(w<768)return 'mobile';
    if(w<1025)return 'tablet';
    return 'desktop';
  }
  function uuid(){
    if(window.crypto&&crypto.randomUUID)return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{
      const r=Math.random()*16|0;return (c==='x'?r:(r&0x3|0x8)).toString(16);
    });
  }

  let sb=null;
  function getClient(){
    if(sb)return sb;
    const c=window.MANILI_CONFIG||{};
    if(!c.SUPABASE_URL||c.SUPABASE_URL.includes('YOUR-')||typeof supabase==='undefined')return null;
    try{sb=supabase.createClient(c.SUPABASE_URL,c.SUPABASE_ANON_KEY);return sb}catch(e){return null}
  }

  let sessionId=null,isNewSession=false,activeMs=0,lastTickAt=Date.now(),pageViews=0,hidden=document.hidden;

  function loadOrCreateSession(){
    try{
      const now=Date.now();
      const savedId=localStorage.getItem(SESSION_KEY);
      const startedAt=parseInt(localStorage.getItem(SESSION_STARTED_KEY)||'0',10);
      const lastActive=parseInt(localStorage.getItem(SESSION_KEY+'_last')||'0',10);
      if(savedId&&lastActive&&(now-lastActive)<SESSION_TTL_MS){
        sessionId=savedId;isNewSession=false;
      }else{
        sessionId=uuid();isNewSession=true;
        localStorage.setItem(SESSION_KEY,sessionId);
        localStorage.setItem(SESSION_STARTED_KEY,String(now));
      }
      localStorage.setItem(SESSION_KEY+'_last',String(now));
    }catch(e){
      sessionId=sessionId||uuid();isNewSession=true;
    }
  }
  loadOrCreateSession();

  function baseFields(){
    return {
      session_id:sessionId,
      page:document.title||null,
      path:location.pathname+location.search,
      referrer:document.referrer||null,
      device_type:deviceType(),
      viewport_width:window.innerWidth,
      viewport_height:window.innerHeight
    };
  }

  async function insertEvent(name,params){
    const client=getClient();if(!client)return;
    try{
      const row=Object.assign(baseFields(),{
        event_name:name,
        event_id:(params&&params.event_id)||null,
        album_id:(params&&params.album_id)||null,
        ticket_category_id:(params&&params.ticket_category_id)||null,
        element_id:(params&&params.element_id)||null,
        element_label:(params&&params.element_label)||null,
        metadata:params?JSON.stringify(params).slice(0,1900):null
      });
      await client.from('analytics_events').insert(row);
    }catch(e){/* аналитика никогда не должна ломать страницу */}
  }

  async function upsertSession(extra){
    const client=getClient();if(!client)return;
    try{
      const payload=Object.assign({
        session_id:sessionId,
        last_seen_at:new Date().toISOString(),
        device_type:deviceType(),
        page_views:pageViews,
        duration_seconds:Math.round(activeMs/1000)
      },extra||{});
      if(isNewSession){
        payload.started_at=new Date().toISOString();
        payload.landing_page=location.pathname;
        payload.referrer=document.referrer||null;
        const {error}=await client.from('analytics_sessions').insert(payload);
        if(!error)isNewSession=false;
      }else{
        await client.from('analytics_sessions').update(payload).eq('session_id',sessionId);
      }
    }catch(e){/* см. выше — не критично */}
  }

  // Активное время: считаем, только пока вкладка видима (Page Visibility API).
  function tick(){
    const now=Date.now();
    if(!hidden)activeMs+=now-lastTickAt;
    lastTickAt=now;
  }
  document.addEventListener('visibilitychange',function(){
    tick();
    hidden=document.hidden;
    if(!hidden)upsertSession();
  });
  setInterval(function(){
    tick();
    upsertSession();
  },HEARTBEAT_MS);
  window.addEventListener('pagehide',function(){
    tick();
    try{
      const client=getClient();
      if(client&&navigator.sendBeacon){/* лучшая попытка — не гарантируется */}
    }catch(e){}
  });

  /* ---------------------------------------------------------------------
     ЕДИНЫЙ API: window.manili_track(name, params)
  --------------------------------------------------------------------- */
  window.manili_track=function(name,params){
    try{
      window.manili_events.push({name,params,t:Date.now()});
      if(providerReady){
        if(window.plausible)window.plausible(name,{props:params});
        else if(window.gtag)window.gtag('event',name,params||{});
      }
    }catch(e){/* внешний provider — не критично */}
    insertEvent(name,params);
  };

  function trackPageView(){
    pageViews+=1;
    window.manili_track('page_view',{});
    if(isNewSession)window.manili_track('session_start',{});
    upsertSession();
  }

  // Автотрекинг кликов по элементам с data-track (единая система, ТЗ раздел 16).
  // Например: <a data-track="social_click" data-track-label="Telegram">
  // Старые data-analytics="ticket_click" в event.js/app.js продолжают работать
  // отдельно и тоже идут через window.manili_track — дублирования событий нет,
  // это просто два способа разметки для разных частей кода.
  document.addEventListener('click',function(e){
    const el=e.target.closest&&e.target.closest('[data-track]');
    if(!el)return;
    const name=el.getAttribute('data-track');
    if(!name)return;
    const params={
      element_id:el.getAttribute('data-track-id')||el.id||null,
      element_label:el.getAttribute('data-track-label')||(el.textContent||'').trim().slice(0,60)||null
    };
    // Для событий/альбомов/категорий передаём id в специальные колонки таблицы
    // (иначе в аналитике не построятся таблица афиш и CTR).
    const evId=el.getAttribute('data-track-event-id');if(evId)params.event_id=evId;
    const alId=el.getAttribute('data-track-album-id');if(alId)params.album_id=alId;
    const tcId=el.getAttribute('data-track-ticket-id');if(tcId)params.ticket_category_id=tcId;
    window.manili_track(name,params);
  },true);

  // Outbound-ссылки (соцсети, внешние ссылки на билеты и т.п.)
  document.addEventListener('click',function(e){
    const a=e.target.closest && e.target.closest('a[target="_blank"]');
    if(!a||!a.href)return;
    try{
      const url=new URL(a.href,location.href);
      if(url.host && url.host!==location.host && !a.hasAttribute('data-track')){
        window.manili_track('outbound_click',{url:a.href});
      }
    }catch(err){/* ignore */}
  },true);

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',trackPageView);
  }else{
    trackPageView();
  }
})();

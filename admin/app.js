const cfg=window.MANILI_CONFIG||{};const sb=supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);let events=[];let socials=[];let albums=[];let editingAlbumId=null;let currentPage='dashboard';let editingPoster=null;let editingPromo=null;
const $=s=>document.querySelector(s);const esc=s=>(s||'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const PLATFORMS=[['telegram','Telegram'],['whatsapp','WhatsApp'],['instagram','Instagram'],['vk','VK'],['tiktok','TikTok'],['youtube','YouTube'],['phone','Телефон'],['email','Email'],['custom','Другое / ссылка']];
const TICKET_STATUSES=[['coming_soon','Скоро'],['on_sale','В продаже'],['almost_sold_out','Почти распроданы'],['sold_out','Распроданы'],['sales_closed','Продажи закрыты']];

/* ---- Проверка загружаемых файлов: тип и максимальный размер ----
   Без этого пользователь мог случайно загрузить .exe/.pdf под видом афиши,
   или огромный ролик в 4К и не понять, почему всё "зависло". */
const MAX_IMAGE_MB=15,MAX_VIDEO_MB=200;
function validateFile(file,kind){
  if(!file)return null;
  const isImage=file.type.startsWith('image/');
  const isVideo=file.type.startsWith('video/');
  if(kind==='image'&&!isImage)return `Файл «${file.name}» — не изображение (получен тип ${file.type||'неизвестен'}).`;
  if(kind==='video'&&!isVideo)return `Файл «${file.name}» — не видео (получен тип ${file.type||'неизвестен'}).`;
  if(kind==='media'&&!isImage&&!isVideo)return `Файл «${file.name}» должен быть изображением или видео.`;
  const maxMb=isVideo?MAX_VIDEO_MB:MAX_IMAGE_MB;
  if(file.size>maxMb*1024*1024)return `Файл «${file.name}» слишком большой (${(file.size/1024/1024).toFixed(1)} МБ). Максимум ${maxMb} МБ.`;
  return null;
}

(async()=>{
  try{
    const {data:{session}}=await sb.auth.getSession();
    if(session)await boot();else showLogin();
  }catch(e){
    showLogin();
    const err=$('#loginError');if(err)err.textContent='Не удалось подключиться к серверу. Проверьте интернет-соединение и обновите страницу.';
  }
})();
function showLogin(){$('#login').classList.remove('hidden');$('#app').classList.add('hidden')}
async function boot(){
  $('#login').classList.add('hidden');$('#app').classList.remove('hidden');
  try{
    const {data:ok}=await sb.rpc('is_manili_admin');
    if(!ok){await sb.auth.signOut();$('#loginError').textContent='У этого аккаунта нет прав администратора.';showLogin();return}
    await loadEvents();await loadSocials();await loadAlbums();render();
  }catch(e){
    $('#app').innerHTML=`<div class="card" style="margin:40px"><h2>Не удалось загрузить админку</h2><p style="color:var(--muted)">Проверьте подключение к интернету и обновите страницу. Если ошибка повторяется — проверьте, что проект Supabase доступен.</p></div>`;
  }
}
$('#loginForm').onsubmit=async e=>{
  e.preventDefault();$('#loginError').textContent='';
  try{
    const {error}=await sb.auth.signInWithPassword({email:$('#email').value,password:$('#password').value});
    if(error){$('#loginError').textContent=error.message;return}
    await boot()
  }catch(e){$('#loginError').textContent='Не удалось подключиться к серверу. Проверьте интернет-соединение.'}
};$('#logout').onclick=async()=>{await sb.auth.signOut();showLogin()};document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>{currentPage=b.dataset.page;document.querySelectorAll('.nav').forEach(x=>x.classList.remove('active'));b.classList.add('active');render()});$('#quickAdd').onclick=()=>openEvent();$('#closeModal').onclick=closeModal;
async function loadEvents(){const r=await sb.from('events').select('*, ticket_categories(*)').order('sort_order',{ascending:true}).order('created_at',{ascending:false});events=r.data||[]}
async function loadSocials(){const r=await sb.from('social_links').select('*').order('sort_order',{ascending:true});socials=r.data||[]}
async function loadAlbums(){
  const r=await sb.from('albums').select('*').order('sort_order',{ascending:true});
  if(r.error){albums=[];window.albumsLoadError=r.error.message;return}
  const ids=(r.data||[]).map(a=>a.id);
  let mediaRows=[];
  if(ids.length){
    const rm=await sb.from('album_media').select('*').in('album_id',ids).order('sort_order',{ascending:true});
    if(rm.error){albums=[];window.albumsLoadError=rm.error.message;return}
    mediaRows=rm.data||[];
  }
  albums=(r.data||[]).map(a=>({...a,album_media:mediaRows.filter(m=>m.album_id===a.id)}));
  window.albumsLoadError=null;
}
function render(){const titles={dashboard:'Дашборд',events:'События',posters:'Афиши',albums:'Альбомы',content:'Контент сайта',socials:'Соцсети',analytics:'Аналитика',settings:'Настройки'};$('#pageTitle').textContent=titles[currentPage];$('#quickAdd').classList.toggle('hidden',currentPage!=='dashboard'&&currentPage!=='events');({dashboard:renderDashboard,events:renderEvents,posters:renderPosters,albums:renderAlbumsPage,content:renderContent,socials:renderSocials,analytics:renderAnalytics,settings:renderSettings}[currentPage])()}
async function renderDashboard(){
  const pub=events.filter(e=>e.status==='published').length,draft=events.filter(e=>e.status==='draft').length,arch=events.filter(e=>e.status==='archived').length;
  const ticketCatsCount=events.reduce((sum,e)=>sum+(e.ticket_categories?.length||0),0);
  const publishedAlbums=albums.filter(a=>a.status==='published').length;
  const upcoming=events.filter(e=>e.status==='published'&&e.starts_at&&new Date(e.starts_at).getTime()>Date.now()).sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at));
  const nearest=upcoming[0];
  $('#page').innerHTML=`<div class="stats"><div class="stat">ВСЕ СОБЫТИЯ<b>${events.length}</b></div><div class="stat">ОПУБЛИКОВАНО<b>${pub}</b></div><div class="stat">ЧЕРНОВИКИ<b>${draft}</b></div><div class="stat">АРХИВ<b>${arch}</b></div><div class="stat">АЛЬБОМЫ<b>${publishedAlbums}</b></div><div class="stat">КАТЕГОРИИ БИЛЕТОВ<b>${ticketCatsCount}</b></div></div>
  <div class="card" style="margin-top:15px" id="dashAnalyticsCard"><div class="eyebrow">АНАЛИТИКА · 7 ДНЕЙ</div><h2 style="margin:6px 0 14px">Посещаемость</h2><div class="loading">Загружаю…</div></div>
  ${nearest?`<div class="card" style="margin-top:15px"><div class="eyebrow">БЛИЖАЙШЕЕ СОБЫТИЕ</div><h2>${esc(nearest.name)}</h2><p style="color:var(--muted)">${esc(nearest.date_text)}${nearest.venue?' · '+esc(nearest.venue):''}</p></div>`:''}
  <div class="card" style="margin-top:15px"><div class="eyebrow">ПОСЛЕДНИЕ</div><h2>События</h2>${events.slice(0,5).map(row).join('')||'<div class="empty">Пока нет событий.</div>'}</div>`;

  try{
    const since=new Date(Date.now()-7*86400000).toISOString();
    const [{data:s7,error:e1},{data:ev7,error:e2}]=await Promise.all([
      sb.from('analytics_sessions').select('duration_seconds').gte('started_at',since),
      sb.from('analytics_events').select('event_name').gte('created_at',since)
    ]);
    if(e1||e2)throw (e1||e2);
    const sessions=s7||[],evs=ev7||[];
    const pageViews=evs.filter(e=>e.event_name==='page_view').length;
    const ticketClicks=evs.filter(e=>e.event_name==='ticket_click').length;
    const durations=sessions.map(s=>s.duration_seconds).filter(n=>n>0);
    const avg=durations.length?durations.reduce((a,b)=>a+b,0)/durations.length:0;
    const el=$('#dashAnalyticsCard');
    if(el)el.innerHTML=`<div class="eyebrow">АНАЛИТИКА · 7 ДНЕЙ</div><h2 style="margin:6px 0 14px">Посещаемость</h2>
      <div class="stats" style="margin-bottom:4px">
        <div class="stat">ПОСЕЩЕНИЯ<b>${sessions.length}</b></div>
        <div class="stat">ПРОСМОТРЫ<b>${pageViews}</b></div>
        <div class="stat">СРЕДНЕЕ ВРЕМЯ<b>${fmtDuration(avg)}</b></div>
        <div class="stat">КЛИКИ КУПИТЬ<b>${ticketClicks}</b></div>
      </div>
      <button class="actions" style="background:none;border:1px solid var(--line);color:var(--paper);padding:10px 16px;cursor:pointer;border-radius:999px;margin-top:8px" onclick="document.querySelector('[data-page=analytics]').click()">Подробная аналитика →</button>`;
  }catch(e){
    const el=$('#dashAnalyticsCard');
    if(el)el.innerHTML=`<div class="eyebrow">АНАЛИТИКА · 7 ДНЕЙ</div><h2 style="margin:6px 0 14px">Посещаемость</h2><p style="color:var(--muted)">Аналитика ещё не настроена — выполни migration_analytics.sql в Supabase.</p>`;
  }
}
function row(e){return `<div style="display:flex;align-items:center;gap:14px;border-top:1px solid var(--line);padding:13px 0"><img class="thumb" src="${e.poster_url||''}"><div style="flex:1"><b>${esc(e.name)}</b><div style="color:var(--muted);font-size:11px;margin-top:4px">${esc(e.date_text)} · ${esc(e.venue||'')}</div></div>${e.is_free?'<span class="pill free">Бесплатно</span>':''}<span class="pill">${e.status}</span><div class="actions"><button onclick="openEvent('${e.id}')">Изменить</button></div></div>`}
function renderEvents(){const q=(window.eventSearch||'');$('#page').innerHTML=`<div class="toolbar"><input id="search" placeholder="Поиск событий…" value="${esc(q)}"><button class="primary" onclick="openEvent()">+ Создать</button></div><div class="card" style="padding:0;overflow:auto"><table class="table"><thead><tr><th>АФИША</th><th>СОБЫТИЕ</th><th>ДАТА</th><th>СТАТУС</th><th></th></tr></thead><tbody>${events.filter(e=>!q||e.name.toLowerCase().includes(q.toLowerCase())).map(e=>`<tr><td><img class="thumb" src="${e.poster_url||''}"></td><td><b>${esc(e.name)}</b><div style="color:var(--muted);font-size:11px">${esc(e.venue||'')}</div></td><td>${esc(e.date_text)}<br>${esc(e.time_text||'')}</td><td><span class="pill">${e.status}</span></td><td><div class="actions"><button onclick="openEvent('${e.id}')">Изменить</button><button class="delete" onclick="removeEvent('${e.id}')">Удалить</button></div></td></tr>`).join('')||'<tr><td colspan="5" class="empty">Ничего не найдено.</td></tr>'}</tbody></table></div>`;$('#search').oninput=e=>{window.eventSearch=e.target.value;renderEvents()}}
function renderPosters(){$('#page').innerHTML=`<div class="poster-grid">${events.filter(e=>e.poster_url).map(e=>`<article class="poster-card"><img src="${e.poster_url}" alt=""><div class="pbody"><b>${esc(e.name)}</b><div style="color:var(--muted);margin:6px 0">${esc(e.date_text)}</div><button class="actions" onclick="openEvent('${e.id}')">Изменить афишу</button></div></article>`).join('')||'<div class="empty">Загрузите первую афишу через создание события.</div>'}</div>`}

/* ---- Контент сайта: доступ к каждому тексту главной страницы ---- */
async function renderContent(){
  const {data:c}=await sb.from('site_content').select('*').eq('id',1).single();
  const v=k=>esc(c?.[k]);
  const bgBlock=(theme,label,defColor)=>{
    const color=c?.[`bg_color_${theme}`]||defColor;
    const imgUrl=c?.[`bg_image_url_${theme}`];
    const overlay=c?.[`bg_overlay_opacity_${theme}`]??0.6;
    return `<div class="card full" style="display:flex;gap:20px;align-items:center">
    <div style="width:64px;height:64px;border-radius:14px;border:1px solid var(--line);flex:0 0 auto;background:${color};background-image:${imgUrl?`url(${imgUrl})`:'none'};background-size:cover;background-position:center" id="bgPreview_${theme}"></div>
    <div style="flex:1">
      <h3 style="margin:0 0 4px">Фон сайта — ${label}</h3>
      <p class="hint" style="margin:0 0 10px">Цвет фона применяется, когда посетитель включил «${label.toLowerCase()}» тему (переключатель в шапке). Картинка (необязательно) ляжет поверх цвета, с затемнением для читаемости текста.</p>
      <label style="display:inline-flex;align-items:center;gap:8px;margin-right:14px">Цвет<input id="cBgColor_${theme}" type="color" value="${color}" style="width:46px;height:32px;padding:0;border:1px solid var(--line);background:none"></label>
      <label class="primary" style="display:inline-flex;cursor:pointer;margin-right:8px">Загрузить картинку<input id="bgUpload_${theme}" type="file" accept="image/*" style="display:none"></label>
      <button type="button" id="bgReset_${theme}" class="actions" style="background:none;border:1px solid var(--line);color:var(--paper);padding:12px 16px;cursor:pointer">Убрать картинку</button>
      <label style="display:block;margin-top:12px">Затемнение картинки (0 — без затемнения, 1 — максимум)<input id="cBgOverlay_${theme}" type="range" min="0" max="1" step="0.05" value="${overlay}"></label>
      <div id="bgMsg_${theme}" style="color:var(--muted);font-size:12px;margin-top:4px"></div>
    </div>
  </div>`;
  };
  $('#page').innerHTML=`<form id="contentForm" class="content-grid">
  ${bgBlock('dark','Тёмная','#11100e')}
  ${bgBlock('light','Светлая','#f3efe4')}
  <div class="card full" style="display:flex;gap:20px;align-items:center">
    <div style="width:64px;height:64px;border-radius:50%;background:var(--panel2);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;overflow:hidden;flex:0 0 auto" id="logoPreview">${c?.logo_url?`<img src="${c.logo_url}" style="width:100%;height:100%;object-fit:cover">`:'<span style="font-weight:800">МЛ</span>'}</div>
    <div style="flex:1">
      <h3 style="margin:0 0 4px">Логотип-кружок (МЛ)</h3>
      <p class="hint" style="margin:0 0 10px">Используется в шапке сайта и в центре эмблемы hero. Название «МаниЛи» в шапке не меняется.</p>
      <label class="primary" style="display:inline-flex;cursor:pointer;margin-right:8px">Загрузить<input id="logoUpload" type="file" accept="image/*" style="display:none"></label>
      <button type="button" id="logoReset" class="actions" style="background:none;border:1px solid var(--line);color:var(--paper);padding:12px 16px;cursor:pointer">Сбросить на текст «МЛ»</button>
      <div id="logoMsg" style="color:var(--muted);font-size:12px;margin-top:8px"></div>
    </div>
  </div>
  <div class="card"><h3>Шапка / Hero</h3><p class="hint">Первый экран сайта.</p>
    <label>Эйбро над заголовком<input id="cHeroEyebrow" value="${v('hero_eyebrow')}"></label>
    <label>Заголовок hero<input id="cHero" value="${v('hero_title')}"></label>
    <label>Подзаголовок<input id="cSub" value="${v('hero_subtitle')}"></label>
    <label>Текст hero<textarea id="cHeroText" rows="3">${v('hero_text')}</textarea></label>
    <label>Текст кнопки<input id="cHeroBtn" value="${v('hero_button_text')}"></label>
  </div>
  <div class="card"><h3>Меню</h3><p class="hint">Пункты навигации в шапке.</p>
    <label>Пункт «События»<input id="cNavEvents" value="${v('nav_events_label')}"></label>
    <label>Пункт «О нас»<input id="cNavAbout" value="${v('nav_about_label')}"></label>
    <label>Пункт «Контакты»<input id="cNavContacts" value="${v('nav_contacts_label')}"></label>
  </div>
  <div class="card"><h3>Раздел «События»</h3>
    <label>Эйбро<input id="cEventsEyebrow" value="${v('events_eyebrow')}"></label>
    <label>Заголовок<input id="cEventsTitle" value="${v('events_title')}"></label>
    <label>Метка «ближайшее»<input id="cEventsNext" value="${v('events_next_label')}"></label>
    <label>Метка «прошло»<input id="cEventsPast" value="${v('events_past_label')}"></label>
    <label>Текст кнопки «Билеты»<input id="cTicketBtn" value="${v('ticket_button_text')}"></label>
    <label>Текст загрузки<input id="cEventsLoading" value="${v('events_loading_text')}"></label>
    <label>Текст «событий пока нет»<input id="cEventsEmpty" value="${v('events_empty_text')}"></label>
    <label>Текст ошибки загрузки<input id="cEventsError" value="${v('events_error_text')}"></label>
    <p class="hint">Формат афиш в карусели единый — вертикальная капсула 9:16. Загружай постеры этого формата на странице события, чтобы фото заливало карточку без обрезки и искажений.</p>
  </div>
  <div class="card"><h3>Раздел «Галерея»</h3><p class="hint">Сами фото загружаются в разделе «Галерея» слева.</p>
    <label>Пункт меню<input id="cNavGallery" value="${v('nav_gallery_label')}"></label>
  </div>
  <div class="card"><h3>О нас / Манифест</h3>
    <label>Эйбро<input id="cAboutEyebrow" value="${v('about_eyebrow')}"></label>
    <label>Заголовок о нас<input id="cAboutTitle" value="${v('about_title')}"></label>
    <label>Текст о нас<textarea id="cAboutText" rows="3">${v('about_text')}</textarea></label>
    <label>Строки манифеста (каждая с новой строки)<textarea id="cManifestLine" rows="3">${v('manifest_line')}</textarea></label>
  </div>
  <div class="card"><h3>Контакты</h3><p class="hint">Соцсети (Telegram, WhatsApp и т.д.) редактируются в разделе «Соцсети».</p>
    <label>Эйбро<input id="cContactEyebrow" value="${v('contact_eyebrow')}"></label>
    <label>Заголовок<input id="cContactTitle" value="${v('contact_title')}"></label>
    <label>Email<input id="cEmail" type="email" value="${v('contact_email')}"></label>
  </div>
  <div class="card"><h3>Футер</h3>
    <label>Текст слева<input id="cFooterLeft" value="${v('footer_left')}"></label>
    <label>Текст справа<input id="cFooterRight" value="${v('footer_right')}"></label>
  </div>
  <div class="card full"><h3>Страница «Конфиденциальность»</h3>
    <p class="hint">Пустая абзацная строка (двойной перенос строки) — начало нового абзаца. Если оставить поле пустым, на сайте останется текст-заглушка по умолчанию.</p>
    <textarea id="cPrivacyContent" rows="10" placeholder="Свой текст политики конфиденциальности…">${v('privacy_content')}</textarea>
  </div>
  <div class="card full"><h3>Страница «Условия использования»</h3>
    <p class="hint">Пустая абзацная строка — начало нового абзаца. Пусто = текст-заглушка по умолчанию.</p>
    <textarea id="cTermsContent" rows="10" placeholder="Свой текст условий использования…">${v('terms_content')}</textarea>
  </div>
  <div class="card full"><button class="primary">Сохранить контент</button><span id="contentMsg"></span></div>
  </form>`;
  $('#contentForm').onsubmit=async e=>{
    e.preventDefault();
    const {error}=await sb.from('site_content').update({
      hero_eyebrow:$('#cHeroEyebrow').value,hero_title:$('#cHero').value,hero_subtitle:$('#cSub').value,hero_text:$('#cHeroText').value,hero_button_text:$('#cHeroBtn').value,
      nav_events_label:$('#cNavEvents').value,nav_about_label:$('#cNavAbout').value,nav_contacts_label:$('#cNavContacts').value,
      events_eyebrow:$('#cEventsEyebrow').value,events_title:$('#cEventsTitle').value,events_next_label:$('#cEventsNext').value,events_past_label:$('#cEventsPast').value,ticket_button_text:$('#cTicketBtn').value,events_loading_text:$('#cEventsLoading').value,events_empty_text:$('#cEventsEmpty').value,events_error_text:$('#cEventsError').value,
      nav_gallery_label:$('#cNavGallery').value,
      about_eyebrow:$('#cAboutEyebrow').value,about_title:$('#cAboutTitle').value,about_text:$('#cAboutText').value,manifest_line:$('#cManifestLine').value,
      contact_eyebrow:$('#cContactEyebrow').value,contact_title:$('#cContactTitle').value,contact_email:$('#cEmail').value,
      footer_left:$('#cFooterLeft').value,footer_right:$('#cFooterRight').value,
      bg_color_dark:$('#cBgColor_dark').value,bg_overlay_opacity_dark:parseFloat($('#cBgOverlay_dark').value)||0.6,
      bg_color_light:$('#cBgColor_light').value,bg_overlay_opacity_light:parseFloat($('#cBgOverlay_light').value)||0.6,
      privacy_content:$('#cPrivacyContent').value,terms_content:$('#cTermsContent').value
    }).eq('id',1);
    $('#contentMsg').textContent=error?error.message:' Сохранено ✓'
  }
  $('#logoUpload').onchange=async e=>{
    const file=e.target.files[0];if(!file)return;
    const err=validateFile(file,'image');if(err){$('#logoMsg').textContent=err;e.target.value='';return}
    $('#logoMsg').textContent='Загружаю…';
    const ext=file.name.split('.').pop().toLowerCase();
    const path=`brand-${crypto.randomUUID()}.${ext}`;
    const up=await sb.storage.from('posters').upload(path,file,{upsert:false});
    if(up.error){$('#logoMsg').textContent=up.error.message;return}
    const url=sb.storage.from('posters').getPublicUrl(path).data.publicUrl;
    const {error}=await sb.from('site_content').update({logo_url:url,logo_path:path}).eq('id',1);
    $('#logoMsg').textContent=error?error.message:'';
    await renderContent()
  };
  $('#logoReset').onclick=async()=>{
    if(!confirm('Вернуть стандартный текст «МЛ» вместо картинки?'))return;
    const old=c?.logo_path;
    const {error}=await sb.from('site_content').update({logo_url:null,logo_path:null}).eq('id',1);
    if(error){alert(error.message);return}
    if(old)await sb.storage.from('posters').remove([old]);
    await renderContent()
  };
  ['dark','light'].forEach(theme=>{
    $(`#bgUpload_${theme}`).onchange=async e=>{
      const file=e.target.files[0];if(!file)return;
      const err=validateFile(file,'image');if(err){$(`#bgMsg_${theme}`).textContent=err;e.target.value='';return}
      $(`#bgMsg_${theme}`).textContent='Загружаю…';
      const ext=file.name.split('.').pop().toLowerCase();
      const path=`bg-${theme}-${crypto.randomUUID()}.${ext}`;
      const up=await sb.storage.from('posters').upload(path,file,{upsert:false});
      if(up.error){$(`#bgMsg_${theme}`).textContent=up.error.message;return}
      const url=sb.storage.from('posters').getPublicUrl(path).data.publicUrl;
      const {error}=await sb.from('site_content').update({[`bg_image_url_${theme}`]:url,[`bg_image_path_${theme}`]:path}).eq('id',1);
      $(`#bgMsg_${theme}`).textContent=error?error.message:'';
      await renderContent()
    };
    $(`#bgReset_${theme}`).onclick=async()=>{
      if(!confirm('Убрать фоновую картинку и оставить только цвет?'))return;
      const old=c?.[`bg_image_path_${theme}`];
      const {error}=await sb.from('site_content').update({[`bg_image_url_${theme}`]:null,[`bg_image_path_${theme}`]:null}).eq('id',1);
      if(error){alert(error.message);return}
      if(old)await sb.storage.from('posters').remove([old]);
      await renderContent()
    };
  });
}

/* ---- Соцсети: неограниченный список ссылок (телеграм, ватсап, вк и т.д.) ---- */
function renderSocials(){
  $('#page').innerHTML=`<div class="toolbar"><div class="eyebrow">ССЫЛКИ КОНТАКТОВ</div><button class="primary" id="addSocial">+ Добавить соцсеть</button></div>
  <div class="card">
  <div class="social-row" style="border-top:0;color:var(--muted);font-size:10px;letter-spacing:1px;padding-top:0">
    <div>ИКОНКА</div><div>НАЗВАНИЕ</div><div>ССЫЛКА</div><div>ПОРЯДОК</div><div>ПОКАЗ</div><div></div>
  </div>
  ${socials.map(s=>socialRow(s)).join('')||'<div class="empty">Пока нет ни одной соцсети. Нажми «Добавить соцсеть».</div>'}
  </div>`;
  $('#addSocial').onclick=async()=>{
    const {error}=await sb.from('social_links').insert({platform:'telegram',label:'Telegram',url:'https://t.me/',sort_order:socials.length,visible:true});
    if(error){alert(error.message);return}
    await loadSocials();render()
  };
  socials.forEach(s=>bindSocialRow(s.id));
}
function socialRow(s){
  const opts=PLATFORMS.map(([k,l])=>`<option value="${k}" ${s.platform===k?'selected':''}>${l}</option>`).join('');
  return `<div class="social-row" data-id="${s.id}">
    <span><span class="icon-preview" data-preview>${window.manili_icon(s.platform)}</span><select data-f="platform">${opts}</select></span>
    <input data-f="label" value="${esc(s.label)}" placeholder="Название">
    <input data-f="url" value="${esc(s.url)}" placeholder="https://...">
    <input data-f="sort_order" type="number" value="${s.sort_order}">
    <label class="check"><input type="checkbox" data-f="visible" ${s.visible?'checked':''}> видно</label>
    <div class="actions"><button data-act="save">Сохранить</button><button class="delete" data-act="del">Удалить</button></div>
  </div>`
}
function bindSocialRow(id){
  const rowEl=document.querySelector(`.social-row[data-id="${id}"]`);if(!rowEl)return;
  const platformSel=rowEl.querySelector('[data-f="platform"]');
  const preview=rowEl.querySelector('[data-preview]');
  platformSel.onchange=()=>{preview.innerHTML=window.manili_icon(platformSel.value)};
  rowEl.querySelector('[data-act="save"]').onclick=async()=>{
    const payload={
      platform:rowEl.querySelector('[data-f="platform"]').value,
      label:rowEl.querySelector('[data-f="label"]').value,
      url:rowEl.querySelector('[data-f="url"]').value,
      sort_order:parseInt(rowEl.querySelector('[data-f="sort_order"]').value)||0,
      visible:rowEl.querySelector('[data-f="visible"]').checked
    };
    const {error}=await sb.from('social_links').update(payload).eq('id',id);
    if(error){alert(error.message);return}
    await loadSocials();render()
  };
  rowEl.querySelector('[data-act="del"]').onclick=async()=>{
    if(!confirm('Удалить эту соцсеть?'))return;
    const {error}=await sb.from('social_links').delete().eq('id',id);
    if(error){alert(error.message);return}
    await loadSocials();render()
  };
}

/* ---- Аналитика (ТЗ раздел 11-23): собственные данные из analytics_events/analytics_sessions ---- */
window.analyticsPeriod=window.analyticsPeriod||'7d';
const ANALYTICS_PERIODS=[['today','Сегодня'],['7d','7 дней'],['30d','30 дней'],['90d','90 дней'],['all','Всё время']];
function periodStart(period){
  const d=new Date();
  if(period==='today'){d.setHours(0,0,0,0);return d}
  if(period==='7d')return new Date(Date.now()-7*86400000);
  if(period==='30d')return new Date(Date.now()-30*86400000);
  if(period==='90d')return new Date(Date.now()-90*86400000);
  return null; // 'all'
}
function fmtDuration(sec){
  if(!sec||!isFinite(sec))return '—';
  const m=Math.floor(sec/60),s=Math.round(sec%60);
  return `${m}:${String(s).padStart(2,'0')}`;
}
function dayKey(d){return new Date(d).toISOString().slice(0,10)}
function dayLabel(key){const d=new Date(key+'T00:00:00');return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}`}

async function renderAnalytics(){
  const period=window.analyticsPeriod;
  const since=periodStart(period);
  $('#page').innerHTML=`<div class="toolbar" style="margin-bottom:20px">
    <div style="display:flex;gap:6px;flex-wrap:wrap">${ANALYTICS_PERIODS.map(([k,label])=>`<button class="pill-btn${k===period?' is-active':''}" data-period="${k}">${label}</button>`).join('')}</div>
  </div><div id="analyticsBody"><div class="empty">Загружаю аналитику…</div></div>`;
  document.querySelectorAll('.pill-btn').forEach(b=>b.onclick=()=>{window.analyticsPeriod=b.dataset.period;renderAnalytics()});

  let sessions=[],ev=[];
  try{
    let sq=sb.from('analytics_sessions').select('*').order('started_at',{ascending:true});
    if(since)sq=sq.gte('started_at',since.toISOString());
    const {data:sData,error:sErr}=await sq;
    if(sErr)throw sErr;
    sessions=sData||[];
    let eq=sb.from('analytics_events').select('*').order('created_at',{ascending:true});
    if(since)eq=eq.gte('created_at',since.toISOString());
    const {data:eData,error:eErr}=await eq;
    if(eErr)throw eErr;
    ev=eData||[];
  }catch(e){
    $('#analyticsBody').innerHTML=`<div class="card"><h2>Не удалось загрузить аналитику</h2><p style="color:var(--muted)">${esc(e.message||'Проверь, что миграция migration_analytics.sql выполнена в Supabase.')}</p></div>`;
    return;
  }

  const totalSessions=sessions.length;
  const totalPageViews=ev.filter(e=>e.event_name==='page_view').length;
  const durations=sessions.map(s=>s.duration_seconds).filter(n=>n>0);
  const avgDuration=durations.length?durations.reduce((a,b)=>a+b,0)/durations.length:0;
  const clickEvents=ev.filter(e=>['button_click','poster_click','ticket_click','social_click','share_click','download_click'].includes(e.event_name));
  const ticketClicks=ev.filter(e=>e.event_name==='ticket_click').length;
  const posterClicks=ev.filter(e=>e.event_name==='poster_click').length;
  const albumViews=ev.filter(e=>e.event_name==='album_view').length;
  const eventViews=ev.filter(e=>e.event_name==='event_view').length;

  /* ---- График посещений по дням ---- */
  const dayMap={};
  sessions.forEach(s=>{const k=dayKey(s.started_at);dayMap[k]=(dayMap[k]||0)+1});
  let days=Object.keys(dayMap).sort();
  if(!days.length){
    // Пустой период — всё равно рисуем сетку дней, чтобы график не был "сломанным"
    const span=period==='today'?1:period==='30d'?30:period==='90d'?90:7;
    days=[...Array(span)].map((_,i)=>dayKey(Date.now()-(span-1-i)*86400000));
  }
  const maxDay=Math.max(1,...days.map(d=>dayMap[d]||0));
  const peakDay=days.reduce((best,d)=>(dayMap[d]||0)>(dayMap[best]||0)?d:best,days[0]);
  const chartW=760,chartH=180,barGap=Math.min(14,chartW/days.length*0.3),barW=Math.max(4,chartW/days.length-barGap);
  const bars=days.map((d,i)=>{
    const val=dayMap[d]||0;
    const h=Math.max(3,(val/maxDay)*(chartH-24));
    const x=i*(chartW/days.length)+ (chartW/days.length-barW)/2;
    const y=chartH-h;
    const isPeak=d===peakDay&&val>0;
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(7,barW/2).toFixed(1)}" fill="${isPeak?'var(--accent1)':'var(--accent3)'}"><title>${dayLabel(d)}: ${val}</title></rect>`;
  }).join('');
  const showEveryNth=Math.ceil(days.length/7)||1;
  const labels=days.map((d,i)=>i%showEveryNth===0?`<text x="${(i*(chartW/days.length)+chartW/days.length/2).toFixed(1)}" y="${chartH+18}" font-size="10" fill="var(--muted)" text-anchor="middle">${dayLabel(d)}</text>`:'').join('');

  /* ---- Топ кнопок ---- */
  const buttonCounts={};
  clickEvents.forEach(e=>{
    const label=e.element_label||e.event_name;
    buttonCounts[label]=(buttonCounts[label]||0)+1;
  });
  const topButtons=Object.entries(buttonCounts).sort((a,b)=>b[1]-a[1]).slice(0,8);

  /* ---- Афиши: просмотры / клики / переходы на событие / купить ---- */
  const perEvent={};
  ev.forEach(e=>{
    if(!e.event_id)return;
    if(!['poster_click','event_view','ticket_click'].includes(e.event_name))return;
    perEvent[e.event_id]=perEvent[e.event_id]||{poster_click:0,event_view:0,ticket_click:0};
    perEvent[e.event_id][e.event_name]++;
  });
  const eventRows=Object.entries(perEvent).map(([id,c])=>{
    const meta=events.find(x=>x.id===id);
    const ctr=c.event_view>0?((c.ticket_click/c.event_view)*100).toFixed(1)+'%':'—';
    return {id,name:meta?meta.name:'(удалено)',poster:meta?meta.poster_url:'',...c,ctr};
  }).sort((a,b)=>b.event_view-a.event_view);

  /* ---- Устройства ---- */
  const deviceCounts={mobile:0,tablet:0,desktop:0};
  sessions.forEach(s=>{if(s.device_type&&deviceCounts[s.device_type]!=null)deviceCounts[s.device_type]++});
  const deviceTotal=Math.max(1,deviceCounts.mobile+deviceCounts.tablet+deviceCounts.desktop);
  const deviceRow=(label,count,color)=>`<div class="device-row"><span class="device-label">${label}</span><div class="device-bar"><div style="width:${(count/deviceTotal*100).toFixed(0)}%;background:${color}"></div></div><span class="device-pct">${count?Math.round(count/deviceTotal*100):0}%</span></div>`;

  $('#analyticsBody').innerHTML=`
  <div class="stats">
    <div class="stat">ПОСЕЩЕНИЯ<b>${totalSessions}</b></div>
    <div class="stat">ПРОСМОТРЫ СТРАНИЦ<b>${totalPageViews}</b></div>
    <div class="stat">СРЕДНЕЕ ВРЕМЯ<b>${fmtDuration(avgDuration)}</b></div>
    <div class="stat">ВСЕГО КЛИКОВ<b>${clickEvents.length}</b></div>
    <div class="stat">КЛИКИ КУПИТЬ<b>${ticketClicks}</b></div>
    <div class="stat">КЛИКИ ПО АФИШАМ<b>${posterClicks}</b></div>
    <div class="stat">ПРОСМОТРЫ АЛЬБОМОВ<b>${albumViews}</b></div>
  </div>

  <div class="card" style="margin-top:16px">
    <div class="eyebrow">ПОСЕЩАЕМОСТЬ</div><h2 style="margin:6px 0 16px">Сессии по дням</h2>
    <svg viewBox="0 0 ${chartW} ${chartH+30}" style="width:100%;height:auto;min-width:0;display:block">${bars}${labels}</svg>
  </div>

  <div class="card" style="margin-top:16px">
    <div class="eyebrow">УСТРОЙСТВА</div><h2 style="margin:6px 0 16px">Разбивка по устройствам</h2>
    ${deviceRow('Mobile',deviceCounts.mobile,'var(--accent1)')}
    ${deviceRow('Tablet',deviceCounts.tablet,'var(--accent2)')}
    ${deviceRow('Desktop',deviceCounts.desktop,'var(--accent3)')}
  </div>

  <div class="card" style="margin-top:16px;overflow:auto">
    <div class="eyebrow">АФИШИ</div><h2 style="margin:6px 0 16px">Просмотры и клики по событиям</h2>
    <table class="table"><thead><tr><th>Афиша</th><th>Клики по афише</th><th>Просмотры события</th><th>Клики «Купить»</th><th>CTR</th></tr></thead>
    <tbody>${eventRows.map(r=>`<tr><td style="display:flex;align-items:center;gap:10px"><img class="thumb" src="${r.poster||''}" style="width:32px;height:42px">${esc(r.name)}</td><td>${r.poster_click||0}</td><td>${r.event_view||0}</td><td>${r.ticket_click||0}</td><td>${r.ctr}</td></tr>`).join('')||'<tr><td colspan="5" class="empty">Пока нет данных за этот период.</td></tr>'}</tbody></table>
  </div>

  <div class="card" style="margin-top:16px">
    <div class="eyebrow">САМЫЕ КЛИКАБЕЛЬНЫЕ</div><h2 style="margin:6px 0 16px">Топ кнопок и ссылок</h2>
    ${topButtons.length?`<table class="table"><thead><tr><th>Элемент</th><th>Клики</th></tr></thead><tbody>${topButtons.map(([label,c])=>`<tr><td>${esc(label)}</td><td>${c}</td></tr>`).join('')}</tbody></table>`:'<div class="empty">Пока нет кликов за этот период.</div>'}
  </div>
  `;
}

function renderSettings(){$('#page').innerHTML=`<div class="card"><h2>Настройки</h2><p style="color:var(--muted);line-height:1.7">Админка защищена Supabase Auth и Row Level Security. Публикация события автоматически делает его видимым на публичном сайте.</p><p style="color:var(--muted)">Чтобы сменить пароль, используй восстановление/настройки пользователя в Supabase.</p></div>`}

function openEvent(id){
  const e=events.find(x=>x.id===id);
  $('#modal').classList.remove('hidden');$('#modalTitle').textContent=e?'Изменить событие':'Новое событие';
  $('#eventId').value=e?.id||'';
  $('#fName').value=e?.name||'';$('#fSlug').value=e?.slug&&e.slug!==e.id?e.slug:'';
  $('#fDate').value=e?.date_text||'';$('#fTime').value=e?.time_text||'';
  $('#fStartsAt').value=e?.starts_at?toLocalInput(e.starts_at):'';
  $('#fCity').value=e?.city||'';$('#fVenue').value=e?.venue||'';
  $('#fStatus').value=e?.status||'draft';$('#fTicketStatus').value=e?.ticket_status||'coming_soon';
  $('#fFree').checked=!!e?.is_free;
  $('#fDesc').value=e?.description||'';$('#fTicket').value=e?.ticket_url||'';
  editingPoster=e?.poster_url||null;$('#posterPreview').innerHTML=editingPoster?`<img src="${editingPoster}" style="width:112px;aspect-ratio:9/16;object-fit:cover;border-radius:999px;margin-bottom:15px">`:'';
  editingPromo=e?.promo_video_url||null;$('#promoPreview').innerHTML=editingPromo?`<video src="${editingPromo}" style="width:180px;max-height:120px;object-fit:cover;margin-bottom:10px" muted controls preload="metadata"></video>`:'';
  $('#fPromoPublished').checked=!!e?.promo_published;
  renderTicketCatsBlock(e?.id||null);
}
function toLocalInput(iso){const d=new Date(iso);const pad=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`}
function closeModal(){$('#modal').classList.add('hidden');$('#formError').textContent='';editingPoster=null;editingPromo=null;$('#ticketCatsBlock').innerHTML=''}
$('#eventForm').onsubmit=async e=>{
  e.preventDefault();$('#formError').textContent='';
  const id=$('#eventId').value;
  const existing=events.find(x=>x.id===id);
  let posterUrl=editingPoster,posterPath=existing?.poster_path||null;
  const file=$('#fPoster').files[0];
  if(file){const err=validateFile(file,'image');if(err){$('#formError').textContent=err;return}const ext=file.name.split('.').pop().toLowerCase();const path=`${crypto.randomUUID()}.${ext}`;const up=await sb.storage.from('posters').upload(path,file,{upsert:false});if(up.error){$('#formError').textContent=up.error.message;return}posterPath=path;posterUrl=sb.storage.from('posters').getPublicUrl(path).data.publicUrl}
  let promoUrl=editingPromo,promoPath=existing?.promo_video_path||null;
  const promoFile=$('#fPromoVideo').files[0];
  if(promoFile){const err=validateFile(promoFile,'video');if(err){$('#formError').textContent=err;return}const ext=promoFile.name.split('.').pop().toLowerCase();const path=`promo-${crypto.randomUUID()}.${ext}`;const up=await sb.storage.from('posters').upload(path,promoFile,{upsert:false});if(up.error){$('#formError').textContent=up.error.message;return}promoPath=path;promoUrl=sb.storage.from('posters').getPublicUrl(path).data.publicUrl}
  let slug=slugify($('#fSlug').value)||(existing?existing.slug:'')||`${slugify($('#fName').value)}-${Math.random().toString(36).slice(2,6)}`;
  const startsAtVal=$('#fStartsAt').value;
  const payload={
    name:$('#fName').value,slug,date_text:$('#fDate').value,time_text:$('#fTime').value,
    starts_at:startsAtVal?new Date(startsAtVal).toISOString():null,
    city:$('#fCity').value||null,venue:$('#fVenue').value,
    status:$('#fStatus').value,ticket_status:$('#fTicketStatus').value,is_free:$('#fFree').checked,
    description:$('#fDesc').value,ticket_url:$('#fTicket').value||null,
    poster_url:posterUrl,poster_path:posterPath,
    promo_video_url:promoUrl,promo_video_path:promoPath,promo_published:$('#fPromoPublished').checked
  };
  const r=id?await sb.from('events').update(payload).eq('id',id).select().single():await sb.from('events').insert(payload).select().single();
  if(r.error){$('#formError').textContent=r.error.message;return}
  await loadEvents();
  if(!id){$('#eventId').value=r.data.id;$('#modalTitle').textContent='Изменить событие';renderTicketCatsBlock(r.data.id);render();return}
  closeModal();render()
};
async function removeEvent(id){if(!confirm('Удалить событие?'))return;const e=events.find(x=>x.id===id);const r=await sb.from('events').delete().eq('id',id);if(!r.error&&e?.poster_path)await sb.storage.from('posters').remove([e.poster_path]);await loadEvents();render()};function slugify(s){return (s||'').toLowerCase().trim().replace(/[^a-zа-я0-9]+/gi,'-').replace(/^-|-$/g,'')}
window.openEvent=openEvent;window.removeEvent=removeEvent;

/* ---- Категории билетов внутри карточки события ---- */
function renderTicketCatsBlock(eventId){
  const block=$('#ticketCatsBlock');
  if(!eventId){block.innerHTML=`<p class="hint" style="margin-top:16px">Сохрани событие, чтобы добавить категории билетов (обычный, VIP и т.д.).</p>`;return}
  const ev=events.find(x=>x.id===eventId);
  const cats=(ev?.ticket_categories||[]).slice().sort((a,b)=>a.sort_order-b.sort_order);
  block.innerHTML=`<div style="margin-top:22px;border-top:1px solid var(--line);padding-top:18px">
    <div class="toolbar" style="margin-bottom:10px"><h3 style="margin:0">Категории билетов</h3><button type="button" class="primary" id="addTicketCat">+ Категория</button></div>
    ${cats.map(t=>ticketCatRow(t)).join('')||'<p class="hint">Категорий нет — можно оставить общую ссылку на билеты выше, либо добавить категории (напр. "Обычный", "VIP").</p>'}
  </div>`;
  $('#addTicketCat').onclick=async()=>{
    const {error}=await sb.from('ticket_categories').insert({event_id:eventId,name:'Билет',currency:'₽',status:'on_sale',sort_order:cats.length});
    if(error){alert(error.message);return}
    await loadEvents();renderTicketCatsBlock(eventId)
  };
  cats.forEach(t=>bindTicketCatRow(t.id,eventId));
}
function ticketCatRow(t){
  const opts=TICKET_STATUSES.map(([k,l])=>`<option value="${k}" ${t.status===k?'selected':''}>${l}</option>`).join('');
  return `<div class="social-row" data-id="${t.id}" style="grid-template-columns:1.2fr .7fr .6fr 1.1fr 1.3fr auto">
    <input data-f="name" value="${esc(t.name)}" placeholder="Название">
    <input data-f="price" type="number" step="0.01" value="${t.price??''}" placeholder="Цена">
    <input data-f="currency" value="${esc(t.currency||'₽')}" placeholder="₽" style="width:100%">
    <select data-f="status">${opts}</select>
    <input data-f="ticket_url" value="${esc(t.ticket_url||'')}" placeholder="Ссылка на покупку (необязательно)">
    <div class="actions"><button data-act="save">Сохранить</button><button class="delete" data-act="del">Удалить</button></div>
  </div>`
}
function bindTicketCatRow(id,eventId){
  const el=document.querySelector(`.social-row[data-id="${id}"]`);if(!el)return;
  el.querySelector('[data-act="save"]').onclick=async()=>{
    const payload={
      name:el.querySelector('[data-f="name"]').value,
      price:el.querySelector('[data-f="price"]').value?parseFloat(el.querySelector('[data-f="price"]').value):null,
      currency:el.querySelector('[data-f="currency"]').value||'₽',
      status:el.querySelector('[data-f="status"]').value,
      ticket_url:el.querySelector('[data-f="ticket_url"]').value||null
    };
    const {error}=await sb.from('ticket_categories').update(payload).eq('id',id);
    if(error){alert(error.message);return}
    await loadEvents();renderTicketCatsBlock(eventId)
  };
  el.querySelector('[data-act="del"]').onclick=async()=>{
    if(!confirm('Удалить эту категорию билетов?'))return;
    const {error}=await sb.from('ticket_categories').delete().eq('id',id);
    if(error){alert(error.message);return}
    await loadEvents();renderTicketCatsBlock(eventId)
  };
}

/* ---- Альбомы: фото + видео, обложка, порядок, публикация ---- */
function renderAlbumsPage(){
  if(editingAlbumId){renderAlbumEditor(editingAlbumId);return}
  if(window.albumsLoadError){$('#page').innerHTML=`<div class="card"><h2>Раздел «Альбомы» пока недоступен</h2><p style="color:var(--muted);line-height:1.7">База данных ещё не обновлена под этот раздел. Выполни файл <b>migration_all.sql</b> целиком в Supabase → SQL Editor, затем обнови эту страницу.</p><p style="color:var(--muted);font-size:12px">Техническая ошибка: ${esc(window.albumsLoadError)}</p></div>`;return}
  $('#page').innerHTML=`<div class="toolbar"><div class="eyebrow">МЕДИА</div><button class="primary" id="addAlbum">+ Создать альбом</button></div>
  <div class="poster-grid">${albums.map(a=>albumCard(a)).join('')||'<div class="empty">Пока нет альбомов. Создай первый.</div>'}</div>`;
  $('#addAlbum').onclick=async()=>{
    const {data,error}=await sb.from('albums').insert({title:'Новый альбом',status:'draft',sort_order:albums.length}).select().single();
    if(error){alert(error.message);return}
    await loadAlbums();editingAlbumId=data.id;render()
  };
  albums.forEach(a=>{
    const openBtn=document.querySelector(`[data-open-album="${a.id}"]`);
    if(openBtn)openBtn.onclick=()=>{editingAlbumId=a.id;render()};
    const delBtn=document.querySelector(`[data-del-album="${a.id}"]`);
    if(delBtn)delBtn.onclick=async()=>{
      if(!confirm('Удалить альбом вместе со всеми фото и видео?'))return;
      const paths=(a.album_media||[]).map(m=>m.path).filter(Boolean);
      await sb.from('albums').delete().eq('id',a.id);
      if(paths.length)await sb.storage.from('gallery').remove(paths);
      await loadAlbums();render()
    };
  });
}
function albumCard(a){
  const media=(a.album_media||[]).slice().sort((x,y)=>x.sort_order-y.sort_order);
  const cover=media.find(m=>m.id===a.cover_media_id)||media[0];
  const photos=media.filter(m=>m.type==='image').length,videos=media.filter(m=>m.type==='video').length;
  return `<article class="poster-card">
    ${cover?(cover.type==='video'?`<video src="${cover.url}" muted preload="metadata"></video>`:`<img src="${cover.url}" alt="">`):'<div class="thumb" style="width:100%;height:140px"></div>'}
    <div class="pbody">
      <b>${esc(a.title)}</b>
      <div style="color:var(--muted);margin:6px 0;font-size:12px">${photos} фото · ${videos} видео · <span class="pill">${a.status==='published'?'опубликован':'черновик'}</span></div>
      <div class="actions"><button data-open-album="${a.id}">Редактировать</button><button class="delete" data-del-album="${a.id}">Удалить</button></div>
    </div>
  </article>`
}
function renderAlbumEditor(id){
  const a=albums.find(x=>x.id===id);
  if(!a){editingAlbumId=null;renderAlbumsPage();return}
  const media=(a.album_media||[]).slice().sort((x,y)=>x.sort_order-y.sort_order);
  $('#page').innerHTML=`
  <button class="actions" id="backToAlbums" style="margin-bottom:16px">← Все альбомы</button>
  <div class="card">
    <label>Название альбома<input id="albTitle" value="${esc(a.title)}"></label>
    <label>Описание<textarea id="albDesc" rows="2">${esc(a.description)}</textarea></label>
    <label>Связать с событием (необязательно)<select id="albEvent"><option value="">— не выбрано —</option>${events.map(e=>`<option value="${e.id}" ${a.event_id===e.id?'selected':''}>${esc(e.name)}</option>`).join('')}</select></label>
    <label class="check"><input type="checkbox" id="albPublished" ${a.status==='published'?'checked':''}> альбом опубликован</label>
    <button class="primary" id="albSave" style="margin-top:12px">Сохранить альбом</button> <span id="albMsg" style="color:var(--muted);font-size:12px"></span>
  </div>
  <div class="card" style="margin-top:15px">
    <div class="toolbar"><h3 style="margin:0">Медиа (фото и видео)</h3><label class="primary" style="cursor:pointer;display:inline-flex">+ Загрузить<input id="mediaUpload" type="file" accept="image/*,video/*" multiple style="display:none"></label></div>
    <div id="mediaUploadMsg" style="color:var(--muted);font-size:12px;margin-bottom:10px"></div>
    <div class="poster-grid">${media.map(m=>mediaCard(m,a)).join('')||'<div class="empty">Загрузи первые фото/видео этого альбома.</div>'}</div>
  </div>`;
  $('#backToAlbums').onclick=()=>{editingAlbumId=null;render()};
  $('#albSave').onclick=async()=>{
    const {error}=await sb.from('albums').update({
      title:$('#albTitle').value,description:$('#albDesc').value,
      event_id:$('#albEvent').value||null,status:$('#albPublished').checked?'published':'draft'
    }).eq('id',id);
    $('#albMsg').textContent=error?error.message:'Сохранено ✓';
    await loadAlbums()
  };
  $('#mediaUpload').onchange=async e=>{
    const files=[...e.target.files];if(!files.length)return;
    const badFiles=files.map(f=>validateFile(f,'media')).filter(Boolean);
    if(badFiles.length){$('#mediaUploadMsg').textContent=badFiles[0];return}
    $('#mediaUploadMsg').textContent=`Загружаю ${files.length} файл(ов)…`;
    let order=media.length;
    for(const file of files){
      const type=file.type.startsWith('video')?'video':'image';
      const ext=file.name.split('.').pop().toLowerCase();
      const path=`album-${id}-${crypto.randomUUID()}.${ext}`;
      const up=await sb.storage.from('gallery').upload(path,file,{upsert:false});
      if(up.error){$('#mediaUploadMsg').textContent=up.error.message;continue}
      const url=sb.storage.from('gallery').getPublicUrl(path).data.publicUrl;
      await sb.from('album_media').insert({album_id:id,type,url,path,sort_order:order++});
    }
    $('#mediaUploadMsg').textContent='';
    await loadAlbums();renderAlbumEditor(id)
  };
  media.forEach(m=>bindMediaCard(m.id,id));
}
function mediaCard(m,a){
  const isCover=a.cover_media_id===m.id;
  return `<article class="poster-card" data-media="${m.id}">
    ${m.type==='video'?`<video src="${m.url}" muted controls preload="metadata"></video>`:`<img src="${m.url}" alt="">`}
    <div class="pbody">
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px"><input data-f="sort_order" type="number" value="${m.sort_order}" style="width:70px"> ${isCover?'<span class="pill">обложка</span>':''}</div>
      <div class="actions"><button data-act="cover">Сделать обложкой</button><button data-act="save">Порядок</button><button class="delete" data-act="del">Удалить</button></div>
    </div>
  </article>`
}
function bindMediaCard(mediaId,albumId){
  const el=document.querySelector(`[data-media="${mediaId}"]`);if(!el)return;
  el.querySelector('[data-act="cover"]').onclick=async()=>{
    const {error}=await sb.from('albums').update({cover_media_id:mediaId}).eq('id',albumId);
    if(error){alert(error.message);return}
    await loadAlbums();renderAlbumEditor(albumId)
  };
  el.querySelector('[data-act="save"]').onclick=async()=>{
    const sort_order=parseInt(el.querySelector('[data-f="sort_order"]').value)||0;
    const {error}=await sb.from('album_media').update({sort_order}).eq('id',mediaId);
    if(error){alert(error.message);return}
    await loadAlbums();renderAlbumEditor(albumId)
  };
  el.querySelector('[data-act="del"]').onclick=async()=>{
    if(!confirm('Удалить этот файл?'))return;
    const a=albums.find(x=>x.id===albumId);
    const m=(a?.album_media||[]).find(x=>x.id===mediaId);
    const {error}=await sb.from('album_media').delete().eq('id',mediaId);
    if(error){alert(error.message);return}
    if(m?.path)await sb.storage.from('gallery').remove([m.path]);
    await loadAlbums();renderAlbumEditor(albumId)
  };
}

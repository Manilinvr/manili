function setText(id,val){if(val==null)return;const el=document.getElementById(id);if(el)el.textContent=val}
function escapeHtml(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function renderState(root,text){root.innerHTML=`<div class="section" style="text-align:center"><p class="loading">${escapeHtml(text)}</p></div>`}

function applyAlbumSeo(album){
  try{
    const cfg=window.MANILI_CONFIG||{};
    const siteUrl=(cfg.SITE_URL||'').replace(/\/$/,'');
    const title=`${album.title} — МаниЛи EVENT`;
    const desc=(album.description||'').slice(0,200)||`Фото и видео альбома «${album.title}» — МаниЛи EVENT.`;
    document.title=title;
    const setMeta=(sel,attr,val)=>{const el=document.querySelector(sel);if(el&&val)el.setAttribute(attr,val)};
    setMeta('meta[name="description"]','content',desc);
    setMeta('meta[property="og:title"]','content',title);
    setMeta('meta[property="og:description"]','content',desc);
    if(siteUrl){
      const canonicalHref=`${siteUrl}/album.html?id=${encodeURIComponent(album.id)}`;
      setMeta('link[rel="canonical"]','href',canonicalHref);
      setMeta('meta[property="og:url"]','content',canonicalHref);
    }
  }catch(e){/* SEO — best effort */}
}

(async()=>{
  const root=document.querySelector('#albumContent');
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

  const id=new URLSearchParams(location.search).get('id');

  let content=null;
  try{
    const r=await sb.from('site_content').select('*').eq('id',1).maybeSingle();
    content=r.data||null;
  }catch(e){/* не критично */}

  if(content){
    setText('footerLeft',content.footer_left);setText('footerRight',content.footer_right);
    const mlBadge=document.querySelector('#mlBadge');
    if(content.logo_url&&mlBadge){mlBadge.classList.add('has-logo');mlBadge.innerHTML=`<img src="${content.logo_url}" alt="МаниЛи" onerror="this.closest('.ml').classList.remove('has-logo');this.remove()">`}
    window.manili_setThemeBgContent?.(content);
  }

  if(!id){renderState(root,'Альбом не найден.');return}

  renderState(root,'Загружаем альбом…');

  let album,albumError;
  try{
    const r=await sb.from('albums').select('*').eq('id',id).eq('status','published').maybeSingle();
    album=r.data;albumError=r.error;
  }catch(e){
    renderState(root,'Не удалось загрузить альбом. Проверьте подключение к интернету.');
    return;
  }
  if(albumError||!album){renderState(root,'Альбом не найден или ещё не опубликован.');return}

  applyAlbumSeo(album);

  let media=[];
  try{
    const {data:mediaRows}=await sb.from('album_media').select('*').eq('album_id',id).order('sort_order',{ascending:true});
    media=mediaRows||[];
  }catch(e){/* покажем альбом даже если список медиа не загрузился */}

  root.innerHTML=`
    <div class="section-head" style="margin-top:20px"><p class="eyebrow">АЛЬБОМ</p><h2 style="font-size:clamp(30px,5vw,60px)">${escapeHtml(album.title)}</h2></div>
    ${album.description?`<p style="color:var(--muted);max-width:640px;margin:-30px 5vw 30px;line-height:1.7">${escapeHtml(album.description)}</p>`:''}
    <div id="albumGrid" class="gallery-grid" style="margin:0 5vw"></div>
  `;

  const grid=document.querySelector('#albumGrid');
  if(!media.length){grid.innerHTML=`<div class="loading">В этом альбоме пока нет фото и видео.</div>`;return}
  grid.innerHTML=media.map((m,i)=>m.type==='video'
    ? `<figure class="gphoto" data-i="${i}"><video src="${m.url}" muted loop autoplay playsinline preload="metadata" onerror="this.closest('.gphoto').style.display='none'"></video></figure>`
    : `<figure class="gphoto" data-i="${i}"><img src="${m.url}" loading="lazy" alt="" onerror="this.closest('.gphoto').style.display='none'"></figure>`
  ).join('');
  grid.querySelectorAll('.gphoto').forEach(tile=>{
    tile.onclick=()=>window.manili_openLightbox?.(media,+tile.dataset.i);
  });

  window.manili_track?.('album_view',{album_id:album.id,element_label:album.title});
})();

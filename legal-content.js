/* МаниЛи — privacy.html и terms.html.
   Текст этих страниц теперь редактируется в админке (site_content.privacy_content /
   site_content.terms_content, см. migration_legal_pages.sql). Этот файл общий для
   обеих страниц: какую колонку читать — определяет data-legal-key на <body>.
   Если админ ещё не вписал свой текст (поле пустое) — остаётся текст-заглушка,
   который уже есть в самом HTML. */
(function(){
  function escapeHtml(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

  function renderLegalText(raw){
    const el=document.querySelector('#legalBody');
    if(!el||!raw||!raw.trim())return;
    el.innerHTML=raw.trim().split(/\n{2,}/).map(p=>`<p>${escapeHtml(p).replace(/\n/g,'<br>')}</p>`).join('');
  }

  (async()=>{
    const cfg=window.MANILI_CONFIG||{};
    if(!cfg.SUPABASE_URL||cfg.SUPABASE_URL.includes('YOUR-'))return;
    let sb;
    try{sb=supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY)}catch(e){return}

    let content=null;
    try{
      const r=await sb.from('site_content').select('*').eq('id',1).maybeSingle();
      content=r.data||null;
    }catch(e){return}
    if(!content)return;

    window.manili_setThemeBgContent?.(content);

    const mlBadge=document.querySelector('#mlBadge');
    if(content.logo_url&&mlBadge){mlBadge.classList.add('has-logo');mlBadge.innerHTML=`<img src="${content.logo_url}" alt="МаниЛи" onerror="this.closest('.ml').classList.remove('has-logo');this.remove()">`}

    const footerLeft=document.querySelector('#footerLeft'),footerRight=document.querySelector('#footerRight');
    if(footerLeft&&content.footer_left)footerLeft.textContent=content.footer_left;
    if(footerRight&&content.footer_right)footerRight.textContent=content.footer_right;

    const key=document.body.dataset.legalKey;
    if(key)renderLegalText(content[key]);
  })();
})();

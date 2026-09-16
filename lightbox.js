/* МаниЛи — общий лайтбокс (полноэкранный просмотр фото/видео) для event.html и album.html.
   Раньше этот код был продублирован в event.js и album.js один в один — вынесен сюда,
   чтобы правки/баги чинились в одном месте. */
(function(){
  let lbMedia=[],lbIndex=0;

  function escapeHtml(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

  function openLightbox(media,index){
    lbMedia=Array.isArray(media)?media:[];
    lbIndex=index||0;
    const lb=document.querySelector('#lightbox');if(!lb)return;
    lb.classList.add('is-open');renderLightbox();
  }

  function renderLightbox(){
    const stage=document.querySelector('#lightboxStage');if(!stage)return;
    const m=lbMedia[lbIndex];
    if(!m){stage.innerHTML=`<p style="color:var(--muted)">Файл недоступен.</p>`;return}
    stage.innerHTML=m.type==='video'
      ? `<video src="${m.url}" controls autoplay playsinline></video>`
      : `<img src="${m.url}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('p'),{textContent:'Не удалось загрузить файл.',style:'color:var(--muted)'}))">`;
    const menu=document.querySelector('#shareMenu');if(menu)menu.classList.remove('is-open');
  }

  async function downloadCurrentMedia(){
    const m=lbMedia[lbIndex];if(!m)return;
    try{
      const res=await fetch(m.url);
      if(!res.ok)throw new Error('bad response');
      const blob=await res.blob();
      const objUrl=URL.createObjectURL(blob);
      const a=document.createElement('a');
      const ext=(m.url.split('.').pop()||'jpg').split('?')[0];
      a.href=objUrl;a.download=`manili-${Date.now()}.${ext}`;
      document.body.appendChild(a);a.click();a.remove();
      URL.revokeObjectURL(objUrl);
    }catch(e){
      try{window.open(m.url,'_blank','noopener')}catch(e2){/* ignore */}
    }
  }

  document.addEventListener('DOMContentLoaded',()=>{
    const lb=document.querySelector('#lightbox');if(!lb)return;
    const closeBtn=document.querySelector('#lightboxClose');
    const stage=document.querySelector('#lightboxStage');
    const prevBtn=document.querySelector('#lightboxPrev');
    const nextBtn=document.querySelector('#lightboxNext');
    const downloadBtn=document.querySelector('#lightboxDownload');
    const shareBtn=document.querySelector('#lightboxShare');

    if(closeBtn)closeBtn.onclick=()=>{lb.classList.remove('is-open');if(stage)stage.innerHTML='';document.querySelector('#shareMenu')?.classList.remove('is-open')};
    if(prevBtn)prevBtn.onclick=()=>{if(!lbMedia.length)return;lbIndex=(lbIndex-1+lbMedia.length)%lbMedia.length;renderLightbox()};
    if(nextBtn)nextBtn.onclick=()=>{if(!lbMedia.length)return;lbIndex=(lbIndex+1)%lbMedia.length;renderLightbox()};
    if(downloadBtn)downloadBtn.onclick=()=>downloadCurrentMedia();
    if(shareBtn)shareBtn.onclick=()=>{
      const m=lbMedia[lbIndex];if(!m)return;
      const url=m.url;
      if(navigator.share){navigator.share({url,title:'МаниЛи EVENT'}).catch(()=>{});return}
      const menu=document.querySelector('#shareMenu');if(!menu)return;
      const tg=document.querySelector('#shareTelegram'),wa=document.querySelector('#shareWhatsapp'),vk=document.querySelector('#shareVk'),copyLink=document.querySelector('#shareCopy');
      if(tg)tg.href=`https://t.me/share/url?url=${encodeURIComponent(url)}`;
      if(wa)wa.href=`https://wa.me/?text=${encodeURIComponent(url)}`;
      if(vk)vk.href=`https://vk.com/share.php?url=${encodeURIComponent(url)}`;
      if(copyLink)copyLink.onclick=e=>{
        e.preventDefault();
        navigator.clipboard?.writeText(url).then(()=>{
          copyLink.textContent='Скопировано ✓';setTimeout(()=>{copyLink.textContent='Скопировать ссылку'},1500)
        }).catch(()=>{window.prompt('Скопируйте ссылку:',url)});
      };
      menu.classList.toggle('is-open');
    };
    document.addEventListener('keydown',e=>{
      if(!lb.classList.contains('is-open'))return;
      if(e.key==='Escape')closeBtn?.click();
      if(e.key==='ArrowLeft')prevBtn?.click();
      if(e.key==='ArrowRight')nextBtn?.click();
    });
  });

  window.manili_openLightbox=openLightbox;
})();

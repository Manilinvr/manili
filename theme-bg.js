/* МаниЛи — фон сайта раздельно для тёмной и светлой темы.
   Раньше был один фон на обе темы; теперь site_content хранит
   bg_color_dark/bg_image_url_dark/... и bg_color_light/bg_image_url_light/...
   (см. migration_theme_backgrounds.sql). Этот файл общий для index.html,
   event.html и album.html — чтобы логика переключения фона не дублировалась. */
(function(){
  let currentContent=null;

  function pick(theme){
    if(!currentContent)return null;
    const isLight=theme==='light';
    return {
      color: isLight
        ? (currentContent.bg_color_light||'#f3efe4')
        : (currentContent.bg_color_dark||currentContent.bg_color||'#11100e'),
      image: isLight ? currentContent.bg_image_url_light : (currentContent.bg_image_url_dark||currentContent.bg_image_url),
      overlay: isLight
        ? (currentContent.bg_overlay_opacity_light==null?0.6:currentContent.bg_overlay_opacity_light)
        : (currentContent.bg_overlay_opacity_dark==null?(currentContent.bg_overlay_opacity==null?0.6:currentContent.bg_overlay_opacity):currentContent.bg_overlay_opacity_dark)
    };
  }

  function apply(){
    const theme=document.documentElement.getAttribute('data-theme')||'dark';
    const v=pick(theme);
    if(!v)return;
    document.documentElement.style.setProperty('--bg',v.color);
    if(v.image){
      document.body.style.backgroundImage=`linear-gradient(rgba(0,0,0,${v.overlay}),rgba(0,0,0,${v.overlay})),url("${v.image}")`;
      document.body.style.backgroundSize='cover';
      document.body.style.backgroundPosition='center';
      document.body.style.backgroundAttachment='fixed';
      document.body.style.backgroundRepeat='no-repeat';
    }else{
      document.body.style.backgroundImage='none';
    }
  }

  window.manili_setThemeBgContent=function(content){currentContent=content;apply()};

  document.addEventListener('DOMContentLoaded',()=>{
    document.querySelectorAll('.theme-toggle').forEach(btn=>{
      btn.addEventListener('click',()=>setTimeout(apply,0));
    });
  });
})();

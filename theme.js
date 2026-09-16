(function(){
  function label(theme){return theme==='light' ? 'Theme: Light' : 'Theme: Dark'}
  function apply(theme){
    document.documentElement.setAttribute('data-theme',theme);
    document.querySelectorAll('.theme-label').forEach(function(el){el.textContent=label(theme)});
  }
  document.addEventListener('DOMContentLoaded',function(){
    var current=document.documentElement.getAttribute('data-theme')||'dark';
    apply(current);
    document.querySelectorAll('.theme-toggle').forEach(function(btn){
      btn.addEventListener('click',function(){
        var next=document.documentElement.getAttribute('data-theme')==='light' ? 'dark' : 'light';
        try{localStorage.setItem('theme',next)}catch(e){}
        apply(next);
      });
    });
  });
})();

/* МаниЛи — мобильное меню (гамбургер). Общий файл для всех страниц с шапкой:
   раньше на мобильном nav{display:none} полностью прятал навигацию —
   теперь по кнопке открывается панель со ссылками. */
(function(){
  document.addEventListener('DOMContentLoaded',function(){
    var btn=document.querySelector('#navToggle');
    var nav=document.querySelector('#siteNav');
    if(!btn||!nav)return;

    function close(){
      nav.classList.remove('is-open');
      btn.classList.remove('is-active');
      btn.setAttribute('aria-expanded','false');
    }
    function open(){
      nav.classList.add('is-open');
      btn.classList.add('is-active');
      btn.setAttribute('aria-expanded','true');
    }

    btn.addEventListener('click',function(e){
      e.stopPropagation();
      if(nav.classList.contains('is-open'))close();else open();
    });
    // Закрыть после перехода по ссылке
    nav.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click',close);
    });
    // Закрыть по клику вне меню
    document.addEventListener('click',function(e){
      if(!nav.classList.contains('is-open'))return;
      if(nav.contains(e.target)||btn.contains(e.target))return;
      close();
    });
    // Закрыть по Escape
    document.addEventListener('keydown',function(e){
      if(e.key==='Escape')close();
    });
    // На переходе в десктопный размер — сбросить состояние, чтобы не залипало открытым
    window.addEventListener('resize',function(){
      if(window.innerWidth>800)close();
    });
  });
})();

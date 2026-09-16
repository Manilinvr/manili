/* МаниЛи — «флаг» ближайшего события: афиша развевается на ветру.
   Нативная реализация (без React/сборки) поверх Three.js (грузится с CDN лениво,
   только когда флаг реально виден). Идея симуляции — Verlet-ткань, как в
   присланном референсе, но текстурой служит НАША афиша (poster_url), а не
   сгенерированный логотип.

   Производительность (важно — аудитория мобильная):
   - сетка ткани мельче на телефонах (меньше вычислений);
   - pixelRatio ограничен;
   - симуляция и рендер идут, ТОЛЬКО пока блок виден на экране (IntersectionObserver)
     и вкладка активна (Page Visibility) — не греет батарею в фоне;
   - при prefers-reduced-motion анимация не запускается вовсе (показывается
     статичная афиша) — это про доступность, не про скорость.

   Публичный API:
     window.manili_initFlag({ container, posterUrl, alt })
       -> рисует флаг в container; при любой ошибке/отказе бросает, чтобы
          вызывающий код показал статичную афишу-фолбэк. */
(function(){
  const THREE_URL='https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js';
  let threeLoading=null;

  function loadThree(){
    if(window.THREE)return Promise.resolve(window.THREE);
    if(threeLoading)return threeLoading;
    threeLoading=new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src=THREE_URL;s.async=true;
      s.onload=()=>window.THREE?resolve(window.THREE):reject(new Error('three not available'));
      s.onerror=()=>reject(new Error('three failed to load'));
      document.head.appendChild(s);
    });
    return threeLoading;
  }

  function loadImage(url){
    return new Promise((resolve,reject)=>{
      const img=new Image();
      img.crossOrigin='anonymous'; // нужно, чтобы постер из Supabase Storage можно было положить в WebGL-текстуру
      img.onload=()=>resolve(img);
      img.onerror=()=>reject(new Error('poster failed to load'));
      img.src=url;
    });
  }

  window.manili_initFlag=async function(opts){
    const {container,posterUrl}=opts||{};
    if(!container||!posterUrl)throw new Error('flag: container/posterUrl required');

    const reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduce)throw new Error('reduced-motion'); // осознанный отказ → статичный фолбэк

    // Постер грузим ПЕРЕД three.js — если афиша недоступна, нет смысла тянуть библиотеку.
    const img=await loadImage(posterUrl);
    const THREE=await loadThree();

    const isMobile=window.innerWidth<768;
    const canvas=document.createElement('canvas');
    canvas.className='flag-canvas';
    container.appendChild(canvas);

    // Пропорции сцены берём из реальных пропорций афиши, чтобы флаг был "как афиша",
    // без искажения и без лишних полей вокруг.
    const ar=img.naturalWidth/img.naturalHeight||0.7;
    const BH=3.0, BW=BH*ar;
    const GY=isMobile?18:30, GX=Math.max(10,Math.round(GY*ar));

    const scene=new THREE.Scene();
    const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,isMobile?1.5:2));

    const tex=new THREE.Texture(img);
    tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=isMobile?2:6;tex.needsUpdate=true;

    const geo=new THREE.PlaneGeometry(BW,BH,GX,GY);
    const mat=new THREE.MeshPhongMaterial({map:tex,side:THREE.DoubleSide,shininess:8,specular:0x222222,color:0xffffff});
    const mesh=new THREE.Mesh(geo,mat);scene.add(mesh);

    scene.add(new THREE.AmbientLight(0xfff4e6,0.72));
    const key=new THREE.DirectionalLight(0xffffff,1.05);key.position.set(-3,3.2,3.4);scene.add(key);
    const rim=new THREE.DirectionalLight(0x8b7bff,0.35);rim.position.set(3,-1.5,2.0);scene.add(rim);

    const pos=geo.attributes.position;
    const N=(GX+1)*(GY+1);
    const cur=new Float32Array(N*3),prev=new Float32Array(N*3),rest=new Float32Array(N*3);
    const pinned=new Uint8Array(N);
    for(let i=0;i<N;i++){
      const ax=pos.getX(i),ay=pos.getY(i);
      cur[i*3]=prev[i*3]=rest[i*3]=ax;
      cur[i*3+1]=prev[i*3+1]=rest[i*3+1]=ay;
      cur[i*3+2]=prev[i*3+2]=rest[i*3+2]=0;
    }
    const idx=(ix,iy)=>ix+iy*(GX+1);
    // Прикрепляем левый край (флаг на древке слева), а не верх — так «развевается» вбок.
    for(let iy=0;iy<=GY;iy++){pinned[idx(0,iy)]=1;}

    const restH=BW/GX,restV=BH/GY;
    const GRAV=-0.35,DAMP=0.985,DT=0.016;

    function wind(ix,iy,t){
      const cx=ix/GX,cy=iy/GY;
      const travel=t*1.8-cx*4.0;
      const gust=0.55+0.3*Math.sin(t*0.6)+0.12*Math.sin(t*1.9+1.3);
      const amp=0.5*cx; // чем дальше от древка, тем сильнее колышется (умеренно)
      const fz=(Math.sin(travel+cy*3.0)+0.5*Math.sin(travel*1.7+cy*6.0))*amp*gust;
      const fy=Math.sin(t*0.8+cx*2.0)*0.12*cx;
      return [0,fy,fz];
    }
    function solve(a,b,rl){
      const ax=cur[a*3],ay=cur[a*3+1],az=cur[a*3+2];
      const bx=cur[b*3],by=cur[b*3+1],bz=cur[b*3+2];
      let dx=bx-ax,dy=by-ay,dz=bz-az;
      const d=Math.sqrt(dx*dx+dy*dy+dz*dz)||1e-6;
      const diff=(d-rl)/d*0.5;dx*=diff;dy*=diff;dz*=diff;
      const pa=pinned[a],pb=pinned[b];
      if(!pa&&!pb){cur[a*3]+=dx;cur[a*3+1]+=dy;cur[a*3+2]+=dz;cur[b*3]-=dx;cur[b*3+1]-=dy;cur[b*3+2]-=dz;}
      else if(pa&&!pb){cur[b*3]-=dx*2;cur[b*3+1]-=dy*2;cur[b*3+2]-=dz*2;}
      else if(!pa&&pb){cur[a*3]+=dx*2;cur[a*3+1]+=dy*2;cur[a*3+2]+=dz*2;}
    }
    // Не даёт ребру растянуться длиннее maxLen — подтягивает свободную точку обратно.
    function clampEdge(a,b,maxLen){
      let dx=cur[b*3]-cur[a*3],dy=cur[b*3+1]-cur[a*3+1],dz=cur[b*3+2]-cur[a*3+2];
      const d=Math.sqrt(dx*dx+dy*dy+dz*dz);
      if(d<=maxLen||d<1e-6)return;
      const s=(d-maxLen)/d;
      const pa=pinned[a],pb=pinned[b];
      if(pa&&!pb){cur[b*3]-=dx*s;cur[b*3+1]-=dy*s;cur[b*3+2]-=dz*s;}
      else if(!pa&&pb){cur[a*3]+=dx*s;cur[a*3+1]+=dy*s;cur[a*3+2]+=dz*s;}
      else if(!pa&&!pb){cur[a*3]+=dx*s*0.5;cur[a*3+1]+=dy*s*0.5;cur[a*3+2]+=dz*s*0.5;cur[b*3]-=dx*s*0.5;cur[b*3+1]-=dy*s*0.5;cur[b*3+2]-=dz*s*0.5;}
    }
    function step(t){
      for(let iy=0;iy<=GY;iy++)for(let ix=0;ix<=GX;ix++){
        const i=idx(ix,iy);if(pinned[i])continue;
        const [fx,fy,fz]=wind(ix,iy,t);
        for(let k=0;k<3;k++){
          const j=i*3+k;
          let a=(k===0?fx:k===1?(fy+GRAV):fz);
          // Слабая возвращающая сила к исходной плоскости флага (shape-matching):
          // не даёт ткани кумулятивно "уплывать" вниз/вбок, флаг колышется на месте.
          a+=(rest[j]-cur[j])*2.4;
          const v=(cur[j]-prev[j])*DAMP;
          prev[j]=cur[j];cur[j]=cur[j]+v+a*DT*DT;
        }
      }
      const iters=isMobile?3:4;
      for(let it=0;it<iters;it++){
        for(let iy=0;iy<=GY;iy++)for(let ix=0;ix<GX;ix++)solve(idx(ix,iy),idx(ix+1,iy),restH);
        for(let iy=0;iy<GY;iy++)for(let ix=0;ix<=GX;ix++)solve(idx(ix,iy),idx(ix,iy+1),restV);
      }
      // Жёсткий предел растяжения: ни одно ребро не длиннее 1.5× исходной длины —
      // не даёт ткани "растекаться" как резина под ветром (поймано числовым тестом).
      for(let iy=0;iy<=GY;iy++)for(let ix=0;ix<GX;ix++)clampEdge(idx(ix,iy),idx(ix+1,iy),restH*1.5);
      for(let iy=0;iy<GY;iy++)for(let ix=0;ix<=GX;ix++)clampEdge(idx(ix,iy),idx(ix,iy+1),restV*1.5);
      // держим прикреплённый край на месте
      for(let iy=0;iy<=GY;iy++){const i=idx(0,iy);cur[i*3]=rest[i*3];cur[i*3+1]=rest[i*3+1];cur[i*3+2]=rest[i*3+2];prev[i*3]=rest[i*3];prev[i*3+1]=rest[i*3+1];prev[i*3+2]=rest[i*3+2];}
    }
    function commit(){
      for(let i=0;i<N;i++)pos.setXYZ(i,cur[i*3],cur[i*3+1],cur[i*3+2]);
      pos.needsUpdate=true;geo.computeVertexNormals();
    }
    let camera;
    function fit(){
      const w=container.clientWidth,h=container.clientHeight;
      if(w===0||h===0)return;
      renderer.setSize(w,h,false);
      const aspect=w/h;
      camera=new THREE.PerspectiveCamera(40,aspect,0.1,100);
      const vFit=(BH/2)/Math.tan(40*Math.PI/360);
      const hFit=(BW/2)/Math.tan(40*Math.PI/360)/aspect;
      camera.position.set(0,0,Math.max(vFit,hFit)*1.12+0.3);
      camera.lookAt(0,0,0);
    }
    window.addEventListener('resize',fit);fit();

    let running=false,raf=0,t=0,onScreen=false;
    function loop(){
      if(!running)return;
      t+=DT;step(t);commit();
      if(camera)renderer.render(scene,camera);
      raf=requestAnimationFrame(loop);
    }
    function start(){if(running||!onScreen||document.hidden)return;running=true;raf=requestAnimationFrame(loop);}
    function stop(){running=false;cancelAnimationFrame(raf);}

    // немного «разомнём» ткань, чтобы при появлении она уже была в движении
    for(let s=0;s<30;s++)step(s*DT);t=30*DT;commit();if(camera)renderer.render(scene,camera);

    if('IntersectionObserver' in window){
      const io=new IntersectionObserver(entries=>{
        onScreen=entries[0].isIntersecting;
        if(onScreen)start();else stop();
      },{threshold:0.05});
      io.observe(container);
    }else{onScreen=true;start();}
    document.addEventListener('visibilitychange',()=>document.hidden?stop():start());

    return {stop};
  };
})();

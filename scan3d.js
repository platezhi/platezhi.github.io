/* DEMO 3D viewer for the rent flow: procedural apartment model from the inventory, fake "scan" animation,
   local .glb viewing (e.g. exported from a LiDAR scan app). three.js r147 vendored in vendor/three (MIT). */
(function(w){
  'use strict';
  var BASE='vendor/three/',loading=null;
  function script(src){return new Promise(function(res,rej){var s=document.createElement('script');s.src=src;s.onload=res;s.onerror=function(){rej(new Error('load '+src));};document.head.appendChild(s);});}
  function load(){
    if(w.THREE&&w.THREE.OrbitControls&&w.THREE.GLTFLoader)return Promise.resolve();
    if(!loading)loading=(w.THREE?Promise.resolve():script(BASE+'three.min.js')).then(function(){return script(BASE+'OrbitControls.js');}).then(function(){return script(BASE+'GLTFLoader.js');});
    return loading;
  }
  function webglOk(){try{var c=document.createElement('canvas');return !!(c.getContext('webgl')||c.getContext('experimental-webgl'));}catch(e){return false;}}

  /* ---- viewer ---- */
  function Viewer(el){
    var T=w.THREE,W=Math.max(200,el.clientWidth),H=Math.max(180,el.clientHeight);
    var r=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
    r.setPixelRatio(Math.min(2,w.devicePixelRatio||1));r.setSize(W,H);
    var cv=r.domElement;cv.className='v3d-c';el.appendChild(cv);
    var scene=new T.Scene();scene.background=new T.Color(0xf6f1ef);
    var cam=new T.PerspectiveCamera(45,W/H,0.05,500);cam.position.set(8,9,11);
    scene.add(new T.HemisphereLight(0xffffff,0x8a7a70,0.75));
    var dl=new T.DirectionalLight(0xffffff,0.65);dl.position.set(6,12,8);scene.add(dl);
    var ctl=new T.OrbitControls(cam,cv);ctl.enableDamping=true;ctl.dampingFactor=0.12;ctl.maxPolarAngle=Math.PI*0.48;ctl.screenSpacePanning=true;
    var obj=null,alive=true,hooks=[];
    function fit(o){var b=new T.Box3().setFromObject(o),c=b.getCenter(new T.Vector3()),s=b.getSize(new T.Vector3()),m=Math.max(s.x,s.y,s.z)||1;
      var dist=m/(2*Math.tan(cam.fov*Math.PI/360))*0.78;ctl.target.copy(c);cam.position.set(c.x+dist*0.55,c.y+dist*0.75,c.z+dist*0.8);cam.near=m/200;cam.far=m*50;cam.updateProjectionMatrix();ctl.minDistance=m*0.2;ctl.maxDistance=m*4;ctl.update();}
    function resize(){if(!alive)return;var W2=el.clientWidth,H2=el.clientHeight;if(W2&&H2&&(W2!==W||H2!==H)){W=W2;H=H2;r.setSize(W,H);cam.aspect=W/H;cam.updateProjectionMatrix();}}
    function loop(){if(!alive)return;if(!cv.isConnected){dispose();return;}resize();hooks.forEach(function(f){f();});ctl.update();r.render(scene,cam);requestAnimationFrame(loop);}
    function dispose(){if(!alive)return;alive=false;try{ctl.dispose();r.dispose();r.forceContextLoss();}catch(e){}if(cv.parentNode)cv.parentNode.removeChild(cv);}
    requestAnimationFrame(loop);
    var v={scene:scene,camera:cam,controls:ctl,renderer:r,el:el,
      set:function(o){if(obj)scene.remove(obj);obj=o;scene.add(o);fit(o);r.render(scene,cam);},
      onFrame:function(f){hooks.push(f);},dispose:dispose};
    el._v3d=v;return v;
  }
  function disposeIn(root){if(!root)return;var l=root.querySelectorAll?root.querySelectorAll('.v3d'):[];for(var i=0;i<l.length;i++)if(l[i]._v3d){l[i]._v3d.dispose();l[i]._v3d=null;}}

  /* ---- procedural demo apartment ---- */
  var SZ=[[/холодильник/i,[.7,1.9,.7],0xf2f2f2],[/плита/i,[.6,.9,.6],0x8a8f96],[/вытяжк/i,[.6,.3,.5],0xbfc4ca,1.6],[/микроволн/i,[.5,.3,.38],0x3b3f44,.9],
    [/гарнитур/i,[2,.9,.6],0xd8b48c],[/стол/i,[1.2,.75,.8],0xb08560],[/стул/i,[.45,.9,.45],0x9c6f4c],[/кроват/i,[1.6,.45,2],0xc9a27c],[/матрас/i,[1.5,.2,1.9],0xeeeeee,.45],
    [/шкаф/i,[1.2,2,.6],0xa77d5a],[/телевизор/i,[1.1,.65,.08],0x222222,.8],[/штор/i,[1.8,2.1,.05],0xd9c7e6],[/стиральн/i,[.6,.85,.6],0xffffff],[/бойлер/i,[.45,.8,.45],0xe8e8e8,1.3],
    [/зеркал/i,[.6,.8,.03],0xbfe3f2,1.1],[/ключ/i,[.18,.05,.1],0xe0b84a,1],[/стеллаж/i,[1,2,.4],0x8d99a6]];
  var ZONES_KV={'Кухня':[0,0,4,3,0xd9b48f],'Комната':[4,0,9,6,0xc79c6e],'Санузел':[0,3,2,6,0x9fc3d6],'Прихожая':[2,3,4,6,0xcbb59a]};
  var ZONES_KL={'Кладовая':[0,0,2.4,1.8,0xb5b5b5]};
  function label(T,text,big){var c=document.createElement('canvas'),x=c.getContext('2d'),fs=big?44:34;x.font='600 '+fs+'px Arial';var tw=Math.ceil(x.measureText(text).width)+28;c.width=tw;c.height=fs+22;
    x.font='600 '+fs+'px Arial';x.fillStyle=big?'rgba(200,96,63,.92)':'rgba(255,255,255,.93)';var rr=12;x.beginPath();x.moveTo(rr,0);x.lineTo(tw-rr,0);x.quadraticCurveTo(tw,0,tw,rr);x.lineTo(tw,c.height-rr);x.quadraticCurveTo(tw,c.height,tw-rr,c.height);x.lineTo(rr,c.height);x.quadraticCurveTo(0,c.height,0,c.height-rr);x.lineTo(0,rr);x.quadraticCurveTo(0,0,rr,0);x.fill();
    x.fillStyle=big?'#fff':'#333';x.textBaseline='middle';x.fillText(text,14,c.height/2+1);
    var tex=new T.CanvasTexture(c);var sp=new T.Sprite(new T.SpriteMaterial({map:tex,depthTest:false,transparent:true}));var k=(big?0.0062:0.0052);sp.scale.set(tw*k,c.height*k,1);sp.renderOrder=10;return sp;}
  function demoModel(inv,storage){
    var T=w.THREE,g=new T.Group(),Z=storage?ZONES_KL:ZONES_KV,WH=1.3,th=0.1;
    function box(wd,h,dp,col,x,y,z,opac){var m=new T.Mesh(new T.BoxGeometry(wd,h,dp),new T.MeshLambertMaterial({color:col,transparent:!!opac,opacity:opac||1}));m.position.set(x,y,z);g.add(m);return m;}
    var maxX=0,maxZ=0;
    Object.keys(Z).forEach(function(n){var z=Z[n];maxX=Math.max(maxX,z[2]);maxZ=Math.max(maxZ,z[3]);
      var f=box(z[2]-z[0],0.04,z[3]-z[1],z[4],(z[0]+z[2])/2,-0.02,(z[1]+z[3])/2);f.userData.floor=1;
      var l=label(T,n,true);l.position.set((z[0]+z[2])/2,WH+0.5,(z[1]+z[3])/2);g.add(l);});
    var wc=0xe6ddd3;
    box(maxX+th,WH,th,wc,maxX/2,WH/2,0,0.95);box(maxX+th,WH,th,wc,maxX/2,WH/2,maxZ,0.95);box(th,WH,maxZ,wc,0,WH/2,maxZ/2,0.95);box(th,WH,maxZ,wc,maxX,WH/2,maxZ/2,0.95);
    if(!storage){box(th,WH,2.2,wc,4,WH/2,1.1);box(th,WH,2.2,wc,4,WH/2,4.9);box(1.3,WH,th,wc,0.65,WH/2,3);box(1.2,WH,th,wc,3.4,WH/2,3);box(th,WH,2.1,wc,2,WH/2,4.95);}
    var cur={};
    (inv||[]).forEach(function(it){var zn=Z[it.room]||Z[Object.keys(Z)[0]],key=it.room in Z?it.room:Object.keys(Z)[0];
      var spec=null;for(var i=0;i<SZ.length;i++)if(SZ[i][0].test(it.name)){spec=SZ[i];break;}
      var s=spec?spec[1]:[.5,.5,.5],col=spec?spec[2]:0xb7a99a,y0=spec&&spec[3]||0,n=/стул/i.test(it.name)?Math.min(6,+it.qty||1):1;
      var c=cur[key]||(cur[key]={x:zn[0]+0.25,z:zn[1]+0.25,rowD:0});
      var need=s[0]*n+0.1*(n-1);
      if(c.x+need>zn[2]-0.2&&c.x>zn[0]+0.3){c.x=zn[0]+0.25;c.z+=c.rowD+0.35;c.rowD=0;}
      var zc=Math.min(c.z+s[2]/2,zn[3]-0.2-s[2]/2);
      for(var k=0;k<n;k++){var m=box(s[0],s[1],s[2],col,c.x+s[0]/2+k*(s[0]+0.1),y0+s[1]/2,zc);m.userData.item=it.name;}
      var lb=label(T,it.name+(it.qty>1?' ×'+it.qty:''));lb.position.set(c.x+need/2,y0+s[1]+0.28,zc);g.add(lb);
      c.x+=need+0.3;c.rowD=Math.max(c.rowD,s[2]);
    });
    return g;
  }
  function centerModel(o){var T=w.THREE,b=new T.Box3().setFromObject(o),c=b.getCenter(new T.Vector3());o.position.sub(new T.Vector3(c.x,b.min.y,c.z));var g=new T.Group();g.add(o);return g;}
  function parseGlb(buf){return load().then(function(){return new Promise(function(res,rej){new w.THREE.GLTFLoader().parse(buf,'',function(gl){res(centerModel(gl.scene));},function(e){rej(e||new Error('glb'));});});});}

  /* ---- fake scan animation ---- */
  function scan(el,inv,storage,onPct){
    return load().then(function(){return new Promise(function(res){
      var T=w.THREE,v=Viewer(el),m=demoModel(inv,storage),b0=new T.Box3().setFromObject(m),minX=b0.min.x-0.3,maxX=b0.max.x+0.3,sz=b0.getSize(new T.Vector3());
      m.traverse(function(o){if(o.isMesh||o.isSprite)o.visible=false;});v.set(m);
      var plane=new T.Mesh(new T.PlaneGeometry(sz.z+1,3),new T.MeshBasicMaterial({color:0x2e9e5b,transparent:true,opacity:0.28,side:T.DoubleSide,depthWrite:false}));plane.rotation.y=Math.PI/2;plane.position.set(minX,1.2,(b0.min.z+b0.max.z)/2);v.scene.add(plane);
      var t0=performance.now(),D=2400,done=false;
      v.onFrame(function(){if(done)return;var p=Math.min(1,(performance.now()-t0)/D),sx=minX+(maxX-minX)*p;plane.position.x=sx;
        m.traverse(function(o){if((o.isMesh||o.isSprite)&&!o.visible){var wp=new T.Vector3();o.getWorldPosition(wp);if(wp.x<=sx+0.2)o.visible=true;}});
        v.controls.autoRotate=false;onPct&&onPct(Math.round(p*100));
        if(p>=1){done=true;v.scene.remove(plane);m.traverse(function(o){o.visible=true;});res(v);}});
    });});
  }

  /* ---- mount a saved scan into a .v3d element ---- */
  var mem={};
  function mount(el,src){
    if(!webglOk()){el.innerHTML='<div class="v3d-msg">WebGL недоступен в этом браузере</div>';return Promise.resolve(null);}
    return load().then(function(){
      if(src.kind==='glb')return idbGet(src.key).then(function(buf){if(!buf)throw new Error('nofile');return parseGlb(buf);});
      return demoModel(src.inv,src.storage);
    }).then(function(o){if(!el.isConnected)return null;el.querySelectorAll('.v3d-msg').forEach(function(x){x.remove();});var v=Viewer(el);v.set(o);el.setAttribute('data-ready','1');return v;})
    .catch(function(e){el.innerHTML='<div class="v3d-msg">'+(e&&e.message==='nofile'?'Файл скана хранится только в браузере, где его загрузили (IndexedDB).':'Не удалось открыть 3D-модель')+'</div>';el.setAttribute('data-ready','err');});
  }

  /* ---- IndexedDB storage for uploaded .glb (fallback: memory for this session) ---- */
  var dbp=null;
  function db(){if(!dbp)dbp=new Promise(function(res,rej){try{var q=indexedDB.open('platezhiDemo3D',1);q.onupgradeneeded=function(){q.result.createObjectStore('scans');};q.onsuccess=function(){res(q.result);};q.onerror=function(){rej(q.error);};}catch(e){rej(e);}});return dbp;}
  function idbPut(k,buf){mem[k]=buf;return db().then(function(d){return new Promise(function(res){var tx=d.transaction('scans','readwrite');tx.objectStore('scans').put(buf,k);tx.oncomplete=function(){res(true);};tx.onerror=function(){res(false);};});}).catch(function(){return false;});}
  function idbGet(k){if(mem[k])return Promise.resolve(mem[k]);return db().then(function(d){return new Promise(function(res){var q=d.transaction('scans').objectStore('scans').get(k);q.onsuccess=function(){res(q.result||null);};q.onerror=function(){res(null);};});}).catch(function(){return null;});}
  function idbClear(){mem={};return db().then(function(d){var tx=d.transaction('scans','readwrite');tx.objectStore('scans').clear();}).catch(function(){});}

  w.Scan3D={load:load,mount:mount,scan:scan,parseGlb:parseGlb,demoModel:demoModel,idbPut:idbPut,idbGet:idbGet,idbClear:idbClear,disposeIn:disposeIn,webglOk:webglOk};
})(window);

/* Shared client-side DEMO logic for the rent flow: contract template, links, storage, signature pad.
   No backend: state lives in localStorage of this browser only. */
(function(w){
  'use strict';
  var KEY='demoDeals_v1';
  var MG=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  var STEPS=['Объект','Цена','Договор','СМС','Подпись арендатора','Ваша подпись','Оплата'];
  var STATUS={draft:'Договор сформирован',sent:'Отправлено, ждём подпись',tenant_signed:'Арендатор подписал',owner_signed:'Подписан обеими сторонами · ждём оплату',paid:'Оплачено · сдаётся',cancelled:'Отменена',ended:'Завершена'};
  var OWNER='Яковлев Владимир Владимирович';

  function load(){try{var s=JSON.parse(localStorage.getItem(KEY));if(s&&s.deals&&typeof s.deals==='object')return s;}catch(e){}return {deals:{}};}
  function save(s){localStorage.setItem(KEY,JSON.stringify(s));}
  function all(){var d=load().deals;return Object.keys(d).map(function(k){return d[k];}).sort(function(a,b){return (b.created||0)-(a.created||0);});}
  function get(id){return load().deals[id]||null;}
  function put(d){var s=load();s.deals[d.id]=d;save(s);return d;}
  function clear(){localStorage.removeItem(KEY);}
  function newId(){return 'D'+Date.now().toString(36)+Math.floor(Math.random()*1e4).toString(36);}

  function enc(o){return btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
  function dec(s){try{s=String(s||'').replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';return JSON.parse(decodeURIComponent(escape(atob(s))));}catch(e){return null;}}
  function num(v,max){v=Math.round(+v);return isFinite(v)&&v>0&&v<=max?v:0;}
  function str(v,max){return typeof v==='string'?v.slice(0,max):'';}

  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function fmt(n){var neg=n<0,s=Math.abs(+n||0).toFixed(2).split('.');s[0]=s[0].replace(/\B(?=(\d{3})+(?!\d))/g,' ');return (neg?'-':'')+s[0]+'.'+s[1];}
  function rub(n){return fmt(n)+' руб.';}
  function p2(x){return (x<10?'0':'')+x;}
  function dstr(t){var d=new Date(t);return p2(d.getDate())+'.'+p2(d.getMonth()+1)+'.'+d.getFullYear();}
  function dtstr(t){var d=new Date(t);return dstr(t)+' '+p2(d.getHours())+':'+p2(d.getMinutes());}

  function baseUrl(){return new URL('.',location.href).href;}
  function linkData(d){return {i:d.id,k:d.type,o:d.obj,a:d.addr,p:d.price,z:d.deposit,f:d.from,ph:d.phone||'',t:d.created,b:d.objId||''};}
  function fromLink(x){
    if(!x||typeof x!=='object')return null;
    var d={id:str(x.i,40),type:x.k==='кл'?'кл':'кв',obj:str(x.o,80),addr:str(x.a,160),price:num(x.p,1e7),deposit:Math.max(0,Math.round(+x.z)||0),from:Math.min(11,Math.max(0,Math.round(+x.f)||0)),phone:str(x.ph,30),created:+x.t||Date.now(),objId:str(x.b,20),status:'sent'};
    return d.id&&d.price&&d.addr?d:null;
  }
  function signLink(d){return baseUrl()+'sign.html?c='+enc(linkData(d));}
  function payLink(d){return baseUrl()+'pay.html?c='+enc({b:d.objId||'',i:d.id,p:d.price,z:d.deposit,a:d.addr,f:d.from,k:d.type,o:d.obj,t:d.created});}
  function due(d){return (d.price||0)+(d.deposit||0);}
  function isStorage(d){return d.type==='кл';}
  function stepOf(d,priceOpen){
    if(!d)return priceOpen?1:0;
    return {draft:3,sent:4,tenant_signed:5,owner_signed:6,paid:7}[d.status]||0;
  }
  function stepper(cur){
    return '<ol class="steps">'+STEPS.map(function(s,i){var c=i<cur?'done':i===cur?'cur':'';return '<li class="'+c+'"><span>'+(i<cur?'✓':(i+1))+'</span>'+s+'</li>';}).join('')+'</ol>';
  }

  /* ---- contract template ---- */
  function line(v,ph){return v?'<b>'+esc(v)+'</b>':'<span class="ct-blank">'+(ph||'&nbsp;')+'</span>';}
  function contractHtml(d,opt){
    opt=opt||{};
    var st=isStorage(d),t=d.tenant||{};
    var R=st?{O:'Арендодатель',T:'Арендатор',Od:'Арендодателю',Td:'Арендатору',Tg:'Арендатора',Og:'Арендодателя'}:{O:'Наймодатель',T:'Наниматель',Od:'Наймодателю',Td:'Нанимателю',Tg:'Нанимателя',Og:'Наймодателя'};
    var title=st?'Договор аренды нежилого помещения (кладовой)':'Договор найма жилого помещения';
    var start='1 '+MG[d.from]+' 2026 г.';
    var h='<div class="ct">'+
      '<div class="ct-demo">ДЕМО-ОБРАЗЕЦ · не является юридически значимым документом</div>'+
      '<h3 class="ct-title">'+title+'</h3>'+
      '<div class="ct-meta"><span>г. ________________</span><span>'+dstr(d.created||Date.now())+'</span></div>'+
      '<p><b>'+OWNER+'</b>, именуемый в дальнейшем «'+R.O+'», с одной стороны, и '+line(t.fio,'ФИО ____________________')+
      (t.birth?', дата рождения '+line(t.birth):'')+', паспорт '+line(t.passport,'серия, номер __________')+(t.reg?', зарегистрирован(а) по адресу: '+line(t.reg):'')+', тел. '+line(t.phone||d.phone,'______________')+
      ', именуемый(ая) в дальнейшем «'+R.T+'», с другой стороны, заключили настоящий договор о нижеследующем.</p>'+
      '<h4>1. Предмет договора</h4>'+
      (st?'<p>1.1. '+R.O+' передаёт, а '+R.T+' принимает во временное владение и пользование нежилое помещение — кладовую по адресу: <b>'+esc(d.addr)+'</b> (далее — «Помещение»).</p><p>1.2. Помещение предоставляется для хранения личных вещей. Хранение легковоспламеняющихся, взрывоопасных, токсичных веществ и продуктов питания запрещено.</p>'
         :'<p>1.1. '+R.O+' предоставляет '+R.Td+' за плату во временное владение и пользование жилое помещение — квартиру по адресу: <b>'+esc(d.addr)+'</b> (далее — «Квартира») для проживания.</p><p>1.2. Квартира принадлежит '+R.Od+' на праве собственности.</p>')+
      '<h4>2. Срок</h4><p>2.1. Договор заключается на 11 (одиннадцать) месяцев с '+start+'</p>'+
      '<h4>3. Плата и порядок расчётов</h4>'+
      '<p>3.1. Плата за пользование составляет <b>'+rub(d.price)+'</b> в месяц.</p>'+
      '<p>3.2. Плата вносится ежемесячно, не позднее 5-го числа текущего месяца. Первый платёж вносится при подписании договора.</p>'+
      (st?'':'<p>3.3. Коммунальные услуги по счётчикам (электроэнергия, вода) оплачивает '+R.T+'; прочие платежи — '+R.O+'.</p>')+
      '<h4>4. Залог</h4><p>4.1. '+R.T+' вносит обеспечительный платёж (залог) в размере <b>'+rub(d.deposit)+'</b>. Залог возвращается при прекращении договора при отсутствии задолженности и ущерба.</p>'+
      '<h4>5. Права и обязанности сторон</h4>'+
      '<p>5.1. '+R.O+' обязуется передать '+(st?'Помещение':'Квартиру')+' в состоянии, пригодном для использования, и не препятствовать пользованию.</p>'+
      '<p>5.2. '+R.T+' обязуется использовать '+(st?'Помещение':'Квартиру')+' по назначению, своевременно вносить плату, бережно относиться к имуществу, не производить перепланировку и не передавать '+(st?'Помещение':'Квартиру')+' третьим лицам без согласия '+R.Og+'.</p>'+
      '<p>5.3. Каждая из сторон вправе расторгнуть договор, письменно уведомив другую сторону не менее чем за 30 дней.</p>'+
      '<h4>6. Подписи сторон</h4>'+
      '<div class="ct-sign"><div><div class="ct-role">'+R.O+'</div><div>'+OWNER+'</div>'+sigBox(d.ownerSig,d.ownerT,OWNER,opt.tap==='O'?'data-osign="'+esc(d.id)+'"':'')+'</div>'+
      '<div><div class="ct-role">'+R.T+'</div><div>'+(t.fio?esc(t.fio):'______________________')+'</div>'+sigBox(t.sig,t.t,t.fio,opt.tap==='T'?'data-tsign="1"':'')+'</div></div>'+
      '</div>';
    return h;
  }
  function sigBox(src,t,who,tap){
    if(src==='gos')return '<div class="ct-sigbox"><div class="ct-stamp"><b>ПОДПИСАНО</b><br>через Госуслуги (демо)<br>'+esc(who||'')+'<br>'+(t?dtstr(t):'')+'</div></div><div class="ct-date">'+(t?'подписано '+dtstr(t):'')+'</div>';
    var ok=typeof src==='string'&&/^data:image\/png;base64,[A-Za-z0-9+\/=]+$/.test(src);
    if(!ok&&tap)return '<div class="ct-sigbox tap" role="button" tabindex="0" '+tap+'><span>✍ Нажмите, чтобы подписать</span></div><div class="ct-date">дата ________</div>';
    return '<div class="ct-sigbox">'+(ok?'<img alt="подпись" src="'+src+'">':'<span>подпись</span>')+'</div><div class="ct-date">'+(t?'подписано '+dtstr(t):'дата ________')+'</div>';
  }
  var CT_CSS='.ct{font-family:Georgia,"Times New Roman",serif;font-size:13px;line-height:1.5;color:#222}.ct h3{text-align:center;font-size:16px;margin:8px 0}.ct h4{font-size:13px;margin:12px 0 4px}.ct p{margin:4px 0}.ct-demo{font-family:Arial,sans-serif;background:#f7ecea;color:#c8603f;font-size:11px;font-weight:700;text-align:center;padding:6px;border-radius:4px}.ct-meta{display:flex;justify-content:space-between;color:#555;margin-bottom:8px}.ct-blank{color:#999}.ct-sign{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:8px}.ct-role{font-weight:700}.ct-sigbox{height:70px;border-bottom:1px solid #999;display:flex;align-items:flex-end;justify-content:center;margin-top:6px}.ct-sigbox img{max-height:66px;max-width:100%}.ct-sigbox span{color:#bbb;font-size:11px}.ct-date{font-size:11px;color:#777;margin-top:3px}.ct-sigbox.tap{cursor:pointer;background:#f7ecea;border:1px dashed #c8603f;border-radius:6px;align-items:center;min-height:56px}.ct-sigbox.tap span{color:#c8603f;font-size:13px;font-weight:700;font-family:Arial,sans-serif;text-align:center;padding:4px}.ct-stamp{font-family:Arial,sans-serif;border:2px solid #2e6fb5;color:#2e6fb5;border-radius:6px;padding:4px 6px;font-size:10px;line-height:1.3;text-align:center;margin-bottom:4px;background:#f3f8fd}.ct-stamp b{font-size:11px;letter-spacing:.5px}';
  function contractDoc(d){
    return '<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Договор (демо-образец)</title><style>body{margin:0;padding:20px;background:#fff}.wrap{max-width:720px;margin:0 auto}'+CT_CSS+'</style></head><body><div class="wrap">'+contractHtml(d)+'</div></body></html>';
  }
  function smsHtml(to,text,link){
    return '<div class="sms"><div class="sms-to">СМС на '+esc(to||'—')+' <span>(демо, не отправляется)</span></div><div class="sms-bubble">'+esc(text)+' <a href="'+esc(link)+'" class="sms-link" data-smslink>'+esc(link)+'</a></div></div>';
  }

  /* ---- signature pad (optional; touch events first for iOS Safari, pointer/mouse fallback) ---- */
  function SigPad(c){
    var ctx=null,strokes=[],cur=null,dpr=1;
    function setup(){var r=c.getBoundingClientRect();dpr=w.devicePixelRatio||1;var W=Math.round(r.width*dpr),H=Math.round(r.height*dpr);if(!W||!H)return false;
      if(c.width!==W||c.height!==H||!ctx){c.width=W;c.height=H;ctx=c.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.lineWidth=2.2;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#1f2a44';ctx.fillStyle='#1f2a44';redraw();}return true;}
    function redraw(){if(!ctx)return;ctx.clearRect(0,0,c.width,c.height);strokes.forEach(function(st){ctx.beginPath();ctx.arc(st[0].x,st[0].y,1.1,0,Math.PI*2);ctx.fill();for(var i=1;i<st.length;i++){ctx.beginPath();ctx.moveTo(st[i-1].x,st[i-1].y);ctx.lineTo(st[i].x,st[i].y);ctx.stroke();}});}
    function at(x,y){var r=c.getBoundingClientRect();return {x:x-r.left,y:y-r.top};}
    function start(p){if(!ctx&&!setup())return;cur=[p];strokes.push(cur);ctx.beginPath();ctx.arc(p.x,p.y,1.1,0,Math.PI*2);ctx.fill();}
    function move(p){if(!cur)return;var l=cur[cur.length-1];cur.push(p);ctx.beginPath();ctx.moveTo(l.x,l.y);ctx.lineTo(p.x,p.y);ctx.stroke();}
    function end(){cur=null;}
    c.style.touchAction='none';c.style.webkitUserSelect='none';c.style.userSelect='none';
    var touch=false,o={passive:false};
    c.addEventListener('touchstart',function(e){touch=true;e.preventDefault();var t=e.changedTouches[0];start(at(t.clientX,t.clientY));},o);
    c.addEventListener('touchmove',function(e){e.preventDefault();var t=e.changedTouches[0];move(at(t.clientX,t.clientY));},o);
    c.addEventListener('touchend',function(e){e.preventDefault();end();},o);
    c.addEventListener('touchcancel',end,o);
    if(w.PointerEvent){
      c.addEventListener('pointerdown',function(e){if(e.pointerType==='touch'||touch)return;e.preventDefault();try{c.setPointerCapture(e.pointerId);}catch(_){}start(at(e.clientX,e.clientY));},o);
      c.addEventListener('pointermove',function(e){if(e.pointerType==='touch'||touch)return;move(at(e.clientX,e.clientY));},o);
      ['pointerup','pointercancel'].forEach(function(n){c.addEventListener(n,function(e){if(e.pointerType!=='touch')end();});});
    }else{
      c.addEventListener('mousedown',function(e){if(touch)return;start(at(e.clientX,e.clientY));});
      c.addEventListener('mousemove',function(e){if(e.buttons&1)move(at(e.clientX,e.clientY));});
      w.addEventListener('mouseup',end);
    }
    var rs=function(){setTimeout(setup,60);};w.addEventListener('resize',rs);w.addEventListener('orientationchange',rs);
    setup();if(!ctx)setTimeout(setup,100);
    return {isEmpty:function(){return !strokes.length;},clear:function(){strokes=[];redraw();},data:function(){return c.toDataURL('image/png');},resize:setup};
  }
  /* ---- DEMO "Госуслуги" login / signing confirmation (no real auth, no real e-signature) ---- */
  var TENANT_DEMO={fio:'Иванов Иван Иванович',birth:'01.01.1990',passport:'0000 000000 выдан 01.01.2010 (демо)',reg:'г. Москва, ул. Примерная, д. 1, кв. 1'};
  function gosOverlay(inner){var ov=document.createElement('div');ov.className='g-ov';ov.innerHTML='<div class="g-sheet" role="dialog" aria-modal="true"><div class="g-head"><span class="g-mark">Г</span>Госуслуги <span class="g-demo">ДЕМО</span></div>'+inner+'</div>';document.body.appendChild(ov);return ov;}
  function gosLogin(cb){
    var ov=gosOverlay('<div class="g-spin"></div><p class="g-p">Вход через Госуслуги (демо)…</p><p class="g-s">Настоящий вход не выполняется, логин и пароль не запрашиваются.</p>');
    setTimeout(function(){ov.remove();cb&&cb();},1200);
  }
  function gosSign(info,cb){
    var ov=gosOverlay('<div class="g-t">Подписание документа</div><div class="g-doc"><div class="g-l">Документ</div><b>'+esc(info.doc)+'</b><div class="g-l">Подписант</div><b>'+esc(info.who)+'</b></div>'+
      '<p class="g-s">Демо-режим: настоящая электронная подпись не создаётся, в договор будет добавлена отметка «Подписано через Госуслуги (демо)».</p>'+
      '<button type="button" class="g-btn" id="g-ok">Подтвердить подписание</button><button type="button" class="g-btn2" id="g-no">Отмена</button>');
    ov.querySelector('#g-no').onclick=function(){ov.remove();};
    ov.addEventListener('click',function(e){if(e.target===ov)ov.remove();});
    ov.querySelector('#g-ok').onclick=function(){var sh=ov.querySelector('.g-sheet');sh.innerHTML='<div class="g-head"><span class="g-mark">Г</span>Госуслуги <span class="g-demo">ДЕМО</span></div><div class="g-spin"></div><p class="g-p">Подписываем (демо)…</p>';
      setTimeout(function(){ov.remove();cb&&cb(Date.now());},800);};
  }
  function ctTitle(d){return isStorage(d)?'Договор аренды нежилого помещения (кладовой)':'Договор найма жилого помещения';}
  function copy(text,done){
    function fb(){var t=document.createElement('textarea');t.value=text;t.setAttribute('readonly','');t.style.position='fixed';t.style.opacity='0';document.body.appendChild(t);t.select();try{document.execCommand('copy');}catch(e){}t.remove();done&&done();}
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(text).then(function(){done&&done();},fb);else fb();
  }

  w.DemoDeal={KEY:KEY,MG:MG,STEPS:STEPS,STATUS:STATUS,OWNER:OWNER,load:load,save:save,all:all,get:get,put:put,clear:clear,newId:newId,enc:enc,dec:dec,fromLink:fromLink,
    signLink:signLink,payLink:payLink,due:due,isStorage:isStorage,stepOf:stepOf,stepper:stepper,contractHtml:contractHtml,contractDoc:contractDoc,smsHtml:smsHtml,
    SigPad:SigPad,copy:copy,gosLogin:gosLogin,gosSign:gosSign,ctTitle:ctTitle,TENANT_DEMO:TENANT_DEMO,esc:esc,fmt:fmt,rub:rub,dstr:dstr,dtstr:dtstr,num:num,str:str,CT_CSS:CT_CSS};
})(window);

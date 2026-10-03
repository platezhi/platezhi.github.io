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
  function linkData(d){return {i:d.id,k:d.type,o:d.obj,a:d.addr,p:d.price,z:d.deposit,f:d.from,ph:d.phone||'',t:d.created};}
  function fromLink(x){
    if(!x||typeof x!=='object')return null;
    var d={id:str(x.i,40),type:x.k==='кл'?'кл':'кв',obj:str(x.o,80),addr:str(x.a,160),price:num(x.p,1e7),deposit:Math.max(0,Math.round(+x.z)||0),from:Math.min(11,Math.max(0,Math.round(+x.f)||0)),phone:str(x.ph,30),created:+x.t||Date.now(),status:'sent'};
    return d.id&&d.price&&d.addr?d:null;
  }
  function signLink(d){return baseUrl()+'sign.html?c='+enc(linkData(d));}
  function payLink(d){return baseUrl()+'pay.html?c='+enc({i:d.id,p:d.price,z:d.deposit,a:d.addr,f:d.from,k:d.type,o:d.obj,t:d.created});}
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
  function contractHtml(d){
    var st=isStorage(d),t=d.tenant||{};
    var R=st?{O:'Арендодатель',T:'Арендатор',Od:'Арендодателю',Td:'Арендатору',Tg:'Арендатора',Og:'Арендодателя'}:{O:'Наймодатель',T:'Наниматель',Od:'Наймодателю',Td:'Нанимателю',Tg:'Нанимателя',Og:'Наймодателя'};
    var title=st?'Договор аренды нежилого помещения (кладовой)':'Договор найма жилого помещения';
    var start='1 '+MG[d.from]+' 2026 г.';
    var h='<div class="ct">'+
      '<div class="ct-demo">ДЕМО-ОБРАЗЕЦ · не является юридически значимым документом</div>'+
      '<h3 class="ct-title">'+title+'</h3>'+
      '<div class="ct-meta"><span>г. ________________</span><span>'+dstr(d.created||Date.now())+'</span></div>'+
      '<p><b>'+OWNER+'</b>, именуемый в дальнейшем «'+R.O+'», с одной стороны, и '+line(t.fio,'ФИО ____________________')+
      ', паспорт '+line(t.passport,'серия, номер __________')+', тел. '+line(t.phone||d.phone,'______________')+
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
      '<div class="ct-sign"><div><div class="ct-role">'+R.O+'</div><div>'+OWNER+'</div>'+sigBox(d.ownerSig,d.ownerT)+'</div>'+
      '<div><div class="ct-role">'+R.T+'</div><div>'+(t.fio?esc(t.fio):'______________________')+'</div>'+sigBox(t.sig,t.t)+'</div></div>'+
      '</div>';
    return h;
  }
  function sigBox(src,t){
    var ok=typeof src==='string'&&/^data:image\/png;base64,[A-Za-z0-9+\/=]+$/.test(src);
    return '<div class="ct-sigbox">'+(ok?'<img alt="подпись" src="'+src+'">':'<span>подпись</span>')+'</div><div class="ct-date">'+(t?'подписано '+dtstr(t):'дата ________')+'</div>';
  }
  var CT_CSS='.ct{font-family:Georgia,"Times New Roman",serif;font-size:13px;line-height:1.5;color:#222}.ct h3{text-align:center;font-size:16px;margin:8px 0}.ct h4{font-size:13px;margin:12px 0 4px}.ct p{margin:4px 0}.ct-demo{font-family:Arial,sans-serif;background:#f7ecea;color:#c8603f;font-size:11px;font-weight:700;text-align:center;padding:6px;border-radius:4px}.ct-meta{display:flex;justify-content:space-between;color:#555;margin-bottom:8px}.ct-blank{color:#999}.ct-sign{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:8px}.ct-role{font-weight:700}.ct-sigbox{height:70px;border-bottom:1px solid #999;display:flex;align-items:flex-end;justify-content:center;margin-top:6px}.ct-sigbox img{max-height:66px;max-width:100%}.ct-sigbox span{color:#bbb;font-size:11px}.ct-date{font-size:11px;color:#777;margin-top:3px}';
  function contractDoc(d){
    return '<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Договор (демо-образец)</title><style>body{margin:0;padding:20px;background:#fff}.wrap{max-width:720px;margin:0 auto}'+CT_CSS+'</style></head><body><div class="wrap">'+contractHtml(d)+'</div></body></html>';
  }
  function smsHtml(to,text,link){
    return '<div class="sms"><div class="sms-to">СМС на '+esc(to||'—')+' <span>(демо, не отправляется)</span></div><div class="sms-bubble">'+esc(text)+' <a href="'+esc(link)+'" target="_blank" rel="noopener" class="sms-link">'+esc(link)+'</a></div></div>';
  }

  /* ---- signature pad (pointer events: mouse + touch + pen) ---- */
  function SigPad(c){
    var ctx=null,drawing=false,empty=true,last=null;
    function size(){
      var r=c.getBoundingClientRect(),dpr=w.devicePixelRatio||1,W=Math.round(r.width*dpr),H=Math.round(r.height*dpr);
      if(!W||!H)return;
      if(c.width!==W||c.height!==H||!ctx){c.width=W;c.height=H;ctx=c.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.lineWidth=2.2;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#1f2a44';ctx.fillStyle='#1f2a44';empty=true;}
    }
    function pos(e){var r=c.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};}
    c.style.touchAction='none';
    c.addEventListener('pointerdown',function(e){if(empty||!ctx)size();if(!ctx)return;drawing=true;last=pos(e);try{c.setPointerCapture(e.pointerId);}catch(_){}ctx.beginPath();ctx.arc(last.x,last.y,1.1,0,Math.PI*2);ctx.fill();empty=false;e.preventDefault();});
    c.addEventListener('pointermove',function(e){if(!drawing)return;var p=pos(e);ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(p.x,p.y);ctx.stroke();last=p;e.preventDefault();});
    ['pointerup','pointercancel'].forEach(function(n){c.addEventListener(n,function(){drawing=false;});});
    ['touchstart','touchmove'].forEach(function(n){c.addEventListener(n,function(e){e.preventDefault();},{passive:false});});
    return {isEmpty:function(){return empty;},clear:function(){if(ctx)ctx.clearRect(0,0,c.width,c.height);empty=true;},data:function(){return c.toDataURL('image/png');}};
  }
  function copy(text,done){
    function fb(){var t=document.createElement('textarea');t.value=text;t.setAttribute('readonly','');t.style.position='fixed';t.style.opacity='0';document.body.appendChild(t);t.select();try{document.execCommand('copy');}catch(e){}t.remove();done&&done();}
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(text).then(function(){done&&done();},fb);else fb();
  }

  w.DemoDeal={KEY:KEY,MG:MG,STEPS:STEPS,STATUS:STATUS,OWNER:OWNER,load:load,save:save,all:all,get:get,put:put,clear:clear,newId:newId,enc:enc,dec:dec,fromLink:fromLink,
    signLink:signLink,payLink:payLink,due:due,isStorage:isStorage,stepOf:stepOf,stepper:stepper,contractHtml:contractHtml,contractDoc:contractDoc,smsHtml:smsHtml,
    SigPad:SigPad,copy:copy,esc:esc,fmt:fmt,rub:rub,dstr:dstr,dtstr:dtstr,num:num,str:str,CT_CSS:CT_CSS};
})(window);

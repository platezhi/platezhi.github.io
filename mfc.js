/* Demo booking to МФЦ «Мои документы». Nothing is sent anywhere; stored in localStorage. */
(function(){
  var KEY='demoMfc_v1',V='19';
  var LIST=[
    {id:'tver',name:'МФЦ района Тверской',addr:'Москва, Настасьинский пер., д. 7',metro:'Пушкинская, Тверская, Чеховская',ll:[55.76777,37.60490]},
    {id:'arb',name:'МФЦ района Арбат',addr:'Москва, пер. Сивцев Вражек, д. 20',metro:'Смоленская, Кропоткинская',ll:[55.74795,37.59434]},
    {id:'ham',name:'МФЦ района Хамовники',addr:'Москва, Смоленский бульвар, д. 24, стр. 1',metro:'Смоленская, Парк культуры',ll:[55.74275,37.58582]},
    {id:'vao',name:'Флагманский офис ВАО',addr:'Москва, Щёлковское шоссе, д. 75',metro:'Щёлковская',ll:[55.81104,37.80093]},
    {id:'zao',name:'Флагманский офис ЗАО',addr:'Москва, Ярцевская ул., д. 19',metro:'Молодёжная',ll:[55.73826,37.41001]}
  ];
  var SERV=['Регистрация договора аренды','Выписка из ЕГРН','Регистрация по месту пребывания','Паспорт гражданина РФ','Консультация'];
  var MON=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  var MONN=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  var WD=['вс','пн','вт','ср','чт','пт','сб'];
  var DEMO='ДЕМО — запись не отправляется в МФЦ';
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function get(){try{return JSON.parse(localStorage.getItem(KEY)||'null');}catch(e){return null;}}
  function put(b){if(b)localStorage.setItem(KEY,JSON.stringify(b));else localStorage.removeItem(KEY);}
  function byId(id){for(var i=0;i<LIST.length;i++)if(LIST[i].id===id)return LIST[i];return null;}
  function hash(s){var h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}h^=h>>>15;h=Math.imul(h,2246822507);h^=h>>>13;return h>>>0;}
  function day0(d){var x=new Date(d);x.setHours(0,0,0,0);return x;}
  function ymd(d){return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);}
  function parse(s){var p=s.split('-');return new Date(+p[0],+p[1]-1,+p[2]);}
  function human(s){var d=parse(s);return d.getDate()+' '+MON[d.getMonth()]+' '+d.getFullYear()+', '+WD[d.getDay()];}
  var DAYS=30;
  function dayFull(mid,s){return hash(mid+s)%7===3;}            // demo: "нет свободных окон"
  function slots(mid,s){var r=[],now=new Date(),today=ymd(now)===s;
    for(var m=8*60;m<=19*60+30;m+=30){var t=('0'+Math.floor(m/60)).slice(-2)+':'+('0'+m%60).slice(-2),busy=hash(mid+s+t)%3===0,past=today&&m<=now.getHours()*60+now.getMinutes()+30;r.push({t:t,off:busy||past});}
    return r;}
  var st,ov,box,map;
  function ensure(){if(ov)return;ov=document.createElement('div');ov.className='ov mfcov';ov.id='mfcOv';ov.innerHTML='<div class="modal mfcm" id="mfcBox"></div>';document.body.appendChild(ov);box=ov.firstChild;
    ov.addEventListener('click',function(e){if(e.target===ov)close();});box.addEventListener('click',onClick);box.addEventListener('change',onChange);}
  function open(){ensure();st={step:1,tab:'list',mfc:null,date:null,time:null,serv:SERV[0],mo:null};var b=get();if(b){st.mfc=b.mfc;}render();ov.classList.add('show');}
  function close(){killMap();if(ov){ov.classList.remove('show');box.innerHTML='';}}
  function killMap(){if(map){try{map.remove();}catch(e){}map=null;}}
  function stepper(){var n=['МФЦ','Дата','Время','Подтверждение'];return '<div class="mfcst">'+n.map(function(x,i){var k=i+1;return '<span class="'+(k<st.step?'done':k===st.step?'on':'')+'">'+(k<st.step?'✓':k)+' '+x+'</span>';}).join('')+'</div>';}
  function mfcInfo(m){return '<b>'+esc(m.name)+'</b><br><small>'+esc(m.addr)+' · м. '+esc(m.metro)+'</small>';}
  function render(){killMap();var h='<div class="mbar"><a href="#" class="bk" data-mfback>← Назад</a></div><div class="mfch"><h3>Запись в МФЦ</h3><button type="button" class="mfcx" data-mx aria-label="Закрыть">×</button></div><div class="mfcdemo">'+DEMO+'</div>'+stepper();
    var m=st.mfc&&byId(st.mfc);
    if(st.step===1){
      h+='<div class="mfctabs"><button type="button" data-mtab="list" class="'+(st.tab==='list'?'on':'')+'">Списком</button><button type="button" data-mtab="map" class="'+(st.tab==='map'?'on':'')+'">На карте</button></div>';
      if(st.tab==='list')h+='<div class="mfcl">'+LIST.map(function(x){return '<div class="mfci'+(x.id===st.mfc?' on':'')+'" data-mfc="'+x.id+'" role="button" tabindex="0">'+mfcInfo(x)+'<br><small>ежедневно 8:00–20:00</small></div>';}).join('')+'</div>';
      else h+='<div id="mfcMap" class="mfcmap"></div><div class="mfcsel" id="mfcSel">'+(m?'Выбран: '+mfcInfo(m):'Нажмите на маркер, чтобы выбрать МФЦ')+'</div>';
      h+='<div class="mfcnav"><button class="btn" type="button" data-mx>Отмена</button><button class="btn" type="button" data-mnext'+(m?'':' disabled')+'>Далее: дата</button></div>';
    }else if(st.step===2){
      h+='<div class="mfcsel">'+mfcInfo(m)+'</div>'+cal();
      h+='<div class="mfcnav"><button class="btn" type="button" data-mback>Назад</button><button class="btn" type="button" data-mnext'+(st.date?'':' disabled')+'>Далее: время</button></div>';
    }else if(st.step===3){
      h+='<div class="mfcsel">'+mfcInfo(m)+'<br><small>'+human(st.date)+'</small></div><div class="mfcslots">'+slots(st.mfc,st.date).map(function(s){return '<button type="button" data-mslot="'+s.t+'"'+(s.off?' disabled':'')+' class="'+(s.t===st.time?'on':'')+'">'+s.t+'</button>';}).join('')+'</div><div class="mfclg">Серые — заняты</div>';
      h+='<div class="mfcnav"><button class="btn" type="button" data-mback>Назад</button><button class="btn" type="button" data-mnext'+(st.time?'':' disabled')+'>Далее</button></div>';
    }else{
      h+='<div class="mfcsum"><div><span>МФЦ</span>'+mfcInfo(m)+'</div><div><span>Дата и время</span><b>'+human(st.date)+', '+st.time+'</b></div>'+
        '<div><span>Заявитель</span><b>Яковлев Владимир Владимирович</b><br><small>'+esc(window.__profPhone?window.__profPhone():'+7 (968) 868-88-86')+'</small></div></div>'+
        '<label class="f" for="mfcServ">Услуга</label><select class="inp" id="mfcServ">'+SERV.map(function(s){return '<option'+(s===st.serv?' selected':'')+'>'+esc(s)+'</option>';}).join('')+'</select>'+
        '<p class="mfcp">Возьмите паспорт. Талон придёт в СМС (в демо — не приходит).</p>'+
        '<div class="mfcnav"><button class="btn" type="button" data-mback>Назад</button><button class="btn solid" type="button" data-mok>Записаться</button></div>';
    }
    box.innerHTML=h;
    if(st.step===1&&st.tab==='map')initMap();
  }
  function cal(){var t=day0(new Date()),end=new Date(t);end.setDate(end.getDate()+DAYS-1);
    if(!st.mo)st.mo=st.date?st.date.slice(0,7):ymd(t).slice(0,7);
    var y=+st.mo.slice(0,4),mo=+st.mo.slice(5)-1,first=new Date(y,mo,1),n=new Date(y,mo+1,0).getDate(),off=(first.getDay()+6)%7;
    var canPrev=new Date(y,mo,1)>new Date(t.getFullYear(),t.getMonth(),1),canNext=new Date(y,mo+1,1)<=end;
    var h='<div class="mcal"><div class="mcalh"><button type="button" data-mmo="-1"'+(canPrev?'':' disabled')+'>‹</button><b>'+MONN[mo]+' '+y+'</b><button type="button" data-mmo="1"'+(canNext?'':' disabled')+'>›</button></div><div class="mcalg">'+
      ['пн','вт','ср','чт','пт','сб','вс'].map(function(w){return '<i>'+w+'</i>';}).join('');
    for(var i=0;i<off;i++)h+='<span></span>';
    for(var d=1;d<=n;d++){var dt=new Date(y,mo,d),s=ymd(dt),out=dt<t||dt>end,full=!out&&(dayFull(st.mfc,s)||!slots(st.mfc,s).some(function(x){return !x.off;}));
      h+='<button type="button" data-mday="'+s+'"'+(out||full?' disabled':'')+' class="'+(s===st.date?'on':'')+(full?' full':'')+(s===ymd(t)?' today':'')+'"'+(full?' title="нет свободных окон"':'')+'>'+d+'</button>';}
    return h+'</div><div class="mfclg">Доступны ближайшие '+DAYS+' дней · <s>зачёркнуто</s> — нет свободных окон</div></div>';}
  function loadLeaflet(cb){if(window.L)return cb();
    var c=document.createElement('link');c.rel='stylesheet';c.href='vendor/leaflet/leaflet.css?v='+V;document.head.appendChild(c);
    var s=document.createElement('script');s.src='vendor/leaflet/leaflet.js?v='+V;s.onload=cb;s.onerror=function(){var e=document.getElementById('mfcMap');if(e)e.innerHTML='<p class="mfcp">Карта не загрузилась — выберите МФЦ списком.</p>';};document.head.appendChild(s);}
  function initMap(){loadLeaflet(function(){var el=document.getElementById('mfcMap');if(!el||map)return;
    L.Icon.Default.imagePath='vendor/leaflet/images/';
    map=L.map(el,{zoomControl:true,attributionControl:true}).setView([55.765,37.62],10);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© участники OpenStreetMap'}).addTo(map);
    var b=[];LIST.forEach(function(x){var mk=L.marker(x.ll,{title:x.name,alt:x.name}).addTo(map);mk.bindPopup('<b>'+esc(x.name)+'</b><br>'+esc(x.addr));
      mk.on('click',function(){pick(x.id,true);});if(mk._icon)mk._icon.setAttribute('data-mk',x.id);b.push(x.ll);});
    map.fitBounds(b,{padding:[24,24]});
    if(st.mfc){var m=byId(st.mfc);}
  });}
  function pick(id,fromMap){st.mfc=id;if(fromMap){var m=byId(id);document.getElementById('mfcSel').innerHTML='Выбран: '+mfcInfo(m);var n=box.querySelector('[data-mnext]');if(n)n.disabled=false;}else render();}
  function onClick(e){var t=e.target,el;
    if(t.closest('[data-mx]')){close();return;}
    if(t.closest('[data-mfback]')){e.preventDefault();if(st.step>1){st.step--;render();}else close();return;}
    if((el=t.closest('[data-mtab]'))){st.tab=el.getAttribute('data-mtab');render();return;}
    if((el=t.closest('[data-mfc]'))){st.date=null;st.time=null;st.mo=null;pick(el.getAttribute('data-mfc'));return;}
    if((el=t.closest('[data-mmo]'))&&!el.disabled){var y=+st.mo.slice(0,4),m=+st.mo.slice(5)-1+(+el.getAttribute('data-mmo'));var d=new Date(y,m,1);st.mo=ymd(d).slice(0,7);render();return;}
    if((el=t.closest('[data-mday]'))&&!el.disabled){st.date=el.getAttribute('data-mday');st.time=null;render();return;}
    if((el=t.closest('[data-mslot]'))&&!el.disabled){st.time=el.getAttribute('data-mslot');render();return;}
    if((el=t.closest('[data-mback]'))){st.step--;render();return;}
    if((el=t.closest('[data-mnext]'))&&!el.disabled){if(st.step===1&&!st.date){st.mo=null;}st.step++;render();box.scrollTop=0;return;}
    if(t.closest('[data-mok]')){var b={id:'М-'+(100000+hash(st.mfc+st.date+st.time+Date.now())%900000),mfc:st.mfc,date:st.date,time:st.time,serv:st.serv,created:Date.now()};put(b);close();renderCard();if(window.__mfcToast)window.__mfcToast('Вы записаны в МФЦ (демо)');return;}
  }
  function onChange(e){if(e.target.id==='mfcServ')st.serv=e.target.value;}
  function renderCard(){var c=document.getElementById('mfcCard'),f=document.getElementById('mfcField'),b=get(),m=b&&byId(b.mfc);
    if(f)f.innerHTML=m?'<div class="v">'+esc(m.name)+'</div>':'<a href="#" data-mfcopen>Указать</a>';
    if(!c)return;
    if(!m){c.innerHTML='';c.style.display='none';return;}
    var past=parse(b.date)<day0(new Date());
    c.style.display='';
    c.innerHTML='<div class="mfccard"><div class="mfcct">Запись в МФЦ'+(past?' · прошла':'')+'</div><div class="mfccw">'+human(b.date)+', '+b.time+'</div>'+
      '<div>'+esc(m.name)+'<br><small>'+esc(m.addr)+'</small></div><div><small>'+esc(b.serv)+' · № '+esc(b.id)+'</small></div>'+
      '<div class="mfcdemo">'+DEMO+'</div><div class="mfcca" id="mfcCa"><a href="#" data-mfcopen>Перенести</a><a href="#" data-mfccancel>Отменить запись</a></div></div>';}
  document.addEventListener('click',function(e){var t=e.target,el;
    if(t.closest('[data-mfcopen]')){e.preventDefault();open();return;}
    if(t.closest('[data-mfccancel]')){e.preventDefault();document.getElementById('mfcCa').innerHTML='<span>Отменить запись?</span><a href="#" data-mfcyes>Да, отменить</a><a href="#" data-mfcno>Нет</a>';return;}
    if(t.closest('[data-mfcyes]')){e.preventDefault();put(null);renderCard();if(window.__mfcToast)window.__mfcToast('Запись отменена');return;}
    if(t.closest('[data-mfcno]')){e.preventDefault();renderCard();return;}
  });
  window.Mfc={open:open,close:close,render:renderCard,clear:function(){put(null);renderCard();},get:get,LIST:LIST};
  if(document.readyState!=='loading')renderCard();else document.addEventListener('DOMContentLoaded',renderCard);
})();

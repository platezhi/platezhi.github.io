/* Shared client-side DEMO logic for the rent flow: contract template, links, storage, signature pad.
   No backend: state lives in localStorage of this browser only. */
(function(w){
  'use strict';
  var KEY='demoDeals_v1';
  var MG=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  var STEPS=['Объект','Цена','Опись','Страховка','Договор','СМС','Подпись арендатора','Ваша подпись','Оплата','3D-осмотр'];
  var STATUS={inv:'Опись имущества',ins:'Страхование',draft:'Договор сформирован',sent:'Отправлено, ждём подпись',tenant_signed:'Арендатор подписал',owner_signed:'Подписан обеими сторонами · ждём оплату',paid:'Оплачено · сдаётся',cancelled:'Отменена',ended:'Завершена'};
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
  function linkData(d){return {i:d.id,k:d.type,o:d.obj,a:d.addr,p:d.price,z:d.deposit,f:d.from,ph:d.phone||'',t:d.created,b:d.objId||'',x:d.tax?d.tax.k:'',s:d.ins?[d.ins.owner.no,d.ins.owner.premium,d.ins.tenant.no,d.ins.tenant.premium]:0,v:(d.inv||[]).slice(0,60).map(function(i){return [i.room,i.name,+i.qty||1,+i.cond||0,+i.val||0,i.note||''];})};}
  function fromLink(x){
    if(!x||typeof x!=='object')return null;
    var d={id:str(x.i,40),type:x.k==='кл'?'кл':'кв',obj:str(x.o,80),addr:str(x.a,160),price:num(x.p,1e7),deposit:Math.max(0,Math.round(+x.z)||0),from:Math.min(11,Math.max(0,Math.round(+x.f)||0)),phone:str(x.ph,30),created:+x.t||Date.now(),objId:str(x.b,20),status:'sent'};
    if(x.x&&TAX[x.x])d.tax={k:x.x};
    if(Array.isArray(x.s)&&x.s.length===4)d.ins={owner:{no:str(x.s[0],30),premium:num(x.s[1],1e7)},tenant:{no:str(x.s[2],30),premium:num(x.s[3],1e7)}};
    if(Array.isArray(x.v))d.inv=x.v.slice(0,60).filter(Array.isArray).map(function(a,k){return {id:'l'+k,room:str(a[0],30),name:str(a[1],60),qty:num(a[2],999)||1,cond:Math.min(2,Math.max(0,Math.round(+a[3])||0)),val:num(a[4],1e8),note:str(a[5],120),photo:''};});
    return d.id&&d.price&&d.addr?d:null;
  }
  function signLink(d){return baseUrl()+'sign.html?c='+enc(linkData(d));}
  function payLink(d){return baseUrl()+'pay.html?c='+enc({b:d.objId||'',n:d.tenant&&d.tenant.fio||'',ti:insTenant(d),tn:d.ins?d.ins.tenant.no:'',i:d.id,p:d.price,z:d.deposit,a:d.addr,f:d.from,k:d.type,o:d.obj,t:d.created});}
  /* ---- owner's tax status (demo profile) ---- */
  var TAXKEY='demoTaxProfile_v1';
  var TAX={ip:{k:'ip',rate:0.06,short:'ИП',opt:'ИП · УСН 6% (8% при превышении лимита)',name:'ИП · УСН 6% (8% при превышении лимита)',tax:'УСН 6%',ct:'индивидуальный предприниматель, упрощённая система налогообложения (УСН «доходы», ставка 6%; 8% при превышении лимита доходов)'},
    sz:{k:'sz',rate:0.04,short:'Самозанятый',opt:'Самозанятый · НПД 4%',name:'Самозанятый · НПД 4%',tax:'НПД 4%',ct:'плательщик налога на профессиональный доход (самозанятый), ставка 4% с доходов от физических лиц'},
    fl:{k:'fl',rate:0.13,short:'Физлицо',opt:'Физлицо · НДФЛ 13%',name:'Физлицо · НДФЛ 13%',tax:'НДФЛ 13%',ct:'физическое лицо, налог на доходы физических лиц (НДФЛ) 13%'}};
  function taxProfile(){var p=null;try{p=JSON.parse(localStorage.getItem(TAXKEY));}catch(e){}if(!p||typeof p!=='object')p={ip:true,sz:false,rentAs:'ip'};p.fl=true;if(!avail(p,p.rentAs))p.rentAs=taxPref(p);return p;}
  function avail(p,k){return k==='fl'||(k==='ip'&&!!p.ip)||(k==='sz'&&!!p.sz);}
  function taxPref(p){return p.ip?'ip':p.sz?'sz':'fl';}
  function saveTaxProfile(p){p.fl=true;if(!avail(p,p.rentAs))p.rentAs=taxPref(p);localStorage.setItem(TAXKEY,JSON.stringify(p));}
  function taxOpts(p){p=p||taxProfile();return ['ip','sz','fl'].filter(function(k){return avail(p,k);}).map(function(k){return TAX[k];});}
  function taxDefault(p){p=p||taxProfile();return avail(p,p.rentAs)?p.rentAs:taxPref(p);}
  function taxOf(amount,k){var t=TAX[k]||TAX.fl;return Math.round((+amount||0)*t.rate*100)/100;}
  function taxStatusText(p){p=p||taxProfile();return taxOpts(p).map(function(t){return t.name;}).join(', ');}
  /* ---- demo invoices («Выставить счёт») ---- */
  var BKEY='demoBills_v1';
  function bills(){try{var b=JSON.parse(localStorage.getItem(BKEY));if(b&&typeof b==='object'&&b.bills)return b;}catch(e){}return {bills:{},n:0};}
  function billAll(){var b=bills().bills;return Object.keys(b).map(function(k){return b[k];}).sort(function(a,c){return (c.created||0)-(a.created||0);});}
  function billGet(id){return bills().bills[id]||null;}
  function billPut(x){var b=bills();if(!b.bills[x.id]){b.n=(b.n||0)+1;x.no=x.no||b.n;}b.bills[x.id]=x;localStorage.setItem(BKEY,JSON.stringify(b));return x;}
  function billClear(){localStorage.removeItem(BKEY);}
  function billLink(x){return baseUrl()+'invoice.html?c='+enc({i:x.id,n:x.no,k:x.kind,a:x.amount,p:x.purpose,ph:x.phone,t:x.created});}
  function ctNo(d){var t=new Date(d.created||Date.now());return 'Д-'+t.getFullYear()+p2(t.getMonth()+1)+p2(t.getDate())+'-'+String(d.id||'').slice(-4).toUpperCase();}
  function period(d){var f=d.from||0;return {from:'01.'+p2(f+1)+'.2026',to:dstr(new Date(2026,f+11,0))};}
  /* ---- DEMO "Моё проживание" QR: link to check.html with deal summary (not an official document) ---- */
  function shortName(f){var a=String(f||'').trim().split(/\s+/);return a[0]?a[0]+(a[1]?' '+a[1][0]+'.':'')+(a[2]?a[2][0]+'.':''):'';}
  function checkData(d){var t=d.tenant||{},pr=period(d);return {i:d.id,n:t.fio||'',a:d.addr,k:d.type,no:ctNo(d),d:dstr(d.created||Date.now()),f:pr.from,u:pr.to,o:shortName(OWNER),s:d.status==='paid'?'paid':d.status==='ended'?'ended':'unpaid',pd:d.paidT?dstr(d.paidT):''};}
  function checkLink(d){var b=location.protocol==='file:'?'https://platezhi.github.io/':baseUrl();return b+'check.html?c='+enc(checkData(d));}
  function qrSvg(text){if(!w.qrcode)return '<div class="qr-miss">QR недоступен</div>';var q=w.qrcode(0,'L');q.addData(text);q.make();return q.createSvgTag({cellSize:4,margin:16,scalable:true,alt:'QR-код проверки проживания (демо)'});}
  function qrCard(d,title){var L=checkLink(d),pr=period(d),t=d.tenant||{};
    return '<div class="qr-card"><div class="qr-h">'+esc(title||'Моё проживание')+' <span class="qr-demo">ДЕМО</span></div>'+
      '<div class="qr-row"><div class="qr-img" data-qr>'+qrSvg(L)+'</div><div class="qr-info"><div><span>Арендатор</span><b>'+esc(t.fio||'—')+'</b></div><div><span>Адрес</span><b>'+esc(d.addr)+'</b></div>'+
      '<div><span>Договор</span><b>№ '+esc(ctNo(d))+' от '+dstr(d.created||Date.now())+'</b></div><div><span>Срок</span><b>'+pr.from+' — '+pr.to+'</b></div>'+
      '<div><span>Оплата</span><b class="'+(d.status==='paid'?'qr-ok':'')+'">'+(d.status==='paid'?'оплачено':d.status==='ended'?'договор завершён':'не оплачено')+'</b></div></div></div>'+
      '<a class="qr-link" href="'+esc(L)+'" data-checklink>Открыть страницу проверки</a>'+
      '<div class="qr-note">Демо: QR ведёт на страницу с данными договора. Это не документ о регистрации и не подтверждается МВД.</div></div>';}
  function due(d){return (d.price||0)+(d.deposit||0)+insTenant(d);}
  function ownerDue(d){return (d.price||0)+(d.deposit||0);}
  function isStorage(d){return d.type==='кл';}
  function stepOf(d,priceOpen){
    if(!d)return priceOpen?1:0;
    return d.status==='paid'?(d.scanIn?10:9):({inv:2,ins:3,draft:5,sent:6,tenant_signed:7,owner_signed:8}[d.status]||0);
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
      '<div class="ct-meta"><span>г. ________________</span><span>№ '+esc(ctNo(d))+' от '+dstr(d.created||Date.now())+'</span></div>'+
      '<p><b>'+OWNER+'</b>'+(d.tax&&TAX[d.tax.k]?' ('+TAX[d.tax.k].ct+')':'')+', именуемый в дальнейшем «'+R.O+'», с одной стороны, и '+line(t.fio,'ФИО ____________________')+
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
      (d.tax&&TAX[d.tax.k]?'<p>'+(st?'3.3':'3.4')+'. Налоговый статус '+R.Og+': <b>'+TAX[d.tax.k].name+'</b>. Сумма налога с ежемесячной платы — <b>'+rub(taxOf(d.price,d.tax.k))+'</b> ('+Math.round(TAX[d.tax.k].rate*100)+'% от '+rub(d.price)+'). Налог уплачивает '+R.O+' самостоятельно; плата для '+R.Tg+' не увеличивается. Залог доходом не является до его зачёта.</p>':'')+
      '<h4>4. Залог</h4><p>4.1. '+R.T+' вносит обеспечительный платёж (залог) в размере <b>'+rub(d.deposit)+'</b>. Залог возвращается при прекращении договора при отсутствии задолженности и ущерба.</p>'+
      '<h4>5. Права и обязанности сторон</h4>'+
      '<p>5.1. '+R.O+' обязуется передать '+(st?'Помещение':'Квартиру')+' в состоянии, пригодном для использования, и не препятствовать пользованию.</p>'+
      '<p>5.2. '+R.T+' обязуется использовать '+(st?'Помещение':'Квартиру')+' по назначению, своевременно вносить плату, бережно относиться к имуществу, не производить перепланировку и не передавать '+(st?'Помещение':'Квартиру')+' третьим лицам без согласия '+R.Og+'.</p>'+
      '<p>5.3. Каждая из сторон вправе расторгнуть договор, письменно уведомив другую сторону не менее чем за 30 дней.</p>'+
      (d.inv&&d.inv.length?'<p>5.4. Перечень имущества, передаваемого вместе с '+(st?'Помещением':'Квартирой')+', и его состояние указаны в Приложении №1 (опись имущества), которое является неотъемлемой частью договора.</p>':'')+
      (d.ins?'<p>5.5. Страхование является обязательным условием сделок через сервис «Мои документы» (условие сервиса, а не требование закона). '+R.O+' страхует '+(st?'Помещение':'Квартиру')+' и свою ответственность (полис № '+esc(d.ins.owner.no)+', премия '+rub(d.ins.owner.premium)+' в год, оплачивает '+R.O+'); '+R.T+' страхует свою гражданскую ответственность перед соседями и '+R.Od.replace(/ю$/,'ем')+' (полис № '+esc(d.ins.tenant.no)+', премия '+rub(d.ins.tenant.premium)+' в год, оплачивается вместе с первым платежом). Условия полисов — в Приложении №2.</p>':'')+
      '<h4>6. Подписи сторон</h4>'+
      '<div class="ct-sign"><div><div class="ct-role">'+R.O+'</div><div>'+OWNER+'</div>'+sigBox(d.ownerSig,d.ownerT,OWNER,opt.tap==='O'?'data-osign="'+esc(d.id)+'"':'')+'</div>'+
      '<div><div class="ct-role">'+R.T+'</div><div>'+(t.fio?esc(t.fio):'______________________')+'</div>'+sigBox(t.sig,t.t,t.fio,opt.tap==='T'?'data-tsign="1"':'')+'</div></div>'+
      invAppendix(d,R)+insAppendix(d,R)+'</div>';
    return h;
  }
  /* ---- inventory (опись имущества) ---- */
  var CONDS=['новое','хорошее','есть дефекты'];
  var INV_KV=[['Кухня',[['Холодильник',1,30000],['Плита',1,20000],['Вытяжка',1,8000],['Микроволновка',1,6000],['Кухонный гарнитур',1,60000],['Стол',1,8000],['Стулья',4,8000]]],
    ['Комната',[['Кровать',1,25000],['Матрас',1,15000],['Шкаф',1,20000],['Телевизор',1,25000],['Шторы',1,5000]]],
    ['Санузел',[['Стиральная машина',1,25000],['Бойлер',1,12000],['Зеркало',1,3000]]],
    ['Прихожая',[['Шкаф',1,12000],['Ключи',2,2000]]]];
  var INV_KL=[['Кладовая',[['Стеллажи',2,8000],['Ключи',2,1000]]]];
  var iseq=0;
  function invId(){iseq++;return 'i'+Date.now().toString(36).slice(-4)+iseq.toString(36);}
  function invItem(room,name,qty,val){return {id:invId(),room:room,name:name,qty:qty||1,cond:1,val:val||0,note:'',photo:''};}
  function invDefault(type){var L=[];(type==='кл'?INV_KL:INV_KV).forEach(function(r){r[1].forEach(function(x){L.push(invItem(r[0],x[0],x[1],x[2]));});});return L;}
  function invRooms(type,inv){var r=(type==='кл'?INV_KL:INV_KV).map(function(x){return x[0];});(inv||[]).forEach(function(i){if(r.indexOf(i.room)<0)r.push(i.room);});return r;}
  function invTotal(inv){return (inv||[]).reduce(function(a,i){return a+(+i.val||0);},0);}
  var RET={ok:['на месте',0],dmg:['повреждено',0.3],miss:['отсутствует',1]};
  function retCalc(d,sel){var sum=0;(d.inv||[]).forEach(function(i){var k=sel&&sel[i.id]||'ok';sum+=Math.round((+i.val||0)*(RET[k]?RET[k][1]:0));});var ded=Math.min(sum,d.deposit||0);return {raw:sum,deduct:ded,refund:Math.max(0,(d.deposit||0)-ded)};}
  function invAppendix(d,R){
    var inv=d.inv;if(!inv||!inv.length)return '';var n=0,t=d.tenant||{};
    var h='<div class="ct-app"><h4 class="ct-apph">Приложение №1 к договору № '+esc(ctNo(d))+' от '+dstr(d.created||Date.now())+'<br>Опись имущества (акт приёма-передачи)</h4>'+
      '<div class="ct-invw"><table class="ct-inv"><thead><tr><th>№</th><th>Наименование</th><th>Кол-во</th><th>Состояние</th><th>Оценка, руб.</th><th>Примечание</th></tr></thead><tbody>';
    invRooms(d.type,inv).forEach(function(room){var its=inv.filter(function(i){return i.room===room;});if(!its.length)return;
      h+='<tr class="ct-invr"><td colspan="6">'+esc(room)+'</td></tr>';
      its.forEach(function(i){n++;var ph=typeof i.photo==='string'&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/=]+$/.test(i.photo);
        h+='<tr><td>'+n+'</td><td>'+esc(i.name)+'</td><td>'+(+i.qty||1)+'</td><td>'+esc(CONDS[i.cond]||CONDS[1])+'</td><td>'+(i.val?fmt(i.val).replace('.00',''):'—')+'</td><td>'+esc(i.note||'')+(ph?'<img class="ct-invph" alt="фото" src="'+i.photo+'">':'')+'</td></tr>';});
    });
    h+='</tbody></table></div><p>Итого предметов: <b>'+n+'</b>; общая оценочная стоимость: <b>'+rub(invTotal(inv))+'</b>.</p>'+
      '<p class="ct-invsig">Опись подписана сторонами в составе договора: '+R.O+' — '+(d.ownerSig?'подписано'+(d.ownerT?' '+dtstr(d.ownerT):''):'________')+'; '+R.T+' — '+(t.sig?'подписано'+(t.t?' '+dtstr(t.t):''):'________')+(d.ownerSig==='gos'||t.sig==='gos'?' (через Госуслуги, демо)':'')+'.</p></div>';
    return h;
  }
  /* ---- DEMO insurance (condition of deals via the service, NOT a legal requirement) ---- */
  var INSURER='ООО «Демо-Страхование» (вымышленная компания)';
  function insTitles(d){var st=isStorage(d);return {owner:st?'Страхование кладовой и ответственности арендодателя':'Страхование квартиры и ответственности наймодателя',tenant:st?'Страхование гражданской ответственности арендатора перед соседями и арендодателем':'Страхование гражданской ответственности нанимателя перед соседями и наймодателем'};}
  function insCover(d){var st=isStorage(d),inv=invTotal(d.inv);
    return {owner:[['Отделка и конструктив '+(st?'помещения':'квартиры')+' (пожар, залив, взрыв газа, противоправные действия третьих лиц)',st?200000:1000000],['Имущество по описи (Приложение №1)',Math.max(inv,50000)],['Ответственность '+(st?'арендодателя':'наймодателя')+' перед соседями',500000]],
      tenant:[['Ущерб соседям (залив, пожар по вине '+(st?'арендатора':'нанимателя')+')',500000],['Ущерб '+(st?'арендодателю':'наймодателю')+': отделка и имущество по описи',300000]]};}
  function insMake(d){var k=String(d.id||'').slice(-5).toUpperCase(),y=new Date(d.created||Date.now()).getFullYear();
    return {owner:{no:'ДЕМО-НД-'+y+'-'+k,premium:Math.max(500,Math.round((d.price||0)*12*0.015))},tenant:{no:'ДЕМО-ГО-'+y+'-'+k,premium:3000},t:Date.now()};}
  function insTenant(d){return d&&d.ins&&d.ins.tenant?(+d.ins.tenant.premium||0):0;}
  var INS_NOTE='Страхование обязательно для сделок через сервис «Мои документы» — это условие сервиса, а не требование закона. Демо: полисы условные, страховщик вымышленный, деньги не списываются.';
  function insCard(d,who,opt){opt=opt||{};var T=insTitles(d),C=insCover(d),p=d.ins&&d.ins[who];if(!p)return '';
    return '<div class="ins-card" data-ins="'+who+'"><label class="ins-h"><input type="checkbox" checked disabled> <span>'+esc(T[who])+'</span></label>'+
      '<div class="ins-sub">'+(who==='owner'?'Полис наймодателя':'Полис нанимателя')+' · № '+esc(p.no)+' · <b>обязательно для сделок через сервис</b></div>'+
      '<ul class="ins-cov">'+C[who].map(function(c){return '<li><span>'+esc(c[0])+'</span><b>до '+fmt(c[1]).replace('.00','')+' ₽</b></li>';}).join('')+'</ul>'+
      '<div class="ins-prem"><span>Страховая премия за срок договора</span><b>'+rub(p.premium)+'</b></div>'+
      '<div class="ins-pay">'+(who==='owner'?'Оплачивает наймодатель — добавится в раздел СТРАХОВКИ в кабинете ('+(isStorage(d)?'1,5% годовой аренды':'1,5% годовой аренды')+').':'Оплачивает наниматель — добавляется к первому платежу (1-й месяц + залог + страховка).')+'</div></div>';}
  function insAppendix(d,R){if(!d.ins)return '';var T=insTitles(d),C=insCover(d),t=d.tenant||{},pr=period(d);
    function pol(who,holder){var p=d.ins[who];return '<div class="ct-pol"><p><b>Полис № '+esc(p.no)+' (демо)</b> — '+esc(T[who])+'</p><p>Страховщик: '+INSURER+'. Страхователь: '+holder+'. Объект: '+esc(d.addr)+'. Срок: '+pr.from+' — '+pr.to+'.</p>'+
      '<table class="ct-inv"><tbody>'+C[who].map(function(c){return '<tr><td>'+esc(c[0])+'</td><td>до '+fmt(c[1]).replace('.00','')+' руб.</td></tr>';}).join('')+'<tr><td><b>Страховая премия</b></td><td><b>'+rub(p.premium)+'</b></td></tr></tbody></table></div>';}
    return '<div class="ct-app"><h4 class="ct-apph">Приложение №2 к договору № '+esc(ctNo(d))+'<br>Полисы страхования (демо)</h4>'+
      '<p>Страхование является обязательным условием сделок через сервис «Мои документы» (условие сервиса, а не требование закона).</p>'+
      pol('owner',esc(OWNER)+' ('+R.O+')')+pol('tenant',(t.fio?esc(t.fio):'______________')+' ('+R.T+')')+
      '<p class="ct-invsig">ДЕМО: полисы не выпускаются, страховщик вымышленный.</p></div>';}
  function sigBox(src,t,who,tap){
    if(src==='gos')return '<div class="ct-sigbox"><div class="ct-stamp"><b>ПОДПИСАНО</b><br>через Госуслуги (демо)<br>'+esc(who||'')+'<br>'+(t?dtstr(t):'')+'</div></div><div class="ct-date">'+(t?'подписано '+dtstr(t):'')+'</div>';
    var ok=typeof src==='string'&&/^data:image\/png;base64,[A-Za-z0-9+\/=]+$/.test(src);
    if(!ok&&tap)return '<div class="ct-sigbox tap" role="button" tabindex="0" '+tap+'><span>✍ Нажмите, чтобы подписать</span></div><div class="ct-date">дата ________</div>';
    return '<div class="ct-sigbox">'+(ok?'<img alt="подпись" src="'+src+'">':'<span>подпись</span>')+'</div><div class="ct-date">'+(t?'подписано '+dtstr(t):'дата ________')+'</div>';
  }
  var CT_CSS='.ct{font-family:Georgia,"Times New Roman",serif;font-size:13px;line-height:1.5;color:#222}.ct h3{text-align:center;font-size:16px;margin:8px 0}.ct h4{font-size:13px;margin:12px 0 4px}.ct p{margin:4px 0}.ct-demo{font-family:Arial,sans-serif;background:#f7ecea;color:#c8603f;font-size:11px;font-weight:700;text-align:center;padding:6px;border-radius:4px}.ct-meta{display:flex;justify-content:space-between;color:#555;margin-bottom:8px}.ct-blank{color:#999}.ct-sign{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:8px}.ct-role{font-weight:700}.ct-sigbox{height:70px;border-bottom:1px solid #999;display:flex;align-items:flex-end;justify-content:center;margin-top:6px}.ct-sigbox img{max-height:66px;max-width:100%}.ct-sigbox span{color:#bbb;font-size:11px}.ct-date{font-size:11px;color:#777;margin-top:3px}.ct-sigbox.tap{cursor:pointer;background:#f7ecea;border:1px dashed #c8603f;border-radius:6px;align-items:center;min-height:56px}.ct-sigbox.tap span{color:#c8603f;font-size:13px;font-weight:700;font-family:Arial,sans-serif;text-align:center;padding:4px}.ct-stamp{font-family:Arial,sans-serif;border:2px solid #2e6fb5;color:#2e6fb5;border-radius:6px;padding:4px 6px;font-size:10px;line-height:1.3;text-align:center;margin-bottom:4px;background:#f3f8fd}.ct-stamp b{font-size:11px;letter-spacing:.5px}.ct-app{margin-top:18px;border-top:1px dashed #bbb;padding-top:10px}.ct-apph{text-align:center;font-size:13px}.ct-invw{overflow-x:auto;-webkit-overflow-scrolling:touch}.ct-inv{width:100%;border-collapse:collapse;font-size:11.5px;font-family:Arial,sans-serif;margin:6px 0}.ct-inv th,.ct-inv td{border:1px solid #ccc;padding:3px 5px;text-align:left;vertical-align:top}.ct-inv th{background:#f4f4f4;font-weight:700}.ct-invr td{background:#faf3f1;font-weight:700;color:#c8603f}.ct-invph{display:block;max-width:56px;max-height:56px;margin-top:3px;border-radius:3px}.ct-invsig{font-size:12px;color:#444}.ct-pol{margin:8px 0}';
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
    SigPad:SigPad,copy:copy,TAX:TAX,taxProfile:taxProfile,saveTaxProfile:saveTaxProfile,taxOpts:taxOpts,taxDefault:taxDefault,taxOf:taxOf,taxStatusText:taxStatusText,billAll:billAll,billGet:billGet,billPut:billPut,billClear:billClear,billLink:billLink,insMake:insMake,insCard:insCard,insTitles:insTitles,insTenant:insTenant,INS_NOTE:INS_NOTE,ownerDue:ownerDue,CONDS:CONDS,RET:RET,invDefault:invDefault,invItem:invItem,invRooms:invRooms,invTotal:invTotal,retCalc:retCalc,ctNo:ctNo,period:period,checkData:checkData,checkLink:checkLink,qrSvg:qrSvg,qrCard:qrCard,gosLogin:gosLogin,gosSign:gosSign,ctTitle:ctTitle,TENANT_DEMO:TENANT_DEMO,esc:esc,fmt:fmt,rub:rub,dstr:dstr,dtstr:dtstr,num:num,str:str,CT_CSS:CT_CSS};
})(window);

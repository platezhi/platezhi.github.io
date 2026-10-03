/* Unified «← Назад» control: previous screen if we came from this site, otherwise the cabinet. */
(function(){
  var me=document.currentScript,FB=(me&&me.getAttribute('data-fallback'))||'cabinet.html',FIX=me&&me.hasAttribute('data-fixed'),NOBAR=me&&me.hasAttribute('data-nobar');
  var css='.bkbar{max-width:760px;margin:0 auto;padding:10px 16px 0;box-sizing:border-box}.bkbar.fix{position:fixed;top:0;left:0;z-index:30;max-width:none}'+
    '.bk{display:inline-flex;align-items:center;gap:4px;color:#c8603f;background:#f7ecea;font:600 14px/1.2 Roboto,"Segoe UI",system-ui,-apple-system,Helvetica,Arial,sans-serif;text-decoration:none;padding:8px 12px;border-radius:4px;border:0;cursor:pointer;-webkit-tap-highlight-color:transparent}.bk:hover{background:#efdbd6}';
  var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
  function sameOrigin(){try{return !!document.referrer&&new URL(document.referrer).origin===location.origin;}catch(e){return false;}}
  function go(fb){if(sameOrigin()&&history.length>1)history.back();else location.href=fb||FB;}
  window.DemoBack={go:go};
  function bar(){if(document.getElementById('bkBar'))return;var d=document.createElement('div');d.className='bkbar'+(FIX?' fix':'');d.id='bkBar';
    d.innerHTML='<a class="bk" id="bkBtn" href="'+FB+'" data-goback>← Назад</a>';
    var h=document.querySelector('header.top');if(h&&h.parentNode)h.parentNode.insertBefore(d,h.nextSibling);else document.body.insertBefore(d,document.body.firstChild);}
  document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('[data-goback]');if(!a)return;e.preventDefault();go(a.getAttribute('href'));});
  if(NOBAR)return;
  if(document.body)bar();else document.addEventListener('DOMContentLoaded',bar);
})();

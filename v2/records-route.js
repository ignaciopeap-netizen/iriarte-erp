// Iriarte ERP V2 · extensión de ruta estable para Registros
(function(){
'use strict';
const coreRoute=window.iriarteRoute,coreReload=window.reloadIriarte;
let syncing=false;
function nav(){return document.querySelector('#main-nav')}
function ensureNav(){
 const n=nav();if(!n)return null;
 let a=n.querySelector('[data-route="registros"]');
 if(!a){
  a=document.createElement('a');a.className='nav-item';a.href='#registros';a.dataset.route='registros';a.textContent='Registros';a.title='Registros';
  const reports=n.querySelector('[data-route="informes"]');if(reports)n.insertBefore(a,reports);else n.appendChild(a)
 }
 return a
}
function markActive(){const a=ensureNav();document.querySelectorAll('#main-nav .nav-item').forEach(x=>x.classList.toggle('active',x===a&&window.APP?.route==='registros'))}
function renderRecords(clear=false){
 if(window.APP?.route!=='registros')return;
 const view=document.querySelector('#app-view');if(clear&&view)view.innerHTML='';markActive();
 if(typeof window.renderIriarteRecords==='function')window.renderIriarteRecords();
 document.dispatchEvent(new CustomEvent('iriarte:route',{detail:{route:'registros'}}))
}
function goRecords(updateHash=true){
 if(!window.APP)return;
 syncing=true;window.APP.route='registros';
 if(updateHash&&location.hash!=='#registros')history.replaceState(null,'','#registros');
 renderRecords(true);syncing=false
}
window.iriarteRoute=function(route){if(route==='registros')return goRecords(true);return coreRoute?coreRoute(route):undefined};
if(coreReload)window.reloadIriarte=async function(){await coreReload();if(location.hash==='#registros'){window.APP.route='registros';renderRecords(true)}};
document.addEventListener('click',e=>{const a=e.target.closest('a[data-route="registros"]');if(!a)return;e.preventDefault();e.stopImmediatePropagation();goRecords(true)},true);
window.addEventListener('hashchange',()=>{if(location.hash==='#registros')goRecords(false)});
function sync(){
 ensureNav();
 if(!syncing&&location.hash==='#registros'&&window.APP&&window.APP.route!=='registros')goRecords(false);
 else if(window.APP?.route==='registros')markActive()
}
new MutationObserver(sync).observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('DOMContentLoaded',sync);window.addEventListener('load',sync);
})();

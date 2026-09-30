// Iriarte ERP V2 · navegación canónica
(function(){
'use strict';
const coreRoute=window.iriarteRoute;
const coreReload=window.reloadIriarte;
const ROUTES=[
 ['inicio','Inicio'],['clientes','Clientes'],['proyectos','Proyectos'],['presupuestos','Presupuestos'],['facturas','Facturas'],
 ['proveedores','Proveedores'],['compras','Compras'],['obra','Obra'],['horas','Horas'],['documentos','Documentos'],
 ['finanzas','Banco'],['gastos','Gastos generales'],['registros','Registros'],['informes','Finanzas']
];
const routeSet=new Set(ROUTES.map(x=>x[0]));
const starts=new Set(['presupuestos','proveedores','obra','finanzas']);
let syncing=false,timer;
function nav(){return document.querySelector('#main-nav')}
function correctNav(n){
 const items=[...n.querySelectorAll(':scope > .nav-item[data-route]')];
 if(items.length!==ROUTES.length)return false;
 return ROUTES.every(([route,label],i)=>items[i]?.dataset.route===route&&items[i]?.textContent.trim()===label);
}
function drawNav(){
 const n=nav();if(!n)return;
 if(!correctNav(n))n.innerHTML=ROUTES.map(([route,label])=>`<a class="nav-item" href="#${route}" data-route="${route}" data-group-start="${starts.has(route)?'true':'false'}" title="${label}">${label}</a>`).join('');
 const current=window.APP?.route||'inicio';
 n.querySelectorAll('.nav-item[data-route]').forEach(a=>a.classList.toggle('active',a.dataset.route===current));
}
function renderRecords(clear=true){
 if(!window.APP)return;
 window.APP.route='registros';
 const view=document.querySelector('#app-view');if(clear&&view)view.innerHTML='';
 drawNav();
 if(typeof window.renderIriarteRecords==='function')window.renderIriarteRecords();
 document.dispatchEvent(new CustomEvent('iriarte:route',{detail:{route:'registros'}}));
}
function go(route,updateHash=true){
 if(!routeSet.has(route))route='inicio';
 if(route==='registros'){
  syncing=true;
  if(updateHash&&location.hash!=='#registros')history.replaceState(null,'','#registros');
  renderRecords(true);
  syncing=false;
  return;
 }
 if(coreRoute)coreRoute(route);
 drawNav();
 document.dispatchEvent(new CustomEvent('iriarte:route',{detail:{route}}));
}
window.iriarteRoute=go;
if(coreReload)window.reloadIriarte=async function(){
 await coreReload();
 if(location.hash==='#registros')renderRecords(true);else drawNav();
};
document.addEventListener('click',e=>{
 const a=e.target.closest('#main-nav a[data-route]');if(!a)return;
 e.preventDefault();e.stopImmediatePropagation();go(a.dataset.route,true);
},true);
window.addEventListener('hashchange',()=>{
 if(syncing)return;
 const route=location.hash.replace('#','');
 if(route==='registros')renderRecords(true);else setTimeout(drawNav,0);
});
function sync(){
 clearTimeout(timer);timer=setTimeout(()=>{
  drawNav();
  if(!syncing&&location.hash==='#registros'&&window.APP?.route!=='registros')renderRecords(true);
 },20);
}
new MutationObserver(sync).observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('DOMContentLoaded',()=>{
 drawNav();
 if(location.hash==='#registros')renderRecords(true);
});
window.addEventListener('load',sync);
})();

// Iriarte ERP V2 · evita fallos silenciosos de navegación/renderizado
(function(){
'use strict';
let shown=false;
function show(err){
 const view=document.querySelector('#app-view');if(!view||shown)return;shown=true;
 const msg=String(err?.message||err?.reason?.message||err?.reason||err||'Error desconocido');
 console.error('Iriarte ERP runtime error',err);
 view.innerHTML=`<div class="page-head"><h1>Se ha producido un error</h1></div><div class="card panel"><div class="notice" style="background:#f6dfd7;color:#8f4d3c"><b>La pantalla no se ha podido completar.</b><br>${msg.replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}</div><div class="toolbar"><button class="btn primary" type="button" data-runtime-retry>Reintentar</button><button class="btn" type="button" data-runtime-home>Ir a Inicio</button></div></div>`;
 view.querySelector('[data-runtime-retry]')?.addEventListener('click',()=>location.reload());
 view.querySelector('[data-runtime-home]')?.addEventListener('click',()=>{shown=false;location.hash='#inicio';location.reload()});
}
window.addEventListener('error',e=>show(e.error||e.message));
window.addEventListener('unhandledrejection',e=>show(e.reason));
window.addEventListener('hashchange',()=>{shown=false});
})();

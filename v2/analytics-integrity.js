// Iriarte ERP V2 · control visible de integridad analítica
(function(){
'use strict';
const db=()=>window.__iriarteDb;
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[m]));
const num=v=>Number(v||0)||0;
let loading=false,cache=null,timer,rendering=false;
async function load(force=false){
 if(loading)return cache;if(cache&&!force)return cache;if(!db())return null;loading=true;
 try{
  const [{data:p,error:e1},{data:b,error:e2}]=await Promise.all([
   db().from('v_control_integridad_costes_personal_v2').select('*').maybeSingle(),
   db().from('v_control_clasificacion_banco_v2').select('*').maybeSingle()
  ]);
  if(e1)throw e1;if(e2)throw e2;cache={personnel:p||{},bank:b||{}};return cache
 }catch(err){console.warn('Integridad analítica',err.message||err);cache={error:err.message||String(err)};return cache}finally{loading=false}
}
function issueRows(c){
 if(!c||c.error)return[];const p=c.personnel||{},b=c.bank||{};return [
  ['Costes mensuales sin imputaciones',num(p.costes_sin_imputaciones)],
  ['Costes mensuales descuadrados',num(p.costes_descuadrados)],
  ['Costes cerrados descuadrados',num(p.costes_cerrados_descuadrados)],
  ['Imputaciones de proyecto sin proyecto',num(p.imputaciones_proyecto_sin_proyecto)],
  ['N · no estudio con proyecto',num(p.no_estudio_con_proyecto)+num(b.no_estudio_con_proyecto)],
  ['Gastos bancarios directos sin proyecto',num(b.gastos_directos_sin_proyecto)],
  ['Movimientos clasificados todavía pendientes',num(b.clasificados_pendientes)]
 ]
}
function signature(data,rows){
 if(data?.error)return 'error:'+String(data.error);
 return rows.map(([label,value])=>label+':'+value).join('|')
}
function html(data,rows,sig){
 if(data?.error)return `<section data-analytics-integrity data-ai-signature="${esc(sig)}" class="card panel" style="margin-top:14px"><h3>Integridad analítica</h3><div class="notice" style="background:#fff2d8;color:#745b24">No se pudo comprobar: ${esc(data.error)}</div><div class="toolbar" style="margin-top:10px"><button class="btn" type="button" data-ai-refresh>Revisar ahora</button></div></section>`;
 const total=rows.reduce((a,[,v])=>a+v,0);
 return `<section data-analytics-integrity data-ai-signature="${esc(sig)}" class="card panel" style="margin-top:14px"><div class="page-head" style="margin-bottom:10px"><div><h3 style="margin:0">Integridad analítica</h3><small style="color:var(--muted)">Comprueba que costes mensuales, repartos y clasificación bancaria siguen cuadrando.</small></div><div class="grow"></div><button class="btn" type="button" data-ai-refresh>Revisar ahora</button></div>${total===0?'<div class="notice" style="background:#e8f0e5;color:#30482b"><b>Correcto.</b> No hay descuadres en imputaciones de personal ni en la clasificación analítica del banco.</div>':`<div class="notice" style="background:#fff2d8;color:#745b24"><b>${total} incidencia${total===1?'':'s'}.</b> Revisa estos datos antes de usar la rentabilidad como cierre definitivo.</div><div class="grid cols-4">${rows.filter(([,v])=>v>0).map(([label,v])=>`<div class="info"><small>${esc(label)}</small><b class="negative">${v}</b></div>`).join('')}</div>`}</section>`
}
async function render(force=false){
 if(rendering||window.APP?.route!=='informes')return;const root=document.querySelector('#reports-v2');if(!root)return;rendering=true;
 try{
  const data=await load(force);if(window.APP?.route!=='informes'||!document.contains(root))return;
  const rows=issueRows(data),sig=signature(data,rows),current=root.querySelector('[data-analytics-integrity]');
  if(current?.dataset.aiSignature===sig&&!force)return;
  const markup=html(data,rows,sig);
  if(current)current.outerHTML=markup;else root.insertAdjacentHTML('beforeend',markup);
 }finally{rendering=false}
}
function schedule(){clearTimeout(timer);timer=setTimeout(()=>render(false),130)}
window.iriarteRefreshAnalyticsIntegrity=async()=>{cache=null;await load(true);return render(true)};
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
window.addEventListener('load',schedule);window.addEventListener('hashchange',schedule);document.addEventListener('iriarte:route',schedule);
document.addEventListener('click',e=>{const b=e.target.closest('[data-ai-refresh]');if(!b)return;e.preventDefault();cache=null;render(true)},true);
})();

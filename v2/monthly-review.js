// Iriarte ERP V2 · revisión mensual de banco, horas y costes analíticos
(function(){
'use strict';
const db=()=>window.__iriarteDb;
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[m]));
const num=v=>Number(String(v??0).replace(',','.'))||0;
const money=v=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(num(v));
let cache=null,loading=false,timer,rendering=false,selected=localStorage.getItem('iriarte_review_month')||'';
function D(){return window.APP?.data||{}}
function monthKey(v){return String(v||'').slice(0,7)}
function signed(x){const amount=Math.abs(num(x.total??x.importe));return ['pago','gasto'].includes(String(x.tipo||'').toLowerCase())?-amount:amount}
async function loadAnalytical(force=false){
 if(cache&&!force)return cache;if(loading)return cache;if(!db())return null;loading=true;
 try{
  const [{data:costs,error:e1},{data:allocs,error:e2}]=await Promise.all([
   db().from('costes_personal_mensuales').select('id,periodo,persona,tipo,importe,estado'),
   db().from('costes_personal_imputaciones').select('coste_personal_id,proyecto_id,clasificacion,importe')
  ]);if(e1)throw e1;if(e2)throw e2;cache={costs:costs||[],allocs:allocs||[]};return cache
 }catch(err){console.warn('Revisión mensual',err.message||err);cache={error:err.message||String(err),costs:[],allocs:[]};return cache}finally{loading=false}
}
function allMonths(a){
 const d=D(),s=new Set();
 (d.movs||[]).forEach(x=>s.add(monthKey(x.fecha)));
 (d.horas||[]).forEach(x=>s.add(monthKey(x.fecha)));
 (d.facturas||[]).forEach(x=>s.add(monthKey(x.fecha)));
 (d.compras||[]).forEach(x=>s.add(monthKey(x.fecha)));
 (a?.costs||[]).forEach(x=>s.add(monthKey(x.periodo)));
 return [...s].filter(x=>/^\d{4}-\d{2}$/.test(x)).sort().reverse()
}
function labelMonth(m){if(!m)return'—';const [y,mo]=m.split('-').map(Number);return new Intl.DateTimeFormat('es-ES',{month:'long',year:'numeric'}).format(new Date(y,mo-1,1))}
function summary(month,a){
 const d=D(),bank=(d.movs||[]).filter(x=>monthKey(x.fecha)===month),hours=(d.horas||[]).filter(x=>monthKey(x.fecha)===month),costs=(a?.costs||[]).filter(x=>monthKey(x.periodo)===month),costIds=new Set(costs.map(x=>String(x.id))),allocs=(a?.allocs||[]).filter(x=>costIds.has(String(x.coste_personal_id))),invoices=(d.facturas||[]).filter(x=>monthKey(x.fecha)===month&&!['borrador','anulada'].includes(String(x.estado||'').toLowerCase())),purchases=(d.compras||[]).filter(x=>monthKey(x.fecha)===month&&String(x.estado||'').toLowerCase()!=='anulada');
 const pendingBank=bank.filter(x=>!x.conciliado).length,openCosts=costs.filter(x=>x.estado!=='cerrado').length,closedCosts=costs.length-openCosts,totalHours=hours.reduce((s,x)=>s+num(x.horas),0),hourCost=hours.reduce((s,x)=>s+num(x.horas)*num(x.coste_hora),0),people=new Set(hours.map(x=>String(x.persona||'').trim()).filter(Boolean)).size,costTotal=costs.reduce((s,x)=>s+num(x.importe),0),projectAlloc=allocs.filter(x=>x.clasificacion==='proyecto').reduce((s,x)=>s+num(x.importe),0),generalAlloc=allocs.filter(x=>x.clasificacion==='general').reduce((s,x)=>s+num(x.importe),0),personalAlloc=allocs.filter(x=>x.clasificacion==='no_estudio').reduce((s,x)=>s+num(x.importe),0),bankNoStudy=bank.filter(x=>x.categoria==='no_estudio').reduce((s,x)=>s+Math.abs(signed(x)),0),bankProjectCost=bank.filter(x=>['gasto_directo','movimiento_proyecto'].includes(String(x.categoria||''))&&signed(x)<0).reduce((s,x)=>s+Math.abs(signed(x)),0),invoiceBase=invoices.reduce((s,x)=>s+num(x.base),0),purchaseBase=purchases.reduce((s,x)=>s+num(x.base),0);
 return {bank:bank.length,pendingBank,hours:totalHours,hourCost,people,costs:costs.length,openCosts,closedCosts,costTotal,projectAlloc,generalAlloc,personalAlloc,bankNoStudy,bankProjectCost,invoiceBase,purchaseBase,blockers:pendingBank+openCosts}
}
function signature(month,s,a){return [month,s.bank,s.pendingBank,s.hours,s.hourCost,s.people,s.costs,s.openCosts,s.closedCosts,s.costTotal,s.projectAlloc,s.generalAlloc,s.personalAlloc,s.bankNoStudy,s.bankProjectCost,s.invoiceBase,s.purchaseBase,a?.error||''].join('|')}
function panel(month,months,s,a,sig){
 const ok=s.blockers===0,hasData=s.bank||s.hours||s.costs||s.invoiceBase||s.purchaseBase;
 return `<section data-monthly-review data-mr-signature="${esc(sig)}" class="card panel" style="margin-top:14px"><div class="page-head" style="margin-bottom:10px"><div><h3 style="margin:0">Revisión mensual</h3><small style="color:var(--muted)">Banco, horas, costes de personal e imputaciones del periodo.</small></div><div class="grow"></div><select class="btn" data-mr-month>${months.map(m=>`<option value="${esc(m)}" ${m===month?'selected':''}>${esc(labelMonth(m))}</option>`).join('')}</select><button class="btn" type="button" data-mr-refresh>Actualizar</button></div>${a?.error?`<div class="notice" style="background:#fff2d8;color:#745b24">No se pudieron cargar los costes analíticos: ${esc(a.error)}</div>`:''}<div class="grid cols-4"><div class="info"><small>Movimientos banco</small><b>${s.bank}</b></div><div class="info"><small>Pendientes de revisar</small><b class="${s.pendingBank?'negative':'positive'}">${s.pendingBank}</b></div><div class="info"><small>Horas registradas</small><b>${num(s.hours).toLocaleString('es-ES',{maximumFractionDigits:2})} h</b></div><div class="info"><small>Personas con horas</small><b>${s.people}</b></div><div class="info"><small>Coste de horas</small><b>${money(s.hourCost)}</b></div><div class="info"><small>Costes mensuales personal</small><b>${money(s.costTotal)}</b></div><div class="info"><small>Costes de personal abiertos</small><b class="${s.openCosts?'negative':'positive'}">${s.openCosts}</b></div><div class="info"><small>Costes de personal cerrados</small><b>${s.closedCosts}</b></div><div class="info"><small>Personal imputado a proyectos</small><b>${money(s.projectAlloc)}</b></div><div class="info"><small>Personal a estudio/general</small><b>${money(s.generalAlloc)}</b></div><div class="info"><small>Personal N · no estudio</small><b>${money(s.personalAlloc)}</b></div><div class="info"><small>Banco N · no estudio</small><b>${money(s.bankNoStudy)}</b></div><div class="info"><small>Coste banco directo a proyectos</small><b>${money(s.bankProjectCost)}</b></div><div class="info"><small>Facturado base del mes</small><b>${money(s.invoiceBase)}</b></div><div class="info"><small>Compras base del mes</small><b>${money(s.purchaseBase)}</b></div></div><div class="notice" style="margin-top:12px;${ok&&hasData?'background:#e8f0e5;color:#30482b':s.blockers?'background:#fff2d8;color:#745b24':''}">${!hasData?'<b>Sin datos en este periodo.</b>':ok?'<b>Mes listo para revisión final.</b> No quedan movimientos bancarios pendientes ni costes mensuales de personal abiertos.':`<b>${s.blockers} bloqueo${s.blockers===1?'':'s'} para cerrar la revisión.</b> ${s.pendingBank} movimiento${s.pendingBank===1?'':'s'} bancario${s.pendingBank===1?'':'s'} pendiente${s.pendingBank===1?'':'s'} y ${s.openCosts} coste${s.openCosts===1?'':'s'} de personal abierto${s.openCosts===1?'':'s'}.`}</div></section>`
}
async function render(force=false){
 if(rendering||window.APP?.route!=='informes')return;const root=document.querySelector('#reports-v2');if(!root)return;rendering=true;
 try{
  const a=await loadAnalytical(force);if(window.APP?.route!=='informes'||!document.contains(root))return;const months=allMonths(a);if(!months.length)return;
  if(!selected||!months.includes(selected))selected=months[0];const s=summary(selected,a),sig=signature(selected,s,a),current=root.querySelector('[data-monthly-review]');if(current?.dataset.mrSignature===sig&&!force)return;
  const markup=panel(selected,months,s,a,sig);const integrity=root.querySelector('[data-analytics-integrity]');if(current)current.outerHTML=markup;else if(integrity)integrity.insertAdjacentHTML('beforebegin',markup);else root.insertAdjacentHTML('beforeend',markup)
 }finally{rendering=false}
}
function schedule(){clearTimeout(timer);timer=setTimeout(()=>render(false),160)}
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});window.addEventListener('load',schedule);window.addEventListener('hashchange',schedule);document.addEventListener('iriarte:route',schedule);
document.addEventListener('change',e=>{const s=e.target.closest('[data-mr-month]');if(!s)return;selected=s.value;localStorage.setItem('iriarte_review_month',selected);render(true)},true);
document.addEventListener('click',e=>{const b=e.target.closest('[data-mr-refresh]');if(!b)return;e.preventDefault();cache=null;render(true)},true);
})();

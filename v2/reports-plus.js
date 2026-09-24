// Iriarte ERP V2 · informes operativos y financieros
(function(){
'use strict';
const db=()=>window.__iriarteDb;
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const num=v=>Number(v||0)||0;
const money=v=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(num(v));
const month=v=>v?new Intl.DateTimeFormat('es-ES',{month:'long',year:'numeric'}).format(new Date(v+'T12:00:00')):'—';
let token=0;
async function render(){
 if(window.APP?.route!=='informes')return;const my=++token,view=$('#app-view');if(!view)return;
 view.innerHTML='<div class="page-head"><h1>Informes</h1></div><div class="card panel"><div class="empty">Calculando informes…</div></div>';
 const [{data:projects,error:e1},{data:months,error:e2}]=await Promise.all([db().from('v_proyectos_resumen').select('*'),db().from('v_finanzas_mensual').select('*').order('mes',{ascending:false}).limit(24)]);if(my!==token||window.APP?.route!=='informes')return;
 if(e1||e2){view.innerHTML=`<div class="page-head"><h1>Informes</h1></div><div class="notice" style="background:#f6dfd7;color:#8f4d3c">${esc(e1?.message||e2?.message||'No se pudieron cargar los informes')}</div>`;return}
 const D=window.APP.data,unlinked={facturas:(D.facturas||[]).filter(x=>!x.proyecto_id).length,compras:(D.compras||[]).filter(x=>!x.proyecto_id).length,horas:(D.horas||[]).filter(x=>!x.proyecto_id).length,movs:(D.movs||[]).filter(x=>!x.proyecto_id).length};
 const totalMargin=(projects||[]).reduce((a,x)=>a+num(x.margen_directo),0),totalInv=(projects||[]).reduce((a,x)=>a+num(x.ingresos_facturados),0),totalCosts=(projects||[]).reduce((a,x)=>a+num(x.costes_compras)+num(x.coste_horas),0);
 view.innerHTML=`<div class="page-head"><div><h1>Informes</h1><p style="color:var(--muted);margin:4px 0 0">Rentabilidad directa y evolución financiera del estudio.</p></div></div>
 <div class="grid cols-4"><div class="card kpi"><small>Facturado base por proyectos</small><strong>${money(totalInv)}</strong></div><div class="card kpi"><small>Costes directos</small><strong>${money(totalCosts)}</strong></div><div class="card kpi"><small>Margen directo</small><strong class="${totalMargin<0?'negative':'positive'}">${money(totalMargin)}</strong></div><div class="card kpi"><small>Proyectos analizados</small><strong>${(projects||[]).length}</strong></div></div>
 <div class="notice" style="margin-top:14px"><b>Control de fiabilidad:</b> facturas sin proyecto: ${unlinked.facturas} · compras sin proyecto: ${unlinked.compras} · horas sin proyecto: ${unlinked.horas} · movimientos bancarios sin proyecto: ${unlinked.movs}. Los registros no vinculados no se atribuyen a la rentabilidad de un proyecto.</div>
 <div class="card panel" style="margin-top:14px"><h3>Rentabilidad directa por proyecto</h3>${projects?.length?`<div class="table-wrap"><table class="table"><tr><th>Proyecto</th><th>Cliente</th><th>Facturado base</th><th>Cobrado</th><th>Compras</th><th>Horas</th><th>Coste horas</th><th>Margen directo</th><th>Margen %</th></tr>${projects.map(x=>{const pct=num(x.ingresos_facturados)?num(x.margen_directo)/num(x.ingresos_facturados)*100:0;return `<tr><td><b>${esc(x.proyecto||'')}</b></td><td>${esc(x.cliente||'—')}</td><td>${money(x.ingresos_facturados)}</td><td>${money(x.cobrado)}</td><td>${money(x.costes_compras)}</td><td>${num(x.horas).toLocaleString('es-ES',{maximumFractionDigits:1})} h</td><td>${money(x.coste_horas)}</td><td class="${num(x.margen_directo)<0?'negative':'positive'}"><b>${money(x.margen_directo)}</b></td><td>${pct.toLocaleString('es-ES',{maximumFractionDigits:1})}%</td></tr>`}).join('')}</table></div>`:'<div class="empty">Aún no hay proyectos para analizar.</div>'}</div>
 <div class="card panel" style="margin-top:14px"><h3>Evolución mensual</h3><p style="font-size:11px;color:var(--muted)">El resultado mensual mostrado aquí es facturación base menos compras base y gastos generales base. El coste de horas se mantiene separado en la rentabilidad directa por proyecto.</p>${months?.length?`<div class="table-wrap"><table class="table"><tr><th>Mes</th><th>Facturado base</th><th>Cobrado</th><th>Compras base</th><th>Pagado proveedores</th><th>Gastos generales</th><th>Resultado antes coste personal</th></tr>${months.map(x=>`<tr><td><b>${esc(month(x.mes))}</b></td><td>${money(x.facturado_base)}</td><td>${money(x.cobrado)}</td><td>${money(x.compras_base)}</td><td>${money(x.pagado_proveedores)}</td><td>${money(x.gastos_generales_base)}</td><td class="${num(x.resultado_antes_coste_personal)<0?'negative':'positive'}"><b>${money(x.resultado_antes_coste_personal)}</b></td></tr>`).join('')}</table></div>`:'<div class="empty">No hay meses con actividad todavía.</div>'}</div>`;
}
function schedule(){setTimeout(render,80)}
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});window.addEventListener('hashchange',schedule);window.addEventListener('load',schedule);
})();

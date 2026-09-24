// Iriarte ERP V2 · informes operativos, financieros y control de integridad
(function(){
'use strict';
const db=()=>window.__iriarteDb;
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const num=v=>Number(v||0)||0;
const money=v=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(num(v));
const month=v=>v?new Intl.DateTimeFormat('es-ES',{month:'long',year:'numeric'}).format(new Date(v+'T12:00:00')):'—';
let token=0;
function integrityPanel(i={}){
 const labels=[
  ['Facturas sin proyecto','facturas_sin_proyecto'],['Compras sin proyecto','compras_sin_proyecto'],['Horas sin proyecto','horas_sin_proyecto'],
  ['Documentos sin proyecto','documentos_sin_proyecto'],['Movimientos sin proyecto','movimientos_sin_proyecto'],['Visitas de obra sin proyecto','visitas_sin_proyecto'],
  ['Tareas de obra sin proyecto','tareas_sin_proyecto'],['Incidencias de obra sin proyecto','incidencias_sin_proyecto'],['Facturas con líneas y total 0','facturas_total_cero_con_lineas'],
  ['Facturas cobradas incoherentes','facturas_cobradas_incoherentes'],['Compras pagadas incoherentes','compras_pagadas_incoherentes'],
  ['Documento de factura con proyecto distinto','documentos_factura_proyecto_incoherente'],['Documento de compra con proyecto distinto','documentos_compra_proyecto_incoherente'],
  ['Movimiento de factura con proyecto distinto','movimientos_factura_proyecto_incoherente'],['Movimiento de compra con proyecto distinto','movimientos_compra_proyecto_incoherente'],
  ['Cobros conciliados sin cobro real','cobros_conciliados_sin_cobro'],['Pagos conciliados sin pago real','pagos_conciliados_sin_pago'],
  ['Fases facturadas sin factura','fases_facturadas_sin_factura'],['Fases con factura y estado incoherente','fases_con_factura_estado_incoherente'],['Presupuestos convertidos sin proyecto','presupuestos_proyecto_sin_vinculo']
 ];
 const issues=labels.reduce((a,[,k])=>a+num(i[k]),0);
 if(!issues)return `<div class="notice" style="margin-top:14px;background:#e8f0e5;color:#30482b"><b>Control de integridad: correcto.</b> No se han detectado incoherencias en vínculos, estados, documentos, conciliación ni totales críticos.</div>`;
 return `<div class="card panel" style="margin-top:14px"><h3>Control de integridad</h3><div class="notice" style="background:#fff2d8;color:#745b24;margin-bottom:10px"><b>${issues} incidencias detectadas.</b> Conviene corregirlas antes de utilizar los informes como cierre definitivo.</div><div class="grid cols-4">${labels.filter(([,k])=>num(i[k])>0).map(([l,k])=>`<div class="info"><small>${esc(l)}</small><b class="negative">${num(i[k])}</b></div>`).join('')}</div></div>`;
}
async function render(){
 if(window.APP?.route!=='informes')return;const my=++token,view=$('#app-view');if(!view)return;
 view.innerHTML='<div class="page-head"><h1>Informes</h1></div><div class="card panel"><div class="empty">Calculando informes…</div></div>';
 const [{data:projects,error:e1},{data:months,error:e2},{data:integrity,error:e3}]=await Promise.all([
  db().from('v_proyectos_resumen').select('*'),
  db().from('v_finanzas_mensual').select('*').order('mes',{ascending:false}).limit(24),
  db().from('v_control_integridad_erp').select('*').maybeSingle()
 ]);if(my!==token||window.APP?.route!=='informes')return;
 if(e1||e2){view.innerHTML=`<div class="page-head"><h1>Informes</h1></div><div class="notice" style="background:#f6dfd7;color:#8f4d3c">${esc(e1?.message||e2?.message||'No se pudieron cargar los informes')}</div>`;return}
 const D=window.APP.data,unlinked={facturas:(D.facturas||[]).filter(x=>!x.proyecto_id).length,compras:(D.compras||[]).filter(x=>!x.proyecto_id).length,horas:(D.horas||[]).filter(x=>!x.proyecto_id).length,movs:(D.movs||[]).filter(x=>!x.proyecto_id).length};
 const totalMargin=(projects||[]).reduce((a,x)=>a+num(x.margen_directo),0),totalInv=(projects||[]).reduce((a,x)=>a+num(x.ingresos_facturados),0),totalCosts=(projects||[]).reduce((a,x)=>a+num(x.costes_compras)+num(x.coste_horas),0);
 view.innerHTML=`<div class="page-head"><div><h1>Informes</h1><p style="color:var(--muted);margin:4px 0 0">Rentabilidad directa y evolución financiera del estudio.</p></div></div>
 <div class="grid cols-4"><div class="card kpi"><small>Facturado base por proyectos</small><strong>${money(totalInv)}</strong></div><div class="card kpi"><small>Costes directos</small><strong>${money(totalCosts)}</strong></div><div class="card kpi"><small>Margen directo</small><strong class="${totalMargin<0?'negative':'positive'}">${money(totalMargin)}</strong></div><div class="card kpi"><small>Proyectos analizados</small><strong>${(projects||[]).length}</strong></div></div>
 ${e3?`<div class="notice" style="margin-top:14px;background:#fff2d8;color:#745b24"><b>Control de integridad no disponible:</b> ${esc(e3.message)}</div>`:integrityPanel(integrity||{})}
 <div class="notice" style="margin-top:14px"><b>Registros pendientes de atribución:</b> facturas sin proyecto: ${unlinked.facturas} · compras sin proyecto: ${unlinked.compras} · horas sin proyecto: ${unlinked.horas} · movimientos bancarios sin proyecto: ${unlinked.movs}. Los registros no vinculados no se atribuyen a la rentabilidad de un proyecto.</div>
 <div class="card panel" style="margin-top:14px"><h3>Rentabilidad directa por proyecto</h3>${projects?.length?`<div class="table-wrap"><table class="table"><tr><th>Proyecto</th><th>Cliente</th><th>Facturado base</th><th>Cobrado</th><th>Compras</th><th>Horas</th><th>Coste horas</th><th>Margen directo</th><th>Margen %</th></tr>${projects.map(x=>{const pct=num(x.ingresos_facturados)?num(x.margen_directo)/num(x.ingresos_facturados)*100:0;return `<tr><td><b>${esc(x.proyecto||'')}</b></td><td>${esc(x.cliente||'—')}</td><td>${money(x.ingresos_facturados)}</td><td>${money(x.cobrado)}</td><td>${money(x.costes_compras)}</td><td>${num(x.horas).toLocaleString('es-ES',{maximumFractionDigits:1})} h</td><td>${money(x.coste_horas)}</td><td class="${num(x.margen_directo)<0?'negative':'positive'}"><b>${money(x.margen_directo)}</b></td><td>${pct.toLocaleString('es-ES',{maximumFractionDigits:1})}%</td></tr>`}).join('')}</table></div>`:'<div class="empty">Aún no hay proyectos para analizar.</div>'}</div>
 <div class="card panel" style="margin-top:14px"><h3>Evolución mensual</h3><p style="font-size:11px;color:var(--muted)">El resultado mensual mostrado aquí es facturación base menos compras base y gastos generales base. El coste de horas se mantiene separado en la rentabilidad directa por proyecto.</p>${months?.length?`<div class="table-wrap"><table class="table"><tr><th>Mes</th><th>Facturado base</th><th>Cobrado</th><th>Compras base</th><th>Pagado proveedores</th><th>Gastos generales</th><th>Resultado antes coste personal</th></tr>${months.map(x=>`<tr><td><b>${esc(month(x.mes))}</b></td><td>${money(x.facturado_base)}</td><td>${money(x.cobrado)}</td><td>${money(x.compras_base)}</td><td>${money(x.pagado_proveedores)}</td><td>${money(x.gastos_generales_base)}</td><td class="${num(x.resultado_antes_coste_personal)<0?'negative':'positive'}"><b>${money(x.resultado_antes_coste_personal)}</b></td></tr>`).join('')}</table></div>`:'<div class="empty">No hay meses con actividad todavía.</div>'}</div>`;
}
function schedule(){setTimeout(render,80)}
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});window.addEventListener('hashchange',schedule);window.addEventListener('load',schedule);
})();

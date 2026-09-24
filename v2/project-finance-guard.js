// Iriarte ERP V2 · rentabilidad de proyecto: excluye documentos anulados y deriva saldos de transacciones reales
(function(){
'use strict';
const $=s=>document.querySelector(s);
const num=v=>Number(v||0)||0;
const money=v=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(num(v));
let timer;
function kpi(label,value,n){return `<div class="card kpi"><small>${label}</small><strong class="${typeof n==='number'?(n<0?'negative':'positive'):''}">${value}</strong></div>`}
function row(label,value,cls=''){return `<div class="info"><small>${label}</small><b class="${cls}">${value}</b></div>`}
function activeProjectData(){
 const A=window.APP,D=A?.data||{},pid=A?.sel?.project;if(!pid)return null;
 const byProject=(rows,key='proyecto_id')=>(rows||[]).filter(x=>String(x[key]??x.project_id??'')===String(pid));
 const invoices=byProject(D.facturas).filter(x=>String(x.estado||'').toLowerCase()!=='anulada');
 const purchases=byProject(D.compras).filter(x=>String(x.estado||'').toLowerCase()!=='anulada');
 const hours=byProject(D.horas);
 const invoiceIds=new Set(invoices.map(x=>String(x.id))),purchaseIds=new Set(purchases.map(x=>String(x.id)));
 const collected=(D.cobros||[]).filter(x=>invoiceIds.has(String(x.factura_id))).reduce((a,x)=>a+num(x.importe),0);
 const paid=(D.pagos||[]).filter(x=>purchaseIds.has(String(x.compra_id))).reduce((a,x)=>a+num(x.importe),0);
 const baseInv=invoices.reduce((a,x)=>a+num(x.base),0),basePur=purchases.reduce((a,x)=>a+num(x.base),0),hourCost=hours.reduce((a,x)=>a+num(x.horas)*num(x.coste_hora),0);
 const totalInv=invoices.reduce((a,x)=>a+num(x.total),0),totalPur=purchases.reduce((a,x)=>a+num(x.total),0);
 return {baseInv,basePur,hourCost,margin:baseInv-basePur-hourCost,pendingCollect:Math.max(0,totalInv-collected),pendingPay:Math.max(0,totalPur-paid)};
}
function apply(){
 if(window.APP?.route!=='proyectos')return;const d=activeProjectData();if(!d)return;
 const core=$('.card.detail > .grid.cols-4');
 if(core){core.innerHTML=`${kpi('Facturado base',money(d.baseInv))}${kpi('Compras base',money(d.basePur))}${kpi('Coste horas',money(d.hourCost))}${kpi('Margen directo',money(d.margin),d.margin)}`;core.dataset.financeGuard='1'}
 const hub=$('#project-hub-v2 .grid.cols-6');
 if(hub){hub.innerHTML=`${row('Facturado base',money(d.baseInv))}${row('Compras base',money(d.basePur))}${row('Coste horas',money(d.hourCost))}${row('Margen directo',money(d.margin),d.margin>=0?'positive':'negative')}${row('Pendiente cobro',money(d.pendingCollect),d.pendingCollect>0?'negative':'positive')}${row('Pendiente pago',money(d.pendingPay),d.pendingPay>0?'negative':'positive')}`;hub.dataset.financeGuard='1'}
}
function schedule(){clearTimeout(timer);timer=setTimeout(apply,70)}
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});window.addEventListener('hashchange',schedule);window.addEventListener('load',schedule);
})();

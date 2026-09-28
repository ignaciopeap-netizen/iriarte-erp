// Iriarte ERP V2 · semántica financiera visible: borradores fuera de facturación
(function(){
'use strict';
let timer;
const n=v=>Number(v||0)||0;
const eur=v=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(n(v));
const issued=x=>!['borrador','anulada'].includes(String(x?.estado||'borrador').toLowerCase());
const activePurchase=x=>String(x?.estado||'').toLowerCase()!=='anulada';
const sum=(a,f)=>(a||[]).reduce((s,x)=>s+n(f(x)),0);
function metrics(){
 const D=window.APP?.data||{},invoices=(D.facturas||[]).filter(issued),purchases=(D.compras||[]).filter(activePurchase),ids=new Set(invoices.map(x=>String(x.id))),pids=new Set(purchases.map(x=>String(x.id)));
 const fb=sum(invoices,x=>x.base),pb=sum(purchases,x=>x.base),hours=sum(D.horas,x=>n(x.horas)*n(x.coste_hora)),gg=sum(D.gastos,x=>x.base),cob=sum((D.cobros||[]).filter(x=>ids.has(String(x.factura_id))),x=>x.importe),pag=sum((D.pagos||[]).filter(x=>pids.has(String(x.compra_id))),x=>x.importe),margin=fb-pb-hours;
 return {fb,pb,hours,gg,cob,pag,margin,result:margin-gg,drafts:(D.facturas||[]).filter(x=>String(x.estado||'borrador').toLowerCase()==='borrador').length};
}
function setByLabel(root,label,value,cls){for(const el of root.querySelectorAll('.kpi')){const s=el.querySelector('small');if(s?.textContent.trim()===label){const strong=el.querySelector('strong');if(strong){strong.textContent=value;if(cls){strong.classList.remove('positive','negative');strong.classList.add(cls)}}}}}
function setInfo(root,label,value,cls){for(const el of root.querySelectorAll('.info')){const s=el.querySelector('small');if(s?.textContent.trim()===label){const b=el.querySelector('b');if(b){b.textContent=value;if(cls){b.classList.remove('positive','negative');b.classList.add(cls)}}}}}
function applyDashboard(){const S=window.APP,view=document.querySelector('#app-view');if(!S||S.route!=='inicio'||!view)return;const m=metrics();setByLabel(view,'Facturado base',eur(m.fb));setByLabel(view,'Cobrado',eur(m.cob));setByLabel(view,'Compras base',eur(m.pb));setByLabel(view,'Margen directo',eur(m.margin),m.margin<0?'negative':'positive');setByLabel(view,'Tesorería',eur(m.cob-m.pag),(m.cob-m.pag)<0?'negative':'positive');setInfo(view,'Margen directo',eur(m.margin),m.margin<0?'negative':'positive');setInfo(view,'Gastos generales',eur(m.gg));setInfo(view,'Resultado',eur(m.result),m.result<0?'negative':'positive')}
function applyFinance(){const S=window.APP,view=document.querySelector('#app-view');if(!S||S.route!=='finanzas'||!view)return;const m=metrics();setByLabel(view,'Facturado base',eur(m.fb));setByLabel(view,'Costes directos',eur(m.pb+m.hours));setByLabel(view,'Margen directo',eur(m.margin),m.margin<0?'negative':'positive');setByLabel(view,'Resultado interno',eur(m.result),m.result<0?'negative':'positive');if(m.drafts&&!view.querySelector('[data-draft-finance-note]')){const grid=[...view.querySelectorAll(':scope > .grid')][0];if(grid){const note=document.createElement('div');note.dataset.draftFinanceNote='1';note.className='notice';note.style.marginTop='12px';note.innerHTML=`<b>${m.drafts} factura${m.drafts===1?'':'s'} en borrador.</b> No se incluyen en facturación, margen ni pendiente de cobro hasta emitirlas.`;grid.after(note)}}}
function run(){clearTimeout(timer);timer=setTimeout(()=>{applyDashboard();applyFinance()},55)}
new MutationObserver(run).observe(document.body,{childList:true,subtree:true});window.addEventListener('hashchange',run);window.addEventListener('load',run);
})();

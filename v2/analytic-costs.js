// Iriarte ERP V2 · rentabilidad analítica: documentos + horas + personal + banco clasificado
(function(){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[m]));
const num=v=>Number(String(v??0).replace(',','.'))||0;
const money=v=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(num(v));
let timer;
function D(){return window.APP?.data||{}}
function outgoing(x){return ['pago','gasto'].includes(String(x.tipo||'').toLowerCase())?Math.abs(num(x.total??x.importe)):0}
function issued(x){return !['borrador','anulada'].includes(String(x.estado||'borrador').toLowerCase())}
function activePurchase(x){return String(x.estado||'').toLowerCase()!=='anulada'}
function projectCalc(pid){
 const revenue=(D().facturas||[]).filter(x=>String(x.proyecto_id)===String(pid)&&issued(x)).reduce((a,x)=>a+num(x.base),0);
 const purchases=(D().compras||[]).filter(x=>String(x.proyecto_id)===String(pid)&&activePurchase(x)).reduce((a,x)=>a+num(x.base),0);
 const hours=(D().horas||[]).filter(x=>String(x.proyecto_id)===String(pid)).reduce((a,x)=>a+num(x.horas)*num(x.coste_hora),0);
 const personnel=(D().imputacionesPersonal||[]).filter(x=>x.clasificacion==='proyecto'&&String(x.proyecto_id)===String(pid)).reduce((a,x)=>a+num(x.importe),0);
 const overhead=(D().gastos||[]).filter(x=>String(x.proyecto_id||'')===String(pid)).reduce((a,x)=>a+num(x.base),0);
 const bankRows=(D().movs||[]).filter(x=>x.categoria==='gasto_directo'&&String(x.proyecto_id||'')===String(pid)&&!x.compra_id&&!x.factura_id);
 const bank=bankRows.reduce((a,x)=>a+outgoing(x),0),total=purchases+hours+personnel+overhead+bank;
 return {revenue,purchases,hours,personnel,overhead,bank,bankRows,total,result:revenue-total}
}
function studyCalc(){
 const revenue=(D().facturas||[]).filter(issued).reduce((a,x)=>a+num(x.base),0),purchases=(D().compras||[]).filter(activePurchase).reduce((a,x)=>a+num(x.base),0),hours=(D().horas||[]).reduce((a,x)=>a+num(x.horas)*num(x.coste_hora),0),personnel=(D().imputacionesPersonal||[]).filter(x=>x.clasificacion!=='no_estudio').reduce((a,x)=>a+num(x.importe),0),overhead=(D().gastos||[]).reduce((a,x)=>a+num(x.base),0),directBank=(D().movs||[]).filter(x=>x.categoria==='gasto_directo'&&!x.compra_id&&!x.factura_id).reduce((a,x)=>a+outgoing(x),0),generalBank=(D().movs||[]).filter(x=>x.categoria==='general_estudio'&&!x.compra_id&&!x.factura_id).reduce((a,x)=>a+outgoing(x),0),outside=(D().movs||[]).filter(x=>x.categoria==='no_estudio').reduce((a,x)=>a+outgoing(x),0),personnelBank=(D().movs||[]).filter(x=>x.categoria==='coste_personal').reduce((a,x)=>a+outgoing(x),0);const total=purchases+hours+personnel+overhead+directBank+generalBank;return {revenue,purchases,hours,personnel,overhead,directBank,generalBank,outside,personnelBank,total,result:revenue-total}
}
function patchProject(){
 if(window.APP?.route!=='proyectos')return;const pid=window.APP?.sel?.project,panel=document.querySelector('[data-personnel-project]');if(!pid||!panel)return;const c=projectCalc(pid),sig=[pid,c.bank,c.total,c.result].join(':');if(panel.dataset.analyticSignature===sig)return;panel.dataset.analyticSignature=sig;panel.querySelector('[data-bank-direct-project]')?.remove();
 const grid=panel.querySelector('.grid');if(grid){const old=[...grid.querySelectorAll('.info')].find(x=>x.querySelector('small')?.textContent.trim()==='Resultado analítico');if(old){const b=old.querySelector('b');b.textContent=money(c.result);b.className=c.result<0?'negative':'positive'}grid.insertAdjacentHTML('beforeend',`<div class="info" data-bank-direct-project><small>Movimientos directos de banco</small><b>${money(c.bank)}</b></div><div class="info" data-bank-direct-project><small>Coste total analítico</small><b>${money(c.total)}</b></div>`)}
 if(c.bankRows.length)panel.insertAdjacentHTML('beforeend',`<div data-bank-direct-project style="margin-top:12px"><h4 style="margin:0 0 7px">Movimientos bancarios directos · ${money(c.bank)}</h4><div class="table-wrap"><table class="table"><tr><th>Fecha</th><th>Concepto</th><th>Subcategoría</th><th>Importe</th></tr>${c.bankRows.map(x=>`<tr><td>${esc(x.fecha||'')}</td><td>${esc(x.concepto||'')}</td><td>${esc(x.subcategoria||'')}</td><td><b>${money(outgoing(x))}</b></td></tr>`).join('')}</table></div></div>`)
}
function patchFinance(){
 if(window.APP?.route!=='informes')return;const root=document.querySelector('#reports-v2'),personnel=root?.querySelector('[data-personnel-finance]');if(!root||!personnel)return;const c=studyCalc(),sig=[c.directBank,c.generalBank,c.outside,c.personnelBank,c.result].join(':');if(personnel.dataset.analyticSignature===sig)return;personnel.dataset.analyticSignature=sig;personnel.querySelector('[data-bank-analytic-finance]')?.remove();personnel.insertAdjacentHTML('beforeend',`<div data-bank-analytic-finance style="margin-top:14px"><h4 style="margin:0 0 8px">Clasificación bancaria analítica</h4><div class="grid cols-4"><div class="info"><small>Directo a proyectos</small><b>${money(c.directBank)}</b></div><div class="info"><small>Estudio / general</small><b>${money(c.generalBank)}</b></div><div class="info"><small>Coste personal identificado</small><b>${money(c.personnelBank)}</b></div><div class="info"><small>N · no estudio (excluido)</small><b>${money(c.outside)}</b></div></div><div class="notice" style="margin-top:10px;background:#e8f0e5;color:#30482b"><b>Resultado analítico ampliado: ${money(c.result)}</b><br><span style="font-size:11px">Facturación emitida − compras − horas − costes mensuales de personal imputados − gastos generales − movimientos bancarios clasificados como gasto del estudio. “N” queda fuera.</span></div></div>`)
}
function run(){clearTimeout(timer);timer=setTimeout(()=>{patchProject();patchFinance()},110)}
new MutationObserver(run).observe(document.body,{childList:true,subtree:true});window.addEventListener('load',run);window.addEventListener('hashchange',run);document.addEventListener('iriarte:route',run);
})();

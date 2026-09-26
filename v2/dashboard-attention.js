(function(){
'use strict';
let timer;
const n=v=>Number(v||0)||0;
const eur=v=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(n(v));
function sum(a,f){return (a||[]).reduce((s,x)=>s+n(f(x)),0)}
function pendingInvoice(S,x){const paid=sum((S.data.cobros||[]).filter(c=>String(c.factura_id)===String(x.id)),c=>c.importe);return Math.max(0,n(x.total)-paid)}
function pendingPurchase(S,x){const paid=sum((S.data.pagos||[]).filter(p=>String(p.compra_id)===String(x.id)),p=>p.importe);return Math.max(0,n(x.total)-paid)}
function render(){
 const S=window.APP,view=document.querySelector('#app-view');if(!S||S.route!=='inicio'||!view||view.querySelector('.ux-attention'))return;
 const invoices=(S.data.facturas||[]).filter(x=>x.estado!=='anulada'),purchases=(S.data.compras||[]).filter(x=>x.estado!=='anulada');
 const collect=sum(invoices,x=>pendingInvoice(S,x)),pay=sum(purchases,x=>pendingPurchase(S,x));
 const work=(S.data.tareas||[]).filter(x=>!/complet|cerrad|resuelt/i.test(String(x.estado||''))).length+(S.data.incidencias||[]).filter(x=>!/cerrad|resuelt/i.test(String(x.estado||''))).length;
 const bank=(S.data.movs||[]).filter(x=>!x.conciliado).length;
 const box=document.createElement('section');box.className='ux-attention';box.innerHTML='<div class="ux-attention-head"><div><small>SEGUIMIENTO</small><h3>Qué requiere atención</h3></div><span>Actualizado con los datos del ERP</span></div><div class="ux-attention-grid"></div>';
 const grid=box.querySelector('.ux-attention-grid');
 const cards=[['facturas','Pendiente de cobro',eur(collect),invoices.filter(x=>pendingInvoice(S,x)>.009).length+' facturas'],['compras','Pendiente de pago',eur(pay),purchases.filter(x=>pendingPurchase(S,x)>.009).length+' compras'],['obra','Obra abierta',String(work),work===1?'registro abierto':'registros abiertos'],['finanzas','Banco por conciliar',String(bank),bank===1?'movimiento':'movimientos']];
 cards.forEach(([route,label,value,sub])=>{const b=document.createElement('button');b.type='button';b.className='ux-attention-card';b.innerHTML='<small>'+label+'</small><strong>'+value+'</strong><span>'+sub+'</span>';b.onclick=()=>window.iriarteRoute&&window.iriarteRoute(route);grid.appendChild(b)});
 const grids=[...view.querySelectorAll(':scope > .grid')];const anchor=grids[0]||view.querySelector('.ux-dashboard-links');if(anchor)anchor.after(box);else view.prepend(box);
}
function run(){clearTimeout(timer);timer=setTimeout(render,40)}
new MutationObserver(run).observe(document.documentElement,{childList:true,subtree:true});document.addEventListener('DOMContentLoaded',run);window.addEventListener('hashchange',run);
})();

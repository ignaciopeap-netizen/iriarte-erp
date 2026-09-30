(function(){
'use strict';
let timer;
const n=v=>Number(v||0)||0;
const eur=v=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(n(v));
const today=()=>new Date().toISOString().slice(0,10);
function sum(a,f){return (a||[]).reduce((s,x)=>s+n(f(x)),0)}
function issuedInvoice(x){return !['borrador','anulada'].includes(String(x?.estado||'borrador').toLowerCase())}
function activePurchase(x){return String(x?.estado||'').toLowerCase()!=='anulada'}
function pendingInvoice(S,x){const paid=sum((S.data.cobros||[]).filter(c=>String(c.factura_id)===String(x.id)),c=>c.importe);return Math.max(0,n(x.total)-paid)}
function pendingPurchase(S,x){const paid=sum((S.data.pagos||[]).filter(p=>String(p.compra_id)===String(x.id)),p=>p.importe);return Math.max(0,n(x.total)-paid)}
function signedMovement(x){const amount=Math.abs(n(x.total??x.importe));return ['pago','gasto'].includes(String(x.tipo||'').toLowerCase())?-amount:amount}
function setKpi(view,label,value,number){const card=[...view.querySelectorAll('.card.kpi')].find(x=>x.querySelector('small')?.textContent?.trim()===label);if(!card)return;const strong=card.querySelector('strong');if(!strong)return;strong.textContent=value;if(typeof number==='number'){strong.classList.remove('positive','negative');strong.classList.add(number<0?'negative':'positive')}}
function setInfo(view,label,value,number){const item=[...view.querySelectorAll('.info')].find(x=>x.querySelector('small')?.textContent?.trim()===label);if(!item)return;const b=item.querySelector('b');if(!b)return;b.textContent=value;if(typeof number==='number'){b.classList.remove('positive','negative');b.classList.add(number<0?'negative':'positive')}}
function patchArchitecture(view){const hero=[...view.querySelectorAll('.card.panel')].find(x=>x.querySelector('h1')?.textContent?.trim()==='Gestión del estudio');const p=hero?.querySelector('p');if(p)p.textContent='CLIENTE → PROYECTO → PRESUPUESTO → OBRA → FACTURACIÓN → RENTABILIDAD'}
function patchFinancialKpis(S,view){
 const invoices=(S.data.facturas||[]).filter(issuedInvoice),purchases=(S.data.compras||[]).filter(activePurchase);
 const facturado=sum(invoices,x=>x.base),compras=sum(purchases,x=>x.base),horas=sum(S.data.horas||[],x=>n(x.horas)*n(x.coste_hora)),margen=facturado-compras-horas,gastos=sum(S.data.gastos||[],x=>x.base),resultado=margen-gastos;
 const bankBalance=sum(S.data.movs||[],signedMovement);
 setKpi(view,'Facturado base',eur(facturado));setKpi(view,'Compras base',eur(compras));setKpi(view,'Margen directo',eur(margen),margen);
 const treasury=[...view.querySelectorAll('.card.kpi')].find(x=>x.querySelector('small')?.textContent?.trim()==='Tesorería'||x.querySelector('small')?.textContent?.trim()==='Saldo de movimientos');
 if(treasury){const label=treasury.querySelector('small'),value=treasury.querySelector('strong');if(label)label.textContent='Saldo de movimientos';if(value){value.textContent=eur(bankBalance);value.classList.remove('positive','negative');value.classList.add(bankBalance<0?'negative':'positive')}treasury.title='Saldo neto del libro de movimientos financieros. Coincide con el criterio mostrado en Banco.'}
 setInfo(view,'Margen directo',eur(margen),margen);setInfo(view,'Gastos generales',eur(gastos));setInfo(view,'Resultado',eur(resultado),resultado);
}
function render(){
 const S=window.APP,view=document.querySelector('#app-view');if(!S||S.route!=='inicio'||!view)return;
 patchArchitecture(view);patchFinancialKpis(S,view);
 if(view.querySelector('.ux-attention'))return;
 const invoices=(S.data.facturas||[]).filter(issuedInvoice),purchases=(S.data.compras||[]).filter(activePurchase);
 const collect=sum(invoices,x=>pendingInvoice(S,x)),pay=sum(purchases,x=>pendingPurchase(S,x));
 const pendingInvoices=invoices.filter(x=>pendingInvoice(S,x)>.009),overdue=pendingInvoices.filter(x=>x.fecha_vencimiento&&x.fecha_vencimiento<today()).length;
 const work=(S.data.tareas||[]).filter(x=>!/complet|cerrad|resuelt|cancel/i.test(String(x.estado||''))).length+(S.data.incidencias||[]).filter(x=>!/cerrad|resuelt|cancel/i.test(String(x.estado||''))).length;
 const bank=(S.data.movs||[]).filter(x=>!x.conciliado).length;
 const box=document.createElement('section');box.className='ux-attention';box.innerHTML='<div class="ux-attention-head"><div><small>SEGUIMIENTO</small><h3>Qué requiere atención</h3></div><span>Solo facturas emitidas; los borradores no cuentan como facturación</span></div><div class="ux-attention-grid"></div>';
 const grid=box.querySelector('.ux-attention-grid');
 const cards=[['facturas','Pendiente de cobro',eur(collect),pendingInvoices.length+' facturas'+(overdue?' · '+overdue+' vencidas':''),overdue?'urgent':''],['compras','Pendiente de pago',eur(pay),purchases.filter(x=>pendingPurchase(S,x)>.009).length+' compras',''],['obra','Obra abierta',String(work),work===1?'registro abierto':'registros abiertos',''],['finanzas','Banco por conciliar',String(bank),bank===1?'movimiento':'movimientos',bank?'attention':'']];
 cards.forEach(([route,label,value,sub,severity])=>{const b=document.createElement('button');b.type='button';b.className='ux-attention-card'+(severity?' '+severity:'');b.innerHTML='<small>'+label+'</small><strong>'+value+'</strong><span>'+sub+'</span>';b.onclick=()=>window.iriarteRoute&&window.iriarteRoute(route);grid.appendChild(b)});
 const grids=[...view.querySelectorAll(':scope > .grid')];const anchor=grids[0]||view.querySelector('.ux-dashboard-links');if(anchor)anchor.after(box);else view.prepend(box);
}
function run(){clearTimeout(timer);timer=setTimeout(render,40)}
new MutationObserver(run).observe(document.documentElement,{childList:true,subtree:true});document.addEventListener('DOMContentLoaded',run);window.addEventListener('hashchange',run);
})();
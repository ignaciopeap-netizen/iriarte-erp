// Iriarte ERP V2 · los estados de cobro/pago se derivan de los movimientos reales
(function(){
'use strict';
let timer;
function option(value,label=value,selected=false){const o=document.createElement('option');o.value=value;o.textContent=label;o.selected=selected;return o}
function note(select,text){const label=select.closest('label');if(!label)return;let n=label.querySelector('[data-derived-state-note]');if(!n){n=document.createElement('small');n.dataset.derivedStateNote='1';n.style.cssText='display:block;margin-top:5px;color:var(--muted);line-height:1.35';label.appendChild(n)}n.textContent=text}
function invoice(){
 const form=document.querySelector('#invoice-pro-form');if(!form||form.dataset.stateGuard==='1')return;form.dataset.stateGuard='1';
 const s=form.elements.estado;if(!s)return;const current=s.value,fid=window.__iriarteEditingInvoiceId||null;
 const hasCollections=!!fid&&(window.APP?.data?.cobros||[]).some(x=>String(x.factura_id)===String(fid));
 s.innerHTML='';
 if(hasCollections){
   s.appendChild(option(current,current.replaceAll('_',' '),true));
   note(s,'Esta factura tiene cobros registrados. Su estado de cobro se calcula automáticamente y no puede anularse mientras esos cobros sigan vinculados.');
   return;
 }
 if(['parcialmente_cobrada','cobrada'].includes(current)){
   s.appendChild(option(current,current.replaceAll('_',' '),true));
 }else{
   ['borrador','emitida','vencida','anulada'].forEach(v=>s.appendChild(option(v,v,v===current)));
 }
 note(s,'Los estados “parcialmente cobrada” y “cobrada” se calculan automáticamente a partir de los cobros registrados.');
}
function purchaseEdit(){
 const form=document.querySelector('#c-form');if(!form||form.dataset.stateGuard==='1')return;form.dataset.stateGuard='1';
 const s=form.elements.estado;if(!s)return;const current=s.value||'pendiente';s.innerHTML='';
 s.appendChild(option(current,current.replaceAll('_',' '),true));
 if(current!=='anulada')s.appendChild(option('anulada','anulada'));
 note(s,'El estado pendiente/parcialmente pagada/pagada se calcula automáticamente a partir de los pagos registrados.');
}
function purchaseNew(){
 const form=document.querySelector('#x-form');if(!form||form.dataset.purchaseStateGuard==='1')return;const title=form.closest('.modal')?.querySelector('.modal-head h2')?.textContent?.trim();if(title!=='Nueva compra')return;form.dataset.purchaseStateGuard='1';
 const s=form.elements.estado;if(!s)return;s.innerHTML='';s.appendChild(option('pendiente','pendiente',true));
 note(s,'La compra se crea pendiente. Registra después el pago para que el ERP actualice su estado y la tesorería.');
}
function enhance(){clearTimeout(timer);timer=setTimeout(()=>{invoice();purchaseEdit();purchaseNew()},25)}
new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});window.addEventListener('load',enhance);
})();

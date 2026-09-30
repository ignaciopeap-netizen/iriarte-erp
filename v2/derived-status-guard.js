// Iriarte ERP V2 · los estados de cobro/pago se derivan de los movimientos reales
(function(){
'use strict';
let timer;
function option(value,label=value,selected=false){const o=document.createElement('option');o.value=value;o.textContent=label;o.selected=selected;return o}
function note(select,text){const label=select.closest('label');if(!label)return;let n=label.querySelector('[data-derived-state-note]');if(!n){n=document.createElement('small');n.dataset.derivedStateNote='1';n.style.cssText='display:block;margin-top:5px;color:var(--muted);line-height:1.35';label.appendChild(n)}n.textContent=text}
function invoice(){
 const form=document.querySelector('#invoice-pro-form');if(!form||form.dataset.stateGuard==='1')return;form.dataset.stateGuard='1';
 const s=form.elements.estado;if(!s)return;const current=String(s.value||'borrador').toLowerCase(),fid=window.__iriarteEditingInvoiceId||null;
 const collections=!!fid?(window.APP?.data?.cobros||[]).filter(x=>String(x.factura_id)===String(fid)):[];
 const hasCollections=collections.length>0;s.innerHTML='';
 if(hasCollections){
   const derived=['parcialmente_cobrada','cobrada'].includes(current)?current:'parcialmente_cobrada';
   s.appendChild(option(derived,derived.replaceAll('_',' '),true));
   note(s,'Esta factura tiene cobros registrados. Su estado de cobro se calcula automáticamente y no puede anularse mientras esos cobros sigan vinculados.');
   return;
 }
 const stale=['parcialmente_cobrada','cobrada'].includes(current),selected=stale?'emitida':current;
 ['borrador','emitida','vencida','anulada'].forEach(v=>s.appendChild(option(v,v,v===selected));
 note(s,stale?'El estado de cobro anterior no tiene cobros que lo respalden. Al guardar se normalizará como emitida. Los estados de cobro son siempre automáticos.':'Los estados “parcialmente cobrada” y “cobrada” se calculan automáticamente a partir de los cobros registrados.');
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

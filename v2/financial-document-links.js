// Iriarte ERP V2 · adjuntos directos desde facturas y compras
(function(){
'use strict';
let timer;
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
function countDocs(field,id){return (window.APP?.data?.docs||[]).filter(x=>String(x[field]||'')===String(id)).length}
function decorateInvoices(){
 if(window.APP?.route!=='facturas')return;
 document.querySelectorAll('[data-action^="edit-invoice:"]').forEach(edit=>{
   const id=edit.dataset.action.split(':')[1],cell=edit.closest('td');if(!cell||cell.querySelector(`[data-fdl-invoice="${CSS.escape(id)}"]`))return;
   const n=countDocs('factura_id',id),b=document.createElement('button');b.className='btn';b.type='button';b.dataset.fdlInvoice=id;b.textContent=n?`Adjuntos (${n})`:'Adjuntar';cell.append(' ',b);
 });
}
function decoratePurchases(){
 if(window.APP?.route!=='compras')return;
 document.querySelectorAll('[data-p-edit]').forEach(edit=>{
   const id=edit.dataset.pEdit,box=edit.parentElement;if(!box||box.querySelector(`[data-fdl-purchase="${CSS.escape(id)}"]`))return;
   const n=countDocs('compra_id',id),b=document.createElement('button');b.className='btn';b.type='button';b.dataset.fdlPurchase=id;b.textContent=n?`Adjuntos (${n})`:'Adjuntar factura';box.insertBefore(b,box.querySelector('.danger')||null);
 });
}
function openDocsFor(field,id){
 const doc=(window.APP?.data?.docs||[]).find(x=>String(x[field]||'')===String(id));
 if(doc){window.APP.sel.project=doc.proyecto_id||window.APP.sel.project;location.hash='#documentos';setTimeout(()=>{const del=document.querySelector(`[data-op-delete="documentos:${CSS.escape(doc.id)}"]`);del?.closest('tr')?.scrollIntoView({behavior:'smooth',block:'center'})},250);return}
 const ctx=field==='factura_id'?{factura_id:id}:{compra_id:id};
 if(typeof window.openIriarteDocumentUploadContext==='function')window.openIriarteDocumentUploadContext(ctx);
}
function addAttachment(field,id){
 const ctx=field==='factura_id'?{factura_id:id}:{compra_id:id};
 if(typeof window.openIriarteDocumentUploadContext==='function')window.openIriarteDocumentUploadContext(ctx);
}
function handle(field,id){
 const n=countDocs(field,id);if(!n)return addAttachment(field,id);
 const action=confirm(`Hay ${n} documento${n===1?'':'s'} vinculado${n===1?'':'s'}.\n\nAceptar: abrir Documentos.\nCancelar: adjuntar otro archivo.`);
 if(action)openDocsFor(field,id);else addAttachment(field,id);
}
function run(){clearTimeout(timer);timer=setTimeout(()=>{decorateInvoices();decoratePurchases()},70)}
new MutationObserver(run).observe(document.body,{childList:true,subtree:true});window.addEventListener('hashchange',run);window.addEventListener('load',run);
document.addEventListener('click',e=>{const b=e.target.closest('[data-fdl-invoice],[data-fdl-purchase]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();if(b.dataset.fdlInvoice)handle('factura_id',b.dataset.fdlInvoice);else handle('compra_id',b.dataset.fdlPurchase)},true);
})();

// Iriarte ERP V2 · adjuntos directos desde facturas, compras y obra
(function(){
'use strict';
let timer;
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
function decorateObra(){
 if(window.APP?.route!=='obra')return;
 document.querySelectorAll('[data-op-delete^="obra_tareas:"]').forEach(del=>{
   const id=del.dataset.opDelete.split(':')[1],box=del.parentElement;if(!box||box.querySelector(`[data-fdl-task="${CSS.escape(id)}"]`))return;
   const n=countDocs('tarea_id',id),b=document.createElement('button');b.className='btn';b.type='button';b.dataset.fdlTask=id;b.textContent=n?`Adjuntos (${n})`:'Adjuntar';box.insertBefore(b,del);
 });
 document.querySelectorAll('[data-op-delete^="obra_incidencias:"]').forEach(del=>{
   const id=del.dataset.opDelete.split(':')[1],box=del.parentElement;if(!box||box.querySelector(`[data-fdl-incident="${CSS.escape(id)}"]`))return;
   const n=countDocs('incidencia_id',id),b=document.createElement('button');b.className='btn';b.type='button';b.dataset.fdlIncident=id;b.textContent=n?`Adjuntos (${n})`:'Adjuntar';box.insertBefore(b,del);
 });
}
function relationContext(field,id){return field==='factura_id'?{factura_id:id}:field==='compra_id'?{compra_id:id}:field==='tarea_id'?{tarea_id:id}:{incidencia_id:id}}
function openDocsFor(field,id){
 const doc=(window.APP?.data?.docs||[]).find(x=>String(x[field]||'')===String(id));
 if(doc){
   window.APP.sel.project=doc.proyecto_id||window.APP.sel.project;
   if(window.iriarteRoute)window.iriarteRoute('documentos');else location.hash='#documentos';
   setTimeout(()=>{const del=document.querySelector(`[data-op-delete="documentos:${CSS.escape(String(doc.id))}"]`);del?.closest('tr')?.scrollIntoView({behavior:'smooth',block:'center'});del?.closest('tr')?.animate?.([{background:'#eef2e9'},{background:'transparent'}],{duration:1400})},260);return
 }
 addAttachment(field,id)
}
function addAttachment(field,id){if(typeof window.openIriarteDocumentUploadContext==='function')window.openIriarteDocumentUploadContext(relationContext(field,id))}
function handle(field,id){
 const n=countDocs(field,id);if(!n)return addAttachment(field,id);
 const action=confirm(`Hay ${n} documento${n===1?'':'s'} vinculado${n===1?'':'s'}.\n\nAceptar: abrir Documentos.\nCancelar: adjuntar otro archivo.`);
 if(action)openDocsFor(field,id);else addAttachment(field,id)
}
function run(){clearTimeout(timer);timer=setTimeout(()=>{decorateInvoices();decoratePurchases();decorateObra()},70)}
new MutationObserver(run).observe(document.body,{childList:true,subtree:true});window.addEventListener('hashchange',run);window.addEventListener('load',run);
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-fdl-invoice],[data-fdl-purchase],[data-fdl-task],[data-fdl-incident]');if(!b)return;
 e.preventDefault();e.stopImmediatePropagation();
 if(b.dataset.fdlInvoice)handle('factura_id',b.dataset.fdlInvoice);
 else if(b.dataset.fdlPurchase)handle('compra_id',b.dataset.fdlPurchase);
 else if(b.dataset.fdlTask)handle('tarea_id',b.dataset.fdlTask);
 else handle('incidencia_id',b.dataset.fdlIncident)
},true);
})();

// Iriarte ERP V2 · contexto relacional para documentos
(function(){
'use strict';
let timer;
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

function contextLabel(doc){
 const D=window.APP?.data||{};
 const invoice=(D.facturas||[]).find(x=>String(x.id)===String(doc.factura_id));
 const purchase=(D.compras||[]).find(x=>String(x.id)===String(doc.compra_id));
 const task=(D.tareas||[]).find(x=>String(x.id)===String(doc.tarea_id));
 const incident=(D.incidencias||[]).find(x=>String(x.id)===String(doc.incidencia_id));
 if(invoice)return `Factura ${invoice.numero||'borrador'}`;
 if(purchase)return `Compra ${purchase.numero_factura||purchase.concepto||''}`.trim();
 if(task)return `Tarea · ${task.titulo||''}`;
 if(incident)return `Incidencia · ${incident.titulo||''}`;
 return '';
}

function prepareUploader(){
 const form=document.querySelector('#du-form');
 if(!form||form.dataset.contextReady==='1')return;
 form.dataset.contextReady='1';
 const D=window.APP?.data||{};
 const project=form.elements.proyecto_id,client=form.elements.cliente_id,supplier=form.elements.proveedor_id,invoice=form.elements.factura_id,purchase=form.elements.compra_id;
 const info=document.createElement('div');
 info.className='notice';info.style.display='none';info.dataset.documentContextInfo='1';
 form.querySelector('.form-grid')?.after(info);
 function show(text){info.textContent=text;info.style.display=text?'block':'none'}
 function chooseInvoice(){
   if(!invoice?.value)return false;
   const x=(D.facturas||[]).find(v=>String(v.id)===String(invoice.value));if(!x)return false;
   if(purchase)purchase.value='';
   if(project)project.value=x.proyecto_id||'';
   if(client)client.value=x.cliente_id||'';
   if(supplier)supplier.value='';
   show(`El documento quedará vinculado a la factura ${x.numero||'borrador'} y heredará automáticamente su proyecto y cliente.`);return true
 }
 function choosePurchase(){
   if(!purchase?.value)return false;
   const x=(D.compras||[]).find(v=>String(v.id)===String(purchase.value));if(!x)return false;
   if(invoice)invoice.value='';
   if(project)project.value=x.proyecto_id||'';
   if(supplier)supplier.value=x.proveedor_id||'';
   if(client)client.value='';
   show(`El documento quedará vinculado a la compra ${x.numero_factura||x.concepto||''} y heredará automáticamente su proyecto y proveedor.`);return true
 }
 function enforceFinancialContext(){if(invoice?.value)return chooseInvoice();if(purchase?.value)return choosePurchase();return false}
 if(invoice)invoice.addEventListener('change',()=>{if(!invoice.value){show('');return}chooseInvoice()});
 if(purchase)purchase.addEventListener('change',()=>{if(!purchase.value){show('');return}choosePurchase()});
 [project,client,supplier].filter(Boolean).forEach(x=>x.addEventListener('change',()=>{if(invoice?.value||purchase?.value)queueMicrotask(enforceFinancialContext)}));
 const pending=window.__iriartePendingDocumentContext;
 if(pending){
   if(pending.factura_id&&invoice){invoice.value=pending.factura_id;chooseInvoice()}
   else if(pending.compra_id&&purchase){purchase.value=pending.compra_id;choosePurchase()}
   else if(pending.proyecto_id&&project){project.value=pending.proyecto_id;show('El documento quedará vinculado al proyecto seleccionado.')}
   window.__iriartePendingDocumentContext=null;
 }
}

function decorateDocumentRows(){
 if(window.APP?.route!=='documentos')return;
 document.querySelectorAll('[data-op-delete^="documentos:"]').forEach(btn=>{
   const id=btn.dataset.opDelete.split(':')[1],doc=(window.APP?.data?.docs||[]).find(x=>String(x.id)===String(id));
   const row=btn.closest('tr');if(!row||!doc||row.dataset.contextDecorated==='1')return;
   row.dataset.contextDecorated='1';
   const first=row.querySelector('td');const label=contextLabel(doc);
   if(label&&first){const small=document.createElement('small');small.style.cssText='display:block;color:var(--green);margin-top:3px';small.textContent=label;first.appendChild(small)}
 });
}

function openFor(ctx){
 window.__iriartePendingDocumentContext=ctx||{};
 const b=document.createElement('button');b.type='button';b.hidden=true;b.dataset.action='new-doc';document.body.appendChild(b);b.click();b.remove();
}
window.openIriarteDocumentUploadContext=openFor;

function run(){clearTimeout(timer);timer=setTimeout(()=>{prepareUploader();decorateDocumentRows()},40)}
new MutationObserver(run).observe(document.body,{childList:true,subtree:true});window.addEventListener('hashchange',run);window.addEventListener('load',run);
})();

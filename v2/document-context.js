// Iriarte ERP V2 · contexto relacional para documentos
(function(){
'use strict';
let timer;
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[m]));

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
function setOptions(select,rows,value,label){
 if(!select)return;const current=String(value??select.value??'');
 select.innerHTML='<option value="">—</option>'+(rows||[]).map(x=>`<option value="${esc(x.id)}" ${String(x.id)===current?'selected':''}>${esc(label(x))}</option>`).join('');
 if(current&&(rows||[]).some(x=>String(x.id)===current))select.value=current;else select.value='';
}

function prepareUploader(){
 const form=document.querySelector('#du-form');
 if(!form||form.dataset.contextReady==='1')return;
 form.dataset.contextReady='1';
 const D=window.APP?.data||{};
 const project=form.elements.proyecto_id,client=form.elements.cliente_id,supplier=form.elements.proveedor_id,invoice=form.elements.factura_id,purchase=form.elements.compra_id,task=form.elements.tarea_id,incident=form.elements.incidencia_id;
 const info=document.createElement('div');info.className='notice';info.style.display='none';info.dataset.documentContextInfo='1';form.querySelector('.form-grid')?.after(info);
 function show(text){info.textContent=text;info.style.display=text?'block':'none'}
 function filterOperational(preferredTask=task?.value,preferredIncident=incident?.value){
   const pid=String(project?.value||'');
   const tasks=pid?(D.tareas||[]).filter(x=>String(x.project_id||'')===pid):(D.tareas||[]);
   const incidents=pid?(D.incidencias||[]).filter(x=>String(x.project_id||'')===pid):(D.incidencias||[]);
   setOptions(task,tasks,preferredTask,x=>x.titulo||'Tarea');setOptions(incident,incidents,preferredIncident,x=>x.titulo||'Incidencia');
 }
 function chooseInvoice(){
   if(!invoice?.value)return false;const x=(D.facturas||[]).find(v=>String(v.id)===String(invoice.value));if(!x)return false;
   if(purchase)purchase.value='';if(project)project.value=x.proyecto_id||'';if(client)client.value=x.cliente_id||'';if(supplier)supplier.value='';filterOperational();
   show(`El documento quedará vinculado a la factura ${x.numero||'borrador'} y heredará automáticamente su proyecto y cliente.`);return true
 }
 function choosePurchase(){
   if(!purchase?.value)return false;const x=(D.compras||[]).find(v=>String(v.id)===String(purchase.value));if(!x)return false;
   if(invoice)invoice.value='';if(project)project.value=x.proyecto_id||'';if(supplier)supplier.value=x.proveedor_id||'';if(client)client.value='';filterOperational();
   show(`El documento quedará vinculado a la compra ${x.numero_factura||x.concepto||''} y heredará automáticamente su proyecto y proveedor.`);return true
 }
 function chooseTask(){
   if(!task?.value)return false;const x=(D.tareas||[]).find(v=>String(v.id)===String(task.value));if(!x)return false;
   if(project)project.value=x.project_id||'';filterOperational(x.id,incident?.value);show(`El documento quedará vinculado a la tarea “${x.titulo||'Tarea'}” y al mismo proyecto.`);return true
 }
 function chooseIncident(){
   if(!incident?.value)return false;const x=(D.incidencias||[]).find(v=>String(v.id)===String(incident.value));if(!x)return false;
   if(project)project.value=x.project_id||'';filterOperational(task?.value,x.id);show(`El documento quedará vinculado a la incidencia “${x.titulo||'Incidencia'}” y al mismo proyecto.`);return true
 }
 function enforceFinancialContext(){if(invoice?.value)return chooseInvoice();if(purchase?.value)return choosePurchase();return false}
 if(invoice)invoice.addEventListener('change',()=>{if(!invoice.value){show('');return}chooseInvoice()});
 if(purchase)purchase.addEventListener('change',()=>{if(!purchase.value){show('');return}choosePurchase()});
 if(task)task.addEventListener('change',()=>{if(!task.value){show('');return}chooseTask()});
 if(incident)incident.addEventListener('change',()=>{if(!incident.value){show('');return}chooseIncident()});
 if(project)project.addEventListener('change',()=>{if(invoice?.value||purchase?.value){queueMicrotask(enforceFinancialContext);return}filterOperational();show(project.value?'Las tareas e incidencias se han limitado al proyecto seleccionado.':'')});
 [client,supplier].filter(Boolean).forEach(x=>x.addEventListener('change',()=>{if(invoice?.value||purchase?.value)queueMicrotask(enforceFinancialContext)}));
 filterOperational();
 const pending=window.__iriartePendingDocumentContext;
 if(pending){
   if(pending.factura_id&&invoice){invoice.value=pending.factura_id;chooseInvoice()}
   else if(pending.compra_id&&purchase){purchase.value=pending.compra_id;choosePurchase()}
   else if(pending.tarea_id&&task){const x=(D.tareas||[]).find(v=>String(v.id)===String(pending.tarea_id));if(x&&project)project.value=x.project_id||'';filterOperational(pending.tarea_id,'');task.value=pending.tarea_id;chooseTask()}
   else if(pending.incidencia_id&&incident){const x=(D.incidencias||[]).find(v=>String(v.id)===String(pending.incidencia_id));if(x&&project)project.value=x.project_id||'';filterOperational('',pending.incidencia_id);incident.value=pending.incidencia_id;chooseIncident()}
   else if(pending.proyecto_id&&project){project.value=pending.proyecto_id;filterOperational();show('El documento quedará vinculado al proyecto seleccionado.')}
   window.__iriartePendingDocumentContext=null;
 }
}

function decorateDocumentRows(){
 if(window.APP?.route!=='documentos')return;
 document.querySelectorAll('[data-op-delete^="documentos:"]').forEach(btn=>{
   const id=btn.dataset.opDelete.split(':')[1],doc=(window.APP?.data?.docs||[]).find(x=>String(x.id)===String(id));
   const row=btn.closest('tr');if(!row||!doc||row.dataset.contextDecorated==='1')return;
   row.dataset.contextDecorated='1';const first=row.querySelector('td'),label=contextLabel(doc);
   if(label&&first){const small=document.createElement('small');small.style.cssText='display:block;color:var(--green);margin-top:3px';small.textContent=label;first.appendChild(small)}
 });
}
function openFor(ctx){window.__iriartePendingDocumentContext=ctx||{};const b=document.createElement('button');b.type='button';b.hidden=true;b.dataset.action='new-doc';document.body.appendChild(b);b.click();b.remove()}
window.openIriarteDocumentUploadContext=openFor;
function run(){clearTimeout(timer);timer=setTimeout(()=>{prepareUploader();decorateDocumentRows()},40)}
new MutationObserver(run).observe(document.body,{childList:true,subtree:true});window.addEventListener('hashchange',run);window.addEventListener('load',run);
})();

// Iriarte ERP V2 · conciliación bancaria sincronizada con cobros y pagos reales
(function(){
'use strict';
const $=s=>document.querySelector(s);
const db=()=>window.__iriarteDb;
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const money=v=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v||0));
function options(rows,value,label){return '<option value="">—</option>'+(rows||[]).map(x=>`<option value="${esc(x.id)}" ${String(x.id)===String(value)?'selected':''}>${esc(label(x))}</option>`).join('')}
function movement(id){return (window.APP?.data?.movs||[]).find(x=>String(x.id)===String(id))||null}
function invoicePending(x){const paid=(window.APP?.data?.cobros||[]).filter(c=>String(c.factura_id)===String(x.id)).reduce((a,c)=>a+Number(c.importe||0),0);return Math.max(0,Number(x.total||0)-paid)}
function purchasePending(x){const paid=(window.APP?.data?.pagos||[]).filter(p=>String(p.compra_id)===String(x.id)).reduce((a,p)=>a+Number(p.importe||0),0);return Math.max(0,Number(x.total||0)-paid)}
function open(id){
 const client=db(),m=movement(id);if(!client||!m)return;
 const D=window.APP?.data||{},isCollection=m.tipo==='cobro',isPayment=m.tipo==='pago';
 const invoices=(D.facturas||[]).filter(x=>x.estado!=='anulada'&&(invoicePending(x)>0.009||String(x.id)===String(m.factura_id)));
 const purchases=(D.compras||[]).filter(x=>x.estado!=='anulada'&&(purchasePending(x)>0.009||String(x.id)===String(m.compra_id)));
 const root=$('#modal-root');
 root.innerHTML=`<div class="modal-backdrop"><div class="modal" style="width:min(900px,96vw)">
   <div class="modal-head"><div><h2>Conciliar movimiento bancario</h2><small style="color:var(--muted)">${esc(m.fecha||'')} · ${esc(m.concepto||'Movimiento')} · <b>${money((isPayment?-1:1)*Number(m.total||0))}</b></small></div><div class="grow"></div><button class="btn" type="button" data-rs-close>Cerrar</button></div>
   <form id="rs-form"><div class="modal-body">
     <div class="notice"><b>${isCollection?'Cobro bancario':isPayment?'Pago bancario':'Movimiento bancario'}.</b> ${isCollection?'Si lo vinculas a una factura, el ERP registrará el cobro real y actualizará automáticamente su estado.':isPayment?'Si lo vinculas a una compra, el ERP registrará el pago real y actualizará automáticamente su estado.':'Puedes clasificarlo y vincularlo al proyecto correspondiente.'}</div>
     <div class="form-grid">
       <label class="full">Concepto banco<input value="${esc(m.concepto||'')}" disabled></label>
       <label>Categoría<input name="categoria" value="${esc(m.categoria||'')}"></label>
       <label>Subcategoría<input name="subcategoria" value="${esc(m.subcategoria||'')}"></label>
       <label>Proyecto<select name="proyecto_id">${options(D.proyectos,m.proyecto_id,x=>x.nombre)}</select></label>
       <label>Cliente<select name="cliente_id">${options(D.clientes,m.cliente_id,x=>x.nombre)}</select></label>
       <label>Proveedor<select name="proveedor_id">${options(D.proveedores,m.proveedor_id,x=>x.nombre)}</select></label>
       ${isCollection?`<label class="full">Factura a cobrar<select name="factura_id">${options(invoices,m.factura_id,x=>(x.numero||'Borrador')+' · '+(x.concepto||'')+' · pendiente '+money(invoicePending(x)))}</select></label>`:''}
       ${isPayment?`<label class="full">Compra a pagar<select name="compra_id">${options(purchases,m.compra_id,x=>(x.numero_factura||x.concepto||'Compra')+' · pendiente '+money(purchasePending(x)))}</select></label>`:''}
       <label class="full">Notas<textarea name="notas">${esc(m.notas||'')}</textarea></label>
     </div>
     <div id="rs-error"></div>
   </div><div class="modal-foot"><button class="btn" type="button" data-rs-close>Cancelar</button><button class="btn primary" type="submit">Conciliar y registrar</button></div></form>
 </div></div>`;
 const close=()=>root.innerHTML='';root.querySelectorAll('[data-rs-close]').forEach(b=>b.onclick=close);
 const form=$('#rs-form');
 const factura=form.elements.factura_id,compra=form.elements.compra_id,project=form.elements.proyecto_id,clientSel=form.elements.cliente_id,supplierSel=form.elements.proveedor_id;
 if(factura)factura.onchange=()=>{const f=(D.facturas||[]).find(x=>String(x.id)===String(factura.value));if(!f)return;if(f.proyecto_id)project.value=f.proyecto_id;if(f.cliente_id)clientSel.value=f.cliente_id};
 if(compra)compra.onchange=()=>{const c=(D.compras||[]).find(x=>String(x.id)===String(compra.value));if(!c)return;if(c.proyecto_id)project.value=c.proyecto_id;if(c.proveedor_id)supplierSel.value=c.proveedor_id};
 form.onsubmit=async e=>{e.preventDefault();const submit=e.submitter;submit.disabled=true;try{const f=Object.fromEntries(new FormData(form).entries());if(isCollection&&!f.factura_id&&!confirm('No has vinculado ninguna factura. Se marcará el movimiento como conciliado, pero no se registrará un cobro. ¿Continuar?')){submit.disabled=false;return}if(isPayment&&!f.compra_id&&!confirm('No has vinculado ninguna compra. Se marcará el movimiento como conciliado, pero no se registrará un pago. ¿Continuar?')){submit.disabled=false;return}
   const {data,error}=await client.rpc('conciliar_movimiento_v2',{p_movimiento_id:id,p_proyecto_id:f.proyecto_id||null,p_cliente_id:f.cliente_id||null,p_proveedor_id:f.proveedor_id||null,p_factura_id:f.factura_id||null,p_compra_id:f.compra_id||null,p_categoria:f.categoria||null,p_subcategoria:f.subcategoria||null,p_notas:f.notas||null});if(error)throw error;
   close();if(window.reloadIriarte)await window.reloadIriarte();else location.reload();
 }catch(err){$('#rs-error').innerHTML=`<div class="notice" style="background:#f6dfd7;color:#8f4d3c"><b>No se pudo conciliar.</b><br>${esc(err.message||err)}</div>`;submit.disabled=false}};
}
// Se carga antes que workflow-plus.js. La escucha en captura evita que el conciliador antiguo procese el mismo clic.
document.addEventListener('click',e=>{const b=e.target.closest('[data-wf-reconcile]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();open(b.dataset.wfReconcile)},true);
})();

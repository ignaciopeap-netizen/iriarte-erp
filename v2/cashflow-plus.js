// Iriarte ERP V2 · corrección segura de cobros y pagos
(function(){
'use strict';
const db=()=>window.__iriarteDb;
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[m]));
const num=v=>Number(String(v??0).replace(',','.'))||0;
const money=v=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(num(v));
let timer;
function D(){return window.APP?.data||{}}
function invoice(id){return (D().facturas||[]).find(x=>String(x.id)===String(id))||null}
function purchase(id){return (D().compras||[]).find(x=>String(x.id)===String(id))||null}
function clientName(id){return (D().clientes||[]).find(x=>String(x.id)===String(id))?.nombre||'—'}
function supplierName(id){return (D().proveedores||[]).find(x=>String(x.id)===String(id))?.nombre||'—'}
function projectName(id){return (D().proyectos||[]).find(x=>String(x.id)===String(id))?.nombre||'—'}
function bankLink(kind,id){return (D().movs||[]).find(m=>String(kind==='collection'?m.cobro_id:m.pago_id)===String(id)&&m.origen_importacion)||null}
function isBank(kind,id){const m=bankLink(kind,id);return !!(m&&m.conciliado)}
function parent(kind,row){return kind==='collection'?invoice(row.factura_id):purchase(row.compra_id)}
function siblings(kind,row){return kind==='collection'?(D().cobros||[]).filter(x=>String(x.factura_id)===String(row.factura_id)):(D().pagos||[]).filter(x=>String(x.compra_id)===String(row.compra_id))}
function maxAmount(kind,row){const p=parent(kind,row),others=siblings(kind,row).filter(x=>String(x.id)!==String(row.id)).reduce((a,x)=>a+num(x.importe),0);return Math.max(0,num(p?.total)-others)}
function goBank(){if(window.iriarteRoute)window.iriarteRoute('finanzas');else location.hash='#finanzas'}
function modal(kind,row){
 if(isBank(kind,row.id)){alert(`Este ${kind==='collection'?'cobro':'pago'} procede de una conciliación bancaria. Para corregirlo, desconcilia primero el movimiento desde Banco.`);goBank();return}
 const p=parent(kind,row);if(!p)return alert('No se ha encontrado el documento de origen.');const max=maxAmount(kind,row),root=$('#modal-root');if(!root)return;
 const label=kind==='collection'?'cobro':'pago',doc=kind==='collection'?(p.numero||'Factura'):(p.numero_factura||p.concepto||'Compra');
 root.innerHTML=`<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h2>Editar ${label}</h2><div class="grow"></div><button class="btn" type="button" data-cf-close>Cerrar</button></div><form id="cf-form"><div class="modal-body"><div class="form-grid"><label class="full">Documento<input value="${esc(doc)}" disabled></label><label>Fecha<input name="fecha" type="date" value="${esc(row.fecha||'')}" required></label><label>Importe<input name="importe" type="number" min="0.01" max="${max.toFixed(2)}" step="0.01" value="${num(row.importe).toFixed(2)}" required><small style="display:block;color:var(--muted);margin-top:4px">Máximo posible con los demás movimientos: ${money(max)}</small></label><label>Método<input name="metodo" value="${esc(row.metodo||'')}"></label><label>Cuenta<input name="cuenta" value="${esc(row.cuenta||'')}"></label><label>Referencia<input name="referencia" value="${esc(row.referencia||'')}"></label><label class="full">Notas<textarea name="notas">${esc(row.notas||'')}</textarea></label></div><div class="notice"><b>Corrección manual.</b> El documento de origen no puede cambiarse desde aquí. Al guardar, el movimiento financiero y el estado de la ${kind==='collection'?'factura':'compra'} se recalculan automáticamente.</div><div id="cf-error"></div></div><div class="modal-foot"><button class="btn" type="button" data-cf-close>Cancelar</button><button class="btn primary" type="submit">Guardar</button></div></form></div></div>`;
 const close=()=>root.innerHTML='';root.querySelectorAll('[data-cf-close]').forEach(b=>b.onclick=close);
 $('#cf-form').onsubmit=async e=>{e.preventDefault();const submit=e.submitter,err=$('#cf-error');submit.disabled=true;err.innerHTML='';try{const f=Object.fromEntries(new FormData(e.currentTarget).entries()),amount=num(f.importe);if(amount<=0)throw new Error(`El importe del ${label} debe ser mayor que cero.`);if(amount>max+0.009)throw new Error(`El importe no puede superar ${money(max)}.`);const table=kind==='collection'?'cobros':'pagos';const {error}=await db().from(table).update({fecha:f.fecha,importe:amount,metodo:f.metodo||null,cuenta:f.cuenta||null,referencia:f.referencia||null,notas:f.notas||null}).eq('id',row.id);if(error)throw error;close();if(window.reloadIriarte)await window.reloadIriarte();else location.reload()}catch(ex){err.innerHTML=`<div class="notice" style="background:#f6dfd7;color:#8f4d3c">${esc(ex.message||ex)}</div>`;submit.disabled=false}}
}
async function remove(kind,row){
 const label=kind==='collection'?'cobro':'pago';if(isBank(kind,row.id)){alert(`Este ${label} procede de una conciliación bancaria. Desconcílialo primero desde Banco para conservar la trazabilidad del extracto.`);goBank();return}
 if(!confirm(`¿Eliminar este ${label} de ${money(row.importe)}? El movimiento financiero asociado se eliminará y el estado del documento se recalculará automáticamente.`))return;
 const table=kind==='collection'?'cobros':'pagos';const {error}=await db().from(table).delete().eq('id',row.id);if(error){alert(`No se pudo eliminar el ${label}:\n`+error.message);return}if(window.reloadIriarte)await window.reloadIriarte();else location.reload()
}
function rowsFor(kind){const S=window.APP,Dd=D(),pid=S?.sel?.project||'';if(kind==='collection')return (Dd.cobros||[]).filter(x=>{const f=invoice(x.factura_id);return !pid||String(f?.proyecto_id||'')===String(pid)});return (Dd.pagos||[]).filter(x=>{const c=purchase(x.compra_id);return !pid||String(c?.proyecto_id||'')===String(pid)})}
function panel(kind){
 const view=$('#app-view');if(!view)return;const id=kind==='collection'?'cf-collections':'cf-payments';if($('#'+id))return;const rows=rowsFor(kind),title=kind==='collection'?'Cobros registrados':'Pagos registrados',empty=kind==='collection'?'No hay cobros registrados para este filtro.':'No hay pagos registrados para este filtro.';
 const section=document.createElement('section');section.id=id;section.className='card panel';section.style.marginTop='14px';
 section.innerHTML=`<h3>${title}</h3><p style="font-size:11px;color:var(--muted)">Los movimientos manuales pueden corregirse aquí. Los materializados desde una conciliación bancaria se corrigen desconciliando primero en Banco.</p>${rows.length?`<div class="table-wrap"><table class="table"><tr><th>Fecha</th><th>${kind==='collection'?'Factura':'Compra'}</th><th>${kind==='collection'?'Cliente':'Proveedor'}</th><th>Proyecto</th><th>Método</th><th>Referencia</th><th>Origen</th><th>Importe</th><th></th></tr>${rows.map(x=>{const p=parent(kind,x),bank=isBank(kind,x.id),doc=kind==='collection'?(p?.numero||'Sin número'):(p?.numero_factura||p?.concepto||'Compra'),party=kind==='collection'?clientName(p?.cliente_id):supplierName(p?.proveedor_id);return `<tr><td>${esc(x.fecha||'')}</td><td><b>${esc(doc)}</b></td><td>${esc(party)}</td><td>${esc(projectName(p?.proyecto_id))}</td><td>${esc(x.metodo||'')}</td><td>${esc(x.referencia||'')}</td><td><span class="badge ${bank?'good':''}">${bank?'Banco conciliado':'Manual ERP'}</span></td><td><b>${money(x.importe)}</b></td><td><div class="toolbar">${bank?`<button class="btn" data-cf-bank>Ir a Banco</button>`:`<button class="btn" data-cf-edit="${kind}:${esc(x.id)}">Editar</button><button class="btn danger" data-cf-delete="${kind}:${esc(x.id)}">Eliminar</button>`}</div></td></tr>`}).join('')}</table></div>`:`<div class="empty">${empty}</div>`}`;
 view.appendChild(section)
}
function schedule(){clearTimeout(timer);timer=setTimeout(()=>{const r=window.APP?.route;if(r==='facturas')panel('collection');else if(r==='compras')panel('payment')},90)}
function find(kind,id){return (kind==='collection'?(D().cobros||[]):(D().pagos||[])).find(x=>String(x.id)===String(id))||null}
window.iriarteEditCollection=id=>{const x=find('collection',id);if(x)modal('collection',x)};
window.iriarteEditPayment=id=>{const x=find('payment',id);if(x)modal('payment',x)};
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});window.addEventListener('load',schedule);window.addEventListener('hashchange',schedule);document.addEventListener('iriarte:route',schedule);
document.addEventListener('click',e=>{const edit=e.target.closest('[data-cf-edit]'),del=e.target.closest('[data-cf-delete]'),bank=e.target.closest('[data-cf-bank]');if(bank){e.preventDefault();goBank();return}if(edit){e.preventDefault();const [kind,id]=edit.dataset.cfEdit.split(':');const x=find(kind,id);if(x)modal(kind,x);return}if(del){e.preventDefault();const [kind,id]=del.dataset.cfDelete.split(':');const x=find(kind,id);if(x)remove(kind,x)}},true);
})();

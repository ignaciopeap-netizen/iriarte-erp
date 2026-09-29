// Iriarte ERP V2 · registro unificado y filtros por cualquier campo
(function(){
'use strict';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const num=v=>Number(String(v??0).replace(',','.'))||0;
const money=v=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(num(v));
let timer;
function D(){return window.APP?.data||{}}
function byId(arr,id){return (arr||[]).find(x=>String(x.id)===String(id))||null}
function clientName(id){return byId(D().clientes,id)?.nombre||''}
function supplierName(id){return byId(D().proveedores,id)?.nombre||''}
function projectName(id){return byId(D().proyectos,id)?.nombre||''}
function primitive(v){return v==null?'':typeof v==='object'?JSON.stringify(v):String(v)}
function dateOf(x){return x.fecha||x.date||x.fecha_documento||x.fecha_limite||String(x.created_at||x.updated_at||'').slice(0,10)}
function rows(){
 const d=D(),out=[];
 const add=(type,x,extra={})=>{const projectId=extra.projectId??x.proyecto_id??x.project_id??null,clientId=extra.clientId??x.cliente_id??null,supplierId=extra.supplierId??x.proveedor_id??null;out.push({type,id:x.id,raw:x,projectId,clientId,supplierId,date:extra.date??dateOf(x),ref:extra.ref??x.numero??x.ref??x.codigo??x.numero_factura??x.referencia??'',party:extra.party??(clientName(clientId)||supplierName(supplierId)),project:extra.project??projectName(projectId),concept:extra.concept??x.concepto??x.nombre??x.name??x.titulo??x.descripcion??'',status:extra.status??x.estado??x.status??x.phase??'',base:extra.base??x.base??'',amount:extra.amount??x.total??x.importe??'',open:extra.open||null})};
 (d.clientes||[]).forEach(x=>add('Cliente',x,{party:x.nombre,project:'',concept:x.contacto||x.email||'',status:x.activo===false?'inactivo':'activo',open:['client',x.id]}));
 (d.proveedores||[]).forEach(x=>add('Proveedor',x,{party:x.nombre,project:'',concept:x.contacto||x.tipo||'',status:x.activo===false?'inactivo':'activo',open:['supplier',x.id]}));
 (d.proyectos||[]).forEach(x=>add('Proyecto',x,{ref:x.codigo||'',party:clientName(x.cliente_id),project:x.nombre,concept:x.direccion||x.descripcion||'',open:['project',x.id]}));
 (d.presupuestos||[]).forEach(x=>add('Presupuesto',x,{party:clientName(x.cliente_id)||x.client||'',project:projectName(x.proyecto_id),concept:x.name||x.nombre||'',open:['budget',x.id]}));
 (d.facturas||[]).forEach(x=>add('Factura',x,{party:clientName(x.cliente_id),project:projectName(x.proyecto_id),open:['invoice',x.id]}));
 (d.compras||[]).forEach(x=>add('Compra',x,{party:supplierName(x.proveedor_id),project:projectName(x.proyecto_id),open:['purchase',x.id]}));
 (d.cobros||[]).forEach(x=>add('Cobro',x,{ref:x.factura_id||'',project:projectName(x.proyecto_id),concept:x.concepto||'Cobro',amount:x.importe}));
 (d.pagos||[]).forEach(x=>add('Pago',x,{ref:x.compra_id||'',project:projectName(x.proyecto_id),concept:x.concepto||'Pago',amount:x.importe}));
 (d.horas||[]).forEach(x=>add('Horas',x,{party:x.persona||'',project:projectName(x.proyecto_id),concept:x.concepto||x.notas||'',amount:num(x.horas)*num(x.coste_hora),open:['operational','horas_proyecto:'+x.id]}));
 (d.visitas||[]).forEach(x=>add('Visita',x,{project:projectName(x.project_id),concept:x.titulo||x.descripcion||'',status:x.estado_obra||'',open:['operational','obra_visitas:'+x.id]}));
 (d.tareas||[]).forEach(x=>add('Tarea',x,{date:x.fecha_limite||dateOf(x),project:projectName(x.project_id),concept:x.titulo||x.descripcion||'',open:['operational','obra_tareas:'+x.id]}));
 (d.incidencias||[]).forEach(x=>add('Incidencia',x,{project:projectName(x.project_id),concept:x.titulo||x.descripcion||'',open:['operational','obra_incidencias:'+x.id]}));
 (d.docs||[]).forEach(x=>add('Documento',x,{project:projectName(x.proyecto_id),concept:x.nombre||x.archivo_nombre||'',status:x.tipo||'',open:['document',x.id]}));
 (d.gastos||[]).forEach(x=>add('Gasto general',x,{party:supplierName(x.proveedor_id)||x.proveedor||'',project:projectName(x.proyecto_id),concept:x.concepto||x.categoria||'',open:['expense',x.id]}));
 (d.movs||[]).forEach(x=>add('Banco',x,{party:x.cliente_proveedor||'',project:projectName(x.proyecto_id),concept:x.concepto||x.concepto_banco||'',status:x.conciliado?'conciliado':'pendiente',amount:x.total??x.importe,open:[x.conciliado?'detail':'bank',x.id]}));
 return out
}
function rawValue(r,field){if(field.startsWith('_'))return primitive(r[field.slice(1)]);return primitive(r.raw?.[field])}
function fieldNames(list){const set=new Set(['_type','_date','_ref','_party','_project','_concept','_status','_base','_amount']);list.forEach(r=>Object.keys(r.raw||{}).forEach(k=>set.add(k)));return [...set].sort((a,b)=>a.localeCompare(b,'es'))}
function fieldLabel(f){return ({_type:'Tipo',_date:'Fecha',_ref:'Referencia',_party:'Cliente / proveedor',_project:'Proyecto',_concept:'Concepto',_status:'Estado',_base:'Base',_amount:'Total / importe'})[f]||f}
function searchText(r){return [r.type,r.date,r.ref,r.party,r.project,r.concept,r.status,r.base,r.amount,JSON.stringify(r.raw||{})].join(' ').toLowerCase()}
function detail(r){const root=$('#modal-root'),entries=Object.entries(r.raw||{});root.innerHTML=`<div class="modal-backdrop"><div class="modal" style="width:min(950px,96vw)"><div class="modal-head"><h2>${esc(r.type)} · ${esc(r.ref||r.concept||r.id||'Registro')}</h2><div class="grow"></div><button class="btn" data-reg-close>Cerrar</button></div><div class="modal-body"><div class="grid cols-2">${entries.map(([k,v])=>`<div class="info"><small>${esc(k)}</small><b style="overflow-wrap:anywhere;white-space:pre-wrap">${esc(primitive(v)||'—')}</b></div>`).join('')}</div></div></div></div>`;root.querySelector('[data-reg-close]').onclick=()=>root.innerHTML=''}
function open(r){
 if(r.open){const [type,id]=r.open;if(type==='client')return window.iriarteOpenClientHub?.(id);if(type==='supplier')return window.iriarteOpenSupplierHub?.(id);if(type==='operational'){const [table,recordId]=String(id).split(':');if(window.iriarteEditOperationalRecord)return window.iriarteEditOperationalRecord(table,recordId)}if(type==='expense'&&window.iriarteEditExpense)return window.iriarteEditExpense(id);if(type==='bank'&&window.iriarteReconcileMovement)return window.iriarteReconcileMovement(id);if(type==='detail')return detail(r);return window.iriarteOpenRecord?.(type,id)}
 const route={Horas:'horas',Visita:'obra',Tarea:'obra',Incidencia:'obra','Gasto general':'gastos',Banco:'finanzas'}[r.type];if(route){if(r.projectId)window.APP.sel.project=r.projectId;if(window.iriarteRoute)window.iriarteRoute(route);else location.hash='#'+route;return}detail(r)
}
function styles(){if($('#records-styles'))return;const s=document.createElement('style');s.id='records-styles';s.textContent=`.records-tools{display:grid;grid-template-columns:minmax(220px,1.3fr) minmax(150px,.55fr) minmax(180px,.7fr) minmax(180px,.7fr);gap:8px;margin-bottom:12px}.records-tools input,.records-tools select,.records-col-filter{width:100%;border:1px solid var(--line);border-radius:7px;padding:8px;background:#fff}.records-table th{white-space:nowrap}.records-table td{max-width:300px;overflow:hidden;text-overflow:ellipsis}.records-row{cursor:pointer}.records-row:hover{background:#edf0e8}.records-filter-row th{padding:4px}.records-filter-row input{font-size:10px;padding:5px}@media(max-width:950px){.records-tools{grid-template-columns:1fr 1fr}}`;document.head.appendChild(s)}
function render(){
 if(location.hash!=='#registros')return;const view=$('#app-view'),S=window.APP;if(!view||!S||view.querySelector('#records-v2'))return;styles();S.route='registros';
 const all=rows(),types=[...new Set(all.map(x=>x.type))].sort((a,b)=>a.localeCompare(b,'es'));
 view.innerHTML=`<div id="records-v2"><div class="page-head"><div><h1>Registros</h1><p style="color:var(--muted);margin:4px 0 0">Todos los registros operativos del ERP en una sola vista. Pulsa una fila para abrir o editar el registro concreto.</p></div></div><div class="records-tools"><input data-reg-global placeholder="Buscar en cualquier campo…"><select data-reg-type><option value="">Todos los tipos</option>${types.map(t=>`<option>${esc(t)}</option>`).join('')}</select><select data-reg-field></select><input data-reg-field-value placeholder="Filtrar valor del campo…"></div><div class="notice" style="margin-bottom:12px"><b data-reg-count>${all.length}</b> registros visibles. El filtro de campo permite buscar también por columnas internas que no aparecen en el resumen.</div><div class="card panel table-wrap"><table class="table records-table"><thead><tr><th>Tipo</th><th>Fecha</th><th>Referencia</th><th>Cliente / proveedor</th><th>Proyecto</th><th>Concepto</th><th>Estado</th><th>Base</th><th>Total / importe</th></tr><tr class="records-filter-row">${['_type','_date','_ref','_party','_project','_concept','_status','_base','_amount'].map(f=>`<th><input class="records-col-filter" data-reg-col="${f}" placeholder="Filtrar…"></th>`).join('')}</tr></thead><tbody data-reg-body></tbody></table></div></div>`;
 const state={type:'',global:'',field:'_type',fieldValue:'',cols:{}};
 const typeSel=$('[data-reg-type]'),global=$('[data-reg-global]'),fieldSel=$('[data-reg-field]'),fieldValue=$('[data-reg-field-value]'),body=$('[data-reg-body]'),count=$('[data-reg-count]');
 function updateFields(){const list=state.type?all.filter(r=>r.type===state.type):all,fields=fieldNames(list),old=state.field;fieldSel.innerHTML=fields.map(f=>`<option value="${esc(f)}">${esc(fieldLabel(f))}</option>`).join('');state.field=fields.includes(old)?old:fields[0]||'_type';fieldSel.value=state.field}
 function filtered(){return all.filter(r=>{if(state.type&&r.type!==state.type)return false;if(state.global&&!searchText(r).includes(state.global))return false;if(state.fieldValue&&!rawValue(r,state.field).toLowerCase().includes(state.fieldValue))return false;for(const [f,q] of Object.entries(state.cols))if(q&&!rawValue(r,f).toLowerCase().includes(q))return false;return true})}
 function draw(){const list=filtered();count.textContent=list.length;body.innerHTML=list.map(r=>`<tr class="records-row" data-reg-index="${all.indexOf(r)}"><td>${esc(r.type)}</td><td>${esc(r.date||'')}</td><td>${esc(r.ref||'')}</td><td>${esc(r.party||'')}</td><td>${esc(r.project||'')}</td><td title="${esc(r.concept||'')}">${esc(r.concept||'')}</td><td>${esc(r.status||'')}</td><td>${r.base!==''?money(r.base):''}</td><td>${r.amount!==''?money(r.amount):''}</td></tr>`).join('')||'<tr><td colspan="9"><div class="empty">No hay registros que coincidan con los filtros.</div></td></tr>'}
 updateFields();draw();
 global.oninput=()=>{state.global=global.value.toLowerCase();draw()};typeSel.onchange=()=>{state.type=typeSel.value;updateFields();draw()};fieldSel.onchange=()=>{state.field=fieldSel.value;draw()};fieldValue.oninput=()=>{state.fieldValue=fieldValue.value.toLowerCase();draw()};document.querySelectorAll('[data-reg-col]').forEach(x=>x.oninput=()=>{state.cols[x.dataset.regCol]=x.value.toLowerCase();draw()});body.onclick=e=>{const tr=e.target.closest('[data-reg-index]');if(!tr)return;open(all[Number(tr.dataset.regIndex)])};
}
function schedule(){clearTimeout(timer);timer=setTimeout(()=>{if(location.hash==='#registros')render()},60)}
document.addEventListener('click',e=>{const a=e.target.closest('[data-records-nav]');if(!a)return;e.preventDefault();e.stopImmediatePropagation();history.replaceState(null,'','#registros');window.APP.route='registros';const view=$('#app-view');if(view)view.innerHTML='';render();document.querySelectorAll('#main-nav .nav-item').forEach(x=>x.classList.toggle('active',x===a))},true);
window.addEventListener('hashchange',schedule);window.addEventListener('load',schedule);new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
})();

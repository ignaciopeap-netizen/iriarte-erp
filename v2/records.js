// Iriarte ERP V2 · registro unificado con columnas reales por módulo
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
function primitive(v){if(v==null)return'';if(typeof v==='object')return JSON.stringify(v);return String(v)}
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
 (d.cobros||[]).forEach(x=>{const f=byId(d.facturas,x.factura_id);add('Cobro',x,{ref:f?.numero||x.factura_id||'',clientId:f?.cliente_id??null,projectId:f?.proyecto_id??null,party:clientName(f?.cliente_id),project:projectName(f?.proyecto_id),concept:x.referencia?`Cobro · ${x.referencia}`:'Cobro',amount:x.importe,open:f?['invoice',f.id]:null})});
 (d.pagos||[]).forEach(x=>{const c=byId(d.compras,x.compra_id);add('Pago',x,{ref:c?.numero_factura||c?.referencia||x.compra_id||'',supplierId:c?.proveedor_id??null,projectId:c?.proyecto_id??null,party:supplierName(c?.proveedor_id),project:projectName(c?.proyecto_id),concept:x.referencia?`Pago · ${x.referencia}`:'Pago',amount:x.importe,open:c?['purchase',c.id]:null})});
 (d.horas||[]).forEach(x=>add('Horas',x,{party:x.persona||'',project:projectName(x.proyecto_id),concept:x.concepto||x.notas||'',amount:num(x.horas)*num(x.coste_hora),open:['operational','horas_proyecto:'+x.id]}));
 (d.visitas||[]).forEach(x=>add('Visita',x,{project:projectName(x.project_id),concept:x.titulo||x.descripcion||'',status:x.estado_obra||'',open:['operational','obra_visitas:'+x.id]}));
 (d.tareas||[]).forEach(x=>add('Tarea',x,{date:x.fecha_limite||dateOf(x),project:projectName(x.project_id),concept:x.titulo||x.descripcion||'',open:['operational','obra_tareas:'+x.id]}));
 (d.incidencias||[]).forEach(x=>add('Incidencia',x,{project:projectName(x.project_id),concept:x.titulo||x.descripcion||'',open:['operational','obra_incidencias:'+x.id]}));
 (d.docs||[]).forEach(x=>add('Documento',x,{project:projectName(x.proyecto_id),concept:x.nombre||x.archivo_nombre||'',status:x.tipo||'',open:['document',x.id]}));
 (d.gastos||[]).forEach(x=>add('Gasto general',x,{party:supplierName(x.proveedor_id)||x.proveedor||'',project:projectName(x.proyecto_id),concept:x.concepto||x.categoria||'',open:['expense',x.id]}));
 (d.movs||[]).forEach(x=>add('Banco',x,{party:x.cliente_proveedor||clientName(x.cliente_id)||supplierName(x.proveedor_id)||'',project:projectName(x.proyecto_id),concept:x.concepto||x.concepto_banco||'',status:x.conciliado?'conciliado':'pendiente',amount:x.total??x.importe,open:[x.conciliado?'detail':'bank',x.id]}));
 return out
}
const SUMMARY=[
 {key:'_type',label:'Tipo',get:r=>r.type},{key:'_date',label:'Fecha',get:r=>r.date},{key:'_ref',label:'Referencia',get:r=>r.ref},
 {key:'_party',label:'Cliente / proveedor',get:r=>r.party},{key:'_project',label:'Proyecto',get:r=>r.project},{key:'_concept',label:'Concepto',get:r=>r.concept},
 {key:'_status',label:'Estado',get:r=>r.status},{key:'_base',label:'Base',get:r=>r.base,kind:'money'},{key:'_amount',label:'Total / importe',get:r=>r.amount,kind:'money'}
];
function rawKeys(list){const s=new Set();list.forEach(r=>Object.keys(r.raw||{}).forEach(k=>s.add(k)));return [...s].sort((a,b)=>a.localeCompare(b,'es'))}
function pretty(k){const special={id:'ID',created_at:'Creado',updated_at:'Actualizado',created_by:'Creado por',cliente_id:'Cliente ID',proveedor_id:'Proveedor ID',proyecto_id:'Proyecto ID',project_id:'Proyecto ID',factura_id:'Factura ID',compra_id:'Compra ID'};return special[k]||k.replaceAll('_',' ').replace(/^./,m=>m.toUpperCase())}
function rawColumn(k){return {key:k,label:pretty(k),get:r=>r.raw?.[k]}}
function columnsFor(list,type){if(!type)return SUMMARY;const raw=rawKeys(list),existing=new Set(SUMMARY.map(x=>x.key));return [...SUMMARY.filter(x=>x.key!=='_type'),...raw.filter(k=>!existing.has(k)).map(rawColumn)]}
function value(r,c){return primitive(c.get(r))}
function searchText(r){return [r.type,r.date,r.ref,r.party,r.project,r.concept,r.status,r.base,r.amount,JSON.stringify(r.raw||{})].join(' ').toLowerCase()}
function fieldList(list,type){const cols=columnsFor(list,type),keys=new Set(cols.map(c=>c.key));rawKeys(list).forEach(k=>keys.add(k));return [...keys].map(k=>{const c=cols.find(x=>x.key===k);return {key:k,label:c?.label||pretty(k),get:c?.get||((r)=>r.raw?.[k])}}).sort((a,b)=>a.label.localeCompare(b.label,'es'))}
function detail(r){const root=$('#modal-root'),entries=Object.entries(r.raw||{});root.innerHTML=`<div class="modal-backdrop"><div class="modal" style="width:min(950px,96vw)"><div class="modal-head"><h2>${esc(r.type)} · ${esc(r.ref||r.concept||r.id||'Registro')}</h2><div class="grow"></div><button class="btn" data-reg-close>Cerrar</button></div><div class="modal-body"><div class="grid cols-2">${entries.map(([k,v])=>`<div class="info"><small>${esc(pretty(k))}</small><b style="overflow-wrap:anywhere;white-space:pre-wrap">${esc(primitive(v)||'—')}</b></div>`).join('')}</div></div></div></div>`;root.querySelector('[data-reg-close]').onclick=()=>root.innerHTML=''}
function open(r){
 if(r.open){const [type,id]=r.open;if(type==='client')return window.iriarteOpenClientHub?.(id);if(type==='supplier')return window.iriarteOpenSupplierHub?.(id);if(type==='operational'){const [table,recordId]=String(id).split(':');if(window.iriarteEditOperationalRecord)return window.iriarteEditOperationalRecord(table,recordId)}if(type==='expense'&&window.iriarteEditExpense)return window.iriarteEditExpense(id);if(type==='bank'&&window.iriarteReconcileMovement)return window.iriarteReconcileMovement(id);if(type==='detail')return detail(r);return window.iriarteOpenRecord?.(type,id)}
 detail(r)
}
function styles(){if($('#records-styles'))return;const s=document.createElement('style');s.id='records-styles';s.textContent=`.records-tools{display:grid;grid-template-columns:minmax(220px,1.3fr) minmax(150px,.55fr) minmax(180px,.8fr) minmax(180px,.8fr);gap:8px;margin-bottom:12px}.records-tools input,.records-tools select,.records-col-filter{width:100%;border:1px solid var(--line);border-radius:7px;padding:8px;background:#fff}.records-table{min-width:max-content}.records-table th{white-space:nowrap;position:sticky;top:0;background:#fff;z-index:1}.records-table td{max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.records-row{cursor:pointer}.records-row:hover{background:#edf0e8}.records-filter-row th{padding:4px;top:33px}.records-filter-row input{font-size:10px;padding:5px;min-width:105px}.records-meta{display:flex;gap:16px;flex-wrap:wrap;color:var(--muted);font-size:11px;margin:8px 0 12px}@media(max-width:950px){.records-tools{grid-template-columns:1fr 1fr}}`;document.head.appendChild(s)}
function render(){
 const view=$('#app-view'),S=window.APP;if(!view||!S||S.route!=='registros'||view.querySelector('#records-v2'))return;styles();
 const all=rows(),types=[...new Set(all.map(x=>x.type))].sort((a,b)=>a.localeCompare(b,'es'));
 view.innerHTML=`<div id="records-v2"><div class="page-head"><div><h1>Registros</h1><p style="color:var(--muted);margin:4px 0 0">Vista global de todos los módulos. Selecciona un tipo para ver sus campos reales como columnas y filtrarlos individualmente.</p></div></div><div class="records-tools"><input data-reg-global placeholder="Buscar en cualquier campo…"><select data-reg-type><option value="">Todos los módulos</option>${types.map(t=>`<option>${esc(t)}</option>`).join('')}</select><select data-reg-field></select><input data-reg-field-value placeholder="Filtrar valor de cualquier campo…"></div><div class="records-meta"><span><b data-reg-count>${all.length}</b> registros visibles</span><span data-reg-column-note>Vista resumen transversal</span></div><div class="card panel table-wrap"><table class="table records-table"><thead data-reg-head></thead><tbody data-reg-body></tbody></table></div></div>`;
 const state={type:'',global:'',field:'',fieldValue:'',cols:{}};
 const typeSel=$('[data-reg-type]'),global=$('[data-reg-global]'),fieldSel=$('[data-reg-field]'),fieldValue=$('[data-reg-field-value]'),head=$('[data-reg-head]'),body=$('[data-reg-body]'),count=$('[data-reg-count]'),note=$('[data-reg-column-note]');
 function scoped(){return state.type?all.filter(r=>r.type===state.type):all}
 function fields(){return fieldList(scoped(),state.type)}
 function columns(){return columnsFor(scoped(),state.type)}
 function updateFieldSelector(){const fs=fields(),old=state.field;fieldSel.innerHTML='<option value="">— Filtrar por campo —</option>'+fs.map(f=>`<option value="${esc(f.key)}">${esc(f.label)}</option>`).join('');state.field=fs.some(f=>f.key===old)?old:'';fieldSel.value=state.field}
 function fieldDef(key){return fields().find(f=>f.key===key)}
 function filtered(){return scoped().filter(r=>{if(state.global&&!searchText(r).includes(state.global))return false;if(state.field&&state.fieldValue){const f=fieldDef(state.field);if(!f||!primitive(f.get(r)).toLowerCase().includes(state.fieldValue))return false}for(const [k,q] of Object.entries(state.cols)){if(!q)continue;const c=columns().find(x=>x.key===k);if(!c||!value(r,c).toLowerCase().includes(q))return false}return true})}
 function display(v,c){if(v==null||v==='')return'';if(c.kind==='money')return money(v);const text=primitive(v);return esc(text.length>180?text.slice(0,177)+'…':text)}
 function drawHead(){const cols=columns();head.innerHTML=`<tr>${cols.map(c=>`<th>${esc(c.label)}</th>`).join('')}</tr><tr class="records-filter-row">${cols.map(c=>`<th><input class="records-col-filter" data-reg-col="${esc(c.key)}" value="${esc(state.cols[c.key]||'')}" placeholder="Filtrar…"></th>`).join('')}</tr>`;head.querySelectorAll('[data-reg-col]').forEach(x=>x.oninput=()=>{state.cols[x.dataset.regCol]=x.value.toLowerCase();drawBody()});note.textContent=state.type?`${cols.length} columnas · campos reales de ${state.type}`:'Vista resumen transversal'}
 function drawBody(){const cols=columns(),list=filtered();count.textContent=list.length;body.innerHTML=list.map(r=>`<tr class="records-row" data-reg-index="${all.indexOf(r)}">${cols.map(c=>`<td title="${esc(value(r,c))}">${display(c.get(r),c)}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${Math.max(1,cols.length)}"><div class="empty">No hay registros que coincidan con los filtros.</div></td></tr>`}
 function redraw(){drawHead();drawBody()}
 updateFieldSelector();redraw();
 global.oninput=()=>{state.global=global.value.toLowerCase();drawBody()};
 typeSel.onchange=()=>{state.type=typeSel.value;state.cols={};state.field='';state.fieldValue='';fieldValue.value='';updateFieldSelector();redraw()};
 fieldSel.onchange=()=>{state.field=fieldSel.value;drawBody()};
 fieldValue.oninput=()=>{state.fieldValue=fieldValue.value.toLowerCase();drawBody()};
 body.onclick=e=>{const tr=e.target.closest('[data-reg-index]');if(!tr)return;open(all[Number(tr.dataset.regIndex)])};
}
window.renderIriarteRecords=render;
function schedule(){clearTimeout(timer);timer=setTimeout(()=>{if(window.APP?.route==='registros')render()},35)}
document.addEventListener('iriarte:route',schedule);window.addEventListener('load',schedule);new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
})();

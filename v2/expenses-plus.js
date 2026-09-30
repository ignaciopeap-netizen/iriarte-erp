// Iriarte ERP V2 · gastos generales editables y coherentes con Finanzas
(function(){
'use strict';
const db=()=>window.__iriarteDb;
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[m]));
const num=v=>Number(String(v??0).replace(',','.'))||0;
const money=v=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(num(v));
const today=()=>new Date().toISOString().slice(0,10);
let timer;
function D(){return window.APP?.data||{}}
function projectName(id){return (D().proyectos||[]).find(x=>String(x.id)===String(id))?.nombre||'—'}
function supplierName(id){return (D().proveedores||[]).find(x=>String(x.id)===String(id))?.nombre||'—'}
function opts(rows,val){return '<option value="">—</option>'+(rows||[]).map(x=>`<option value="${esc(x.id)}" ${String(x.id)===String(val)?'selected':''}>${esc(x.nombre||'')}</option>`).join('')}
function periodicity(v){const values=['puntual','mensual','trimestral','semestral','anual'];return '<option value="">—</option>'+values.map(x=>`<option value="${x}" ${String(v||'')===x?'selected':''}>${x}</option>`).join('')}
function form(x={}){
 const editing=!!x.id,S=window.APP,Dd=D(),root=$('#modal-root'),selectedProject=editing?(x.proyecto_id||''):(S?.sel?.project||'');if(!root)return;
 root.innerHTML=`<div class="modal-backdrop"><div class="modal" style="width:min(820px,96vw)"><div class="modal-head"><h2>${editing?'Editar gasto general':'Nuevo gasto general'}</h2><div class="grow"></div><button class="btn" type="button" data-exp-close>Cerrar</button></div><form id="exp-form"><div class="modal-body"><div class="form-grid">
 <label>Fecha<input name="fecha" type="date" value="${esc(x.fecha||today())}" required></label>
 <label>Categoría<input name="categoria" value="${esc(x.categoria||'Otros')}" required></label>
 <label class="full">Concepto<input name="concepto" value="${esc(x.concepto||'')}" required></label>
 <label>Proveedor<select name="proveedor_id">${opts(Dd.proveedores,x.proveedor_id)}</select></label>
 <label>Proyecto opcional<select name="proyecto_id">${opts(Dd.proyectos,selectedProject)}</select></label>
 <label>Base imponible<input name="base" type="number" min="0" step="0.01" value="${num(x.base)}" required></label>
 <label>IVA %<input name="iva_pct" type="number" min="0" max="100" step="0.01" value="${x.iva_pct==null?21:num(x.iva_pct)}" required></label>
 <label>Periodicidad<select name="periodicidad">${periodicity(x.periodicidad)}</select></label>
 <label>Método de pago<input name="metodo" value="${esc(x.metodo||'')}"></label>
 <label>Referencia<input name="referencia" value="${esc(x.referencia||'')}"></label>
 <label>Cuenta<input name="cuenta" value="${esc(x.cuenta||'')}"></label>
 <label>Pagado<select name="pagado"><option value="false" ${x.pagado?'':'selected'}>No</option><option value="true" ${x.pagado?'selected':''}>Sí</option></select></label>
 <label>Fecha de pago<input name="fecha_pago" type="date" value="${esc(x.fecha_pago||'')}"></label>
 <label class="full">Notas<textarea name="notas">${esc(x.notas||'')}</textarea></label>
 </div><div class="notice"><b>Banco y gasto general son conceptos distintos.</b> Marcar “Pagado” solo actualiza el estado administrativo del gasto. No crea ni modifica movimientos bancarios. Si se selecciona un proyecto, el gasto se considera vinculado directamente a ese proyecto en los informes.</div><div id="exp-error"></div></div><div class="modal-foot"><button class="btn" type="button" data-exp-close>Cancelar</button><button class="btn primary" type="submit">Guardar</button></div></form></div></div>`;
 const close=()=>root.innerHTML='';root.querySelectorAll('[data-exp-close]').forEach(b=>b.onclick=close);
 const paid=$('#exp-form').elements.pagado,payDate=$('#exp-form').elements.fecha_pago;const syncPaid=()=>{payDate.disabled=paid.value!=='true';if(paid.value!=='true')payDate.value='';else if(!payDate.value)payDate.value=$('#exp-form').elements.fecha.value||today()};paid.onchange=syncPaid;syncPaid();
 $('#exp-form').onsubmit=async e=>{e.preventDefault();const submit=e.submitter,errorBox=$('#exp-error');submit.disabled=true;errorBox.innerHTML='';try{const f=Object.fromEntries(new FormData(e.currentTarget).entries()),base=num(f.base),ivaPct=num(f.iva_pct);if(base<0)throw new Error('La base no puede ser negativa.');if(ivaPct<0||ivaPct>100)throw new Error('El IVA debe estar entre 0% y 100%.');const iva=base*ivaPct/100,pid=f.proyecto_id||null,isPaid=f.pagado==='true';const payload={fecha:f.fecha,categoria:f.categoria.trim(),concepto:f.concepto.trim(),proveedor_id:f.proveedor_id||null,proyecto_id:pid,base,iva_pct:ivaPct,iva_importe:iva,total:base+iva,periodicidad:f.periodicidad||null,metodo:f.metodo||null,referencia:f.referencia||null,cuenta:f.cuenta||null,pagado:isPaid,fecha_pago:isPaid?(f.fecha_pago||f.fecha):null,notas:f.notas||null,criterio_reparto:pid?'proyecto_directo':'sin_repartir'};const q=editing?db().from('gastos_generales').update(payload).eq('id',x.id):db().from('gastos_generales').insert(payload);const {error}=await q;if(error)throw error;close();if(window.reloadIriarte)await window.reloadIriarte();else location.reload()}catch(err){errorBox.innerHTML=`<div class="notice" style="background:#f6dfd7;color:#8f4d3c">${esc(err.message||err)}</div>`;submit.disabled=false}}
}
async function remove(id){const x=(D().gastos||[]).find(g=>String(g.id)===String(id));if(!x)return;if(!confirm(`¿Eliminar el gasto “${x.concepto||x.categoria||'seleccionado'}”? Esta acción no borra ningún movimiento bancario porque los gastos generales no materializan movimientos por sí solos.`))return;const {error}=await db().from('gastos_generales').delete().eq('id',id);if(error)return alert(error.message);if(window.reloadIriarte)await window.reloadIriarte();else location.reload()}
function render(){
 const S=window.APP;if(S?.route!=='gastos'||$('#expenses-v2'))return;const Dd=D(),pid=S.sel?.project||'',rows=(Dd.gastos||[]).filter(x=>!pid||String(x.proyecto_id||'')===String(pid)),base=rows.reduce((a,x)=>a+num(x.base),0),iva=rows.reduce((a,x)=>a+num(x.iva_importe),0),total=rows.reduce((a,x)=>a+num(x.total),0),paidTotal=rows.filter(x=>x.pagado).reduce((a,x)=>a+num(x.total),0),view=$('#app-view');if(!view)return;
 view.innerHTML=`<div id="expenses-v2"><div class="page-head"><div><h1>Gastos generales</h1><p style="color:var(--muted);margin:4px 0 0">Costes generales del estudio. Pueden quedar sin repartir o vincularse directamente a un proyecto.</p></div><div class="grow"></div><div class="toolbar"><select class="btn" data-exp-project><option value="">Todos los proyectos</option>${(Dd.proyectos||[]).map(p=>`<option value="${esc(p.id)}" ${String(pid)===String(p.id)?'selected':''}>${esc(p.nombre)}</option>`).join('')}</select><button class="btn primary" type="button" data-exp-new>+ Nuevo gasto</button></div></div><div class="grid cols-4"><div class="card kpi"><small>Base</small><strong>${money(base)}</strong></div><div class="card kpi"><small>IVA soportado</small><strong>${money(iva)}</strong></div><div class="card kpi"><small>Total</small><strong>${money(total)}</strong></div><div class="card kpi"><small>Marcado pagado</small><strong>${money(paidTotal)}</strong></div></div>${rows.length?`<div class="card panel table-wrap" style="margin-top:14px"><table class="table"><tr><th>Fecha</th><th>Categoría</th><th>Concepto</th><th>Proveedor</th><th>Proyecto</th><th>Base</th><th>IVA</th><th>Total</th><th>Periodicidad</th><th>Pagado</th><th></th></tr>${rows.map(x=>`<tr><td>${esc(x.fecha||'')}</td><td>${esc(x.categoria||'')}</td><td><b>${esc(x.concepto||'')}</b>${x.referencia?`<br><small>${esc(x.referencia)}</small>`:''}</td><td>${esc(supplierName(x.proveedor_id))}</td><td>${esc(projectName(x.proyecto_id))}</td><td>${money(x.base)}</td><td>${money(x.iva_importe)}</td><td><b>${money(x.total)}</b></td><td>${esc(x.periodicidad||'—')}</td><td><span class="badge ${x.pagado?'good':'warn'}">${x.pagado?'sí':'no'}</span></td><td><div class="toolbar"><button class="btn" data-exp-edit="${esc(x.id)}">Editar</button><button class="btn danger" data-exp-delete="${esc(x.id)}">Eliminar</button></div></td></tr>`).join('')}</table></div>`:'<div class="empty" style="margin-top:14px">No hay gastos generales para este filtro.</div>'}</div>`;
 view.querySelector('[data-exp-project]').onchange=e=>{S.sel.project=e.target.value;view.innerHTML='';render()};view.querySelector('[data-exp-new]').onclick=()=>form();view.querySelectorAll('[data-exp-edit]').forEach(b=>b.onclick=()=>form(rows.find(x=>String(x.id)===String(b.dataset.expEdit))));view.querySelectorAll('[data-exp-delete]').forEach(b=>b.onclick=()=>remove(b.dataset.expDelete));
}
window.iriarteEditExpense=function(id){const x=(D().gastos||[]).find(g=>String(g.id)===String(id));if(x)form(x)};
function schedule(){clearTimeout(timer);timer=setTimeout(render,55)}
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});window.addEventListener('load',schedule);window.addEventListener('hashchange',schedule);document.addEventListener('iriarte:route',schedule);
})();

// Iriarte ERP V2 · flujo fiable Proyecto -> Presupuesto -> Factura
(function(){
  'use strict';
  const db=()=>window.__iriarteDb;
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[m]));
  const num=v=>Number(String(v??0).replace(',','.'))||0;
  const today=()=>new Date().toISOString().slice(0,10);
  let timer;

  function currentBudget(){const S=window.APP;return S?.data?.presupuestos?.find(x=>String(x.id)===String(S?.sel?.budget))||null}
  function budgetBase(p){if((p.kind||'obra')==='honorarios')return (p.fee_lines||[]).reduce((a,x)=>a+num(x.amount??x.importe),0);return (p.items||[]).reduce((a,x)=>a+num(x.qty??x.cantidad)*num(x.price??x.precio),0)}
  function budgetVat(p){if((p.kind||'obra')==='honorarios')return (p.fee_lines||[]).reduce((a,x)=>a+num(x.amount??x.importe)*num(x.vat??x.ivaPct??21)/100,0);return (p.items||[]).reduce((a,x)=>a+num(x.qty??x.cantidad)*num(x.price??x.precio)*num(x.vat??x.ivaPct??21)/100,0)}
  function budgetIrpf(p){return p.irpf_enabled?budgetBase(p)*num(p.irpf_pct||15)/100:0}
  function dateValue(p){const d=p.date||p.fecha;return /^\d{4}-\d{2}-\d{2}$/.test(String(d||''))?String(d):today()}
  function stateFromPhase(phase){const v=String(phase||'Borrador').toLowerCase();if(v.includes('acept'))return'aceptado';if(v.includes('envi'))return'enviado';if(v.includes('rech'))return'rechazado';if(v.includes('anul'))return'anulado';return'borrador'}
  function statusFromPhase(phase){return ({borrador:'Borrador',enviado:'Enviado',aceptado:'Aceptado',rechazado:'Rechazado',anulado:'Anulado'})[stateFromPhase(phase)]||'Borrador'}
  function nextBudgetRef(projectId,code){if(!code)return null;let max=0;(window.APP?.data?.presupuestos||[]).filter(x=>String(x.proyecto_id||'')===String(projectId)).forEach(x=>{const m=String(x.ref||x.numero||'').match(/-Pres\.(\d+)$/i);if(m)max=Math.max(max,Number(m[1])||0)});return `${code}-Pres.${max+1}`}
  function fullInvoicesForBudget(id){return (window.APP?.data?.facturas||[]).filter(x=>String(x.presupuesto_id||'')===String(id)&&!x.presupuesto_fase_id&&String(x.estado||'').toLowerCase()!=='anulada')}
  function phaseInvoicesForBudget(id){return (window.APP?.data?.facturas||[]).filter(x=>String(x.presupuesto_id||'')===String(id)&&!!x.presupuesto_fase_id&&String(x.estado||'').toLowerCase()!=='anulada')}
  function openInvoice(id,projectId){if(projectId)window.APP.sel.project=projectId;localStorage.setItem('iriarte_open_invoice',id);if(window.iriarteRoute)window.iriarteRoute('facturas');else location.hash='#facturas'}

  async function syncCurrentBudget(p){
    const client=db();if(!client)throw new Error('La conexión todavía no está preparada.');
    const date=dateValue(p),name=p.name||p.nombre||'Presupuesto',ref=p.ref||p.numero||null,base=budgetBase(p),vat=budgetVat(p),irpf=budgetIrpf(p),total=base+vat-irpf,phase=p.phase||statusFromPhase(p.estado||p.status);
    const payload={nombre:name,name,cliente_id:p.cliente_id||null,proyecto_id:p.proyecto_id||null,fecha:date,date,numero:ref,ref,client:p.client||null,address:p.address||null,phase,estado:stateFromPhase(phase),kind:p.kind||'obra',irpf_enabled:!!p.irpf_enabled,irpf_pct:p.irpf_enabled?num(p.irpf_pct||15):0,items:p.items||[],status:statusFromPhase(phase),archived:!!p.archived,intro_text:p.intro_text||'',zonas:p.zonas||[],scope_items:p.scope_items||[],redaccion_toggle:p.redaccion_toggle!==false,redaccion_texto:p.redaccion_texto||'',fases_obra:p.fases_obra||[],direccion_resumen:p.direccion_resumen||'',fee_lines:p.fee_lines||[],clausulas:p.clausulas||[],base,total};
    const {data,error}=await client.from('presupuestos').update(payload).eq('id',p.id).select('*').single();if(error)throw error;Object.assign(p,data);return p;
  }

  async function ensureProject(p){
    const client=db();if(!client)throw new Error('La conexión todavía no está preparada.');
    const payload={nombre:p.name||p.nombre||'Proyecto',cliente_id:p.cliente_id||null,codigo:p.ref||p.numero||null,direccion:p.address||null,fecha_inicio:dateValue(p),expediente:p.expte||null,importe_contratado:budgetBase(p)};
    if(p.proyecto_id){
      const {data,error}=await client.from('proyectos').select('id').eq('id',p.proyecto_id).maybeSingle();if(error)throw error;
      if(data?.id){const {error:updateError}=await client.from('proyectos').update(payload).eq('id',data.id);if(updateError)throw updateError;const {error:budgetError}=await client.from('presupuestos').update({estado:'aceptado',status:'Aceptado',phase:'Aceptado'}).eq('id',p.id);if(budgetError)throw budgetError;p.estado='aceptado';p.status='Aceptado';p.phase='Aceptado';return data.id}
    }
    const {data,error}=await client.from('proyectos').insert({...payload,estado:'activo',descripcion:'Creado desde presupuesto '+(p.ref||p.numero||p.id)}).select('id').single();if(error)throw error;
    const {error:e2}=await client.from('presupuestos').update({proyecto_id:data.id,estado:'aceptado',status:'Aceptado',phase:'Aceptado'}).eq('id',p.id);if(e2)throw e2;p.proyecto_id=data.id;p.estado='aceptado';p.status='Aceptado';p.phase='Aceptado';return data.id;
  }

  function openNewBudget(){
    const S=window.APP,D=S?.data||{},projects=D.proyectos||[];if(!projects.length){alert('Primero crea un proyecto. Los presupuestos nuevos se vinculan desde el principio a un proyecto y a su cliente.');return}
    const selected=S.sel.project&&projects.some(x=>String(x.id)===String(S.sel.project))?S.sel.project:projects[0].id,root=$('#modal-root');
    root.innerHTML=`<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h2>Nuevo presupuesto</h2><div class="grow"></div><button class="btn" type="button" data-bwf-close>Cerrar</button></div><form id="bwf-new-form"><div class="modal-body"><div class="form-grid"><label class="full">Proyecto<select name="proyecto_id" id="bwf-project" required>${projects.map(p=>`<option value="${esc(p.id)}" ${String(p.id)===String(selected)?'selected':''}>${esc(p.nombre)}</option>`).join('')}</select></label><label>Cliente<input id="bwf-client" disabled></label><label>Fecha<input name="fecha" type="date" value="${today()}" required></label><label class="full">Nombre<input name="nombre" id="bwf-name" required></label></div><div class="notice"><b>El cliente se toma del proyecto seleccionado.</b> Así evitamos que un presupuesto pueda quedar asociado a un cliente distinto del proyecto.</div><div id="bwf-error"></div></div><div class="modal-foot"><button class="btn" type="button" data-bwf-close>Cancelar</button><button class="btn primary" type="submit">Crear presupuesto</button></div></form></div></div>`;
    const close=()=>root.innerHTML='';root.querySelectorAll('[data-bwf-close]').forEach(b=>b.onclick=close);
    const refresh=()=>{const p=projects.find(x=>String(x.id)===String($('#bwf-project').value)),c=(D.clientes||[]).find(x=>String(x.id)===String(p?.cliente_id));$('#bwf-client').value=c?.nombre||'Sin cliente asignado';if(!$('#bwf-name').value)$('#bwf-name').value=p?.nombre||'Nuevo presupuesto'};refresh();$('#bwf-project').onchange=()=>{$('#bwf-name').value='';refresh()};
    $('#bwf-new-form').onsubmit=async e=>{e.preventDefault();const submit=e.submitter;submit.disabled=true;try{const f=Object.fromEntries(new FormData(e.currentTarget).entries()),p=projects.find(x=>String(x.id)===String(f.proyecto_id)),c=(D.clientes||[]).find(x=>String(x.id)===String(p?.cliente_id));if(!p)throw new Error('Selecciona un proyecto.');if(!c)throw new Error('El proyecto seleccionado no tiene cliente asignado.');const ref=nextBudgetRef(p.id,p.codigo),row={nombre:f.nombre||p.nombre,name:f.nombre||p.nombre,kind:S.budgetKind||'obra',cliente_id:c.id,proyecto_id:p.id,fecha:f.fecha,date:f.fecha,numero:ref,ref,client:c.nombre,address:p.direccion||c.direccion||'',estado:'borrador',status:'Borrador',phase:'Borrador',items:[],fee_lines:[],irpf_enabled:false,irpf_pct:15,base:0,total:0};const {data,error}=await db().from('presupuestos').insert(row).select('id').single();if(error)throw error;S.sel.project=p.id;S.sel.budget=data.id;S.budgetView='edit';close();if(window.reloadIriarte)await window.reloadIriarte();else location.reload()}catch(err){$('#bwf-error').innerHTML=`<div class="notice" style="background:#f6dfd7;color:#8f4d3c">${esc(err.message||err)}</div>`;submit.disabled=false}}
  }

  async function convert(){const p=currentBudget();if(!p)return;try{const existed=!!p.proyecto_id;await syncCurrentBudget(p);const pid=await ensureProject(p);window.APP.sel.project=pid;localStorage.setItem('iriarte_open_project',pid);if(!existed)alert('Proyecto creado y vinculado al presupuesto.');location.hash='#proyectos';location.reload()}catch(err){alert('No se pudo vincular el presupuesto con el proyecto:\n'+(err.message||err))}}

  async function createInvoice(){
    const p=currentBudget(),client=db();if(!p||!client)return;const phaseInvoices=phaseInvoicesForBudget(p.id);
    if(phaseInvoices.length){alert(`Este presupuesto ya está usando facturación por fases (${phaseInvoices.length} factura${phaseInvoices.length===1?'':'s'} activa${phaseInvoices.length===1?'':'s'}). Para evitar duplicar importes, continúa facturando desde las fases del proyecto.`);if(p.proyecto_id){window.APP.sel.project=p.proyecto_id;if(window.iriarteRoute)window.iriarteRoute('proyectos')}return}
    const existing=fullInvoicesForBudget(p.id);
    if(existing.length){const x=[...existing].sort((a,b)=>String(b.created_at||b.fecha||'').localeCompare(String(a.created_at||a.fecha||'')))[0];alert(existing.length===1?'Este presupuesto ya tiene una factura vinculada. Se abrirá la factura existente.':`Este presupuesto ya tiene ${existing.length} facturas completas activas vinculadas. Se abrirá la más reciente para revisarlas antes de crear nada más.`);openInvoice(x.id,x.proyecto_id||p.proyecto_id);return}
    if(!p.proyecto_id){alert('Antes de crear una factura, vincula este presupuesto histórico a un proyecto. Así la factura, el cliente y la rentabilidad quedan dentro del mismo proyecto.');return}
    try{await syncCurrentBudget(p);const {data,error}=await client.rpc('crear_factura_desde_presupuesto_v2',{p_presupuesto_id:p.id});if(error){if(error.code==='23505'){const {data:rows}=await client.from('facturas').select('id,proyecto_id,estado,created_at').eq('presupuesto_id',p.id).is('presupuesto_fase_id',null).neq('estado','anulada').order('created_at',{ascending:false}).limit(1);if(rows?.[0]){alert('La factura ya había sido creada. Se abrirá el registro existente.');openInvoice(rows[0].id,rows[0].proyecto_id||p.proyecto_id);return}}throw error}const invoiceId=data?.invoice_id,projectId=data?.project_id;if(!invoiceId)throw new Error('La base de datos no devolvió la factura creada.');openInvoice(invoiceId,projectId)}catch(err){alert('No se pudo crear la factura desde el presupuesto:\n'+(err.message||err))}
  }

  function decorate(){clearTimeout(timer);timer=setTimeout(()=>{if(window.APP?.route!=='presupuestos'||window.APP?.budgetView!=='edit')return;const p=currentBudget(),b=document.querySelector('[data-action="budget-to-project"]');if(b&&p){if(p.proyecto_id)b.style.display='none';else{b.style.display='';b.textContent='Vincular a proyecto'}}const invoice=document.querySelector('[data-action="budget-to-invoice"]');if(invoice&&p){const existing=fullInvoicesForBudget(p.id),phases=phaseInvoicesForBudget(p.id);invoice.disabled=false;if(existing.length){invoice.textContent='Abrir factura';invoice.title='Este presupuesto ya tiene una factura completa vinculada.'}else if(phases.length){invoice.textContent='Facturación por fases';invoice.title='Este presupuesto ya tiene facturas de fases. Continúa desde la ficha del proyecto.';invoice.disabled=true}else if(!p.proyecto_id){invoice.textContent='Vincula proyecto antes de facturar';invoice.title='Los presupuestos históricos sin proyecto deben vincularse antes de crear una factura.';invoice.disabled=true}else{invoice.textContent='Crear factura';invoice.title=''}}},50)}
  new MutationObserver(decorate).observe(document.body,{childList:true,subtree:true});window.addEventListener('hashchange',decorate);window.addEventListener('load',decorate);
  document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;if(b.dataset.action==='new-budget'){e.preventDefault();e.stopImmediatePropagation();openNewBudget()}else if(b.dataset.action==='budget-to-project'){e.preventDefault();e.stopImmediatePropagation();convert()}else if(b.dataset.action==='budget-to-invoice'){e.preventDefault();e.stopImmediatePropagation();createInvoice()}},true);
})();
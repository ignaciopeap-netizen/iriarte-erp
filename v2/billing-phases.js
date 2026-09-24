// Iriarte ERP V2 · fases de facturación flexibles por presupuesto/proyecto
(function(){
  'use strict';
  const db=()=>window.__iriarteDb;
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const num=v=>Number(String(v??0).replace(',','.'))||0;
  const money=v=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v||0));
  const today=()=>new Date().toISOString().slice(0,10);
  let timer;

  function budgetsForProject(pid){return (window.APP?.data?.presupuestos||[]).filter(x=>String(x.proyecto_id||'')===String(pid))}
  function activeProject(){return window.APP?.sel?.project||null}

  function modal(title,body,onSave){
    const root=$('#modal-root');
    root.innerHTML=`<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h2>${esc(title)}</h2><div class="grow"></div><button class="btn" type="button" data-phase-close>Cerrar</button></div><form id="phase-form"><div class="modal-body">${body}<div id="phase-error"></div></div><div class="modal-foot"><button class="btn" type="button" data-phase-close>Cancelar</button><button class="btn primary" type="submit">Guardar</button></div></form></div></div>`;
    const close=()=>root.innerHTML='';root.querySelectorAll('[data-phase-close]').forEach(b=>b.onclick=close);
    $('#phase-form').onsubmit=async e=>{e.preventDefault();e.submitter.disabled=true;try{await onSave(Object.fromEntries(new FormData(e.currentTarget).entries()));close();location.reload()}catch(err){$('#phase-error').innerHTML=`<div class="notice" style="background:#f6dfd7;color:#8f4d3c">${esc(err.message||err)}</div>`;e.submitter.disabled=false}};
  }

  async function phaseForm(pid,existing=null){
    const budgets=budgetsForProject(pid);if(!budgets.length){alert('Este proyecto todavía no tiene un presupuesto vinculado.');return}
    const b=existing?budgets.find(x=>String(x.id)===String(existing.presupuesto_id))||budgets[0]:budgets[0];
    modal(existing?'Editar fase de facturación':'Nueva fase de facturación',`<div class="form-grid">
      <label>Presupuesto<select name="presupuesto_id">${budgets.map(x=>`<option value="${x.id}" ${String(x.id)===String(existing?.presupuesto_id||b.id)?'selected':''}>${esc(x.name||x.nombre||'Presupuesto')}</option>`).join('')}</select></label>
      <label>Orden<input name="orden" type="number" min="1" step="1" value="${existing?.orden||1}"></label>
      <label class="full">Nombre / hito<input name="nombre" required value="${esc(existing?.nombre||'')}" placeholder="Anticipo, entrega de proyecto, fin de obra…"></label>
      <label>Porcentaje %<input name="porcentaje" type="number" step="0.01" min="0" max="100" value="${existing?.porcentaje??''}"></label>
      <label>Importe €<input name="importe" type="number" step="0.01" min="0" value="${existing?.importe??''}"></label>
      <label>Fecha prevista<input name="fecha_prevista" type="date" value="${esc(existing?.fecha_prevista||'')}"></label>
      <label>Estado<select name="estado"><option ${existing?.estado==='pendiente'?'selected':''}>pendiente</option><option ${existing?.estado==='facturada'?'selected':''}>facturada</option><option ${existing?.estado==='cobrada'?'selected':''}>cobrada</option><option ${existing?.estado==='anulada'?'selected':''}>anulada</option></select></label>
      <label class="full">Descripción<textarea name="descripcion">${esc(existing?.descripcion||'')}</textarea></label>
    </div>`,async f=>{
      const budget=budgets.find(x=>String(x.id)===String(f.presupuesto_id));const base=num(budget?.base);
      let pct=num(f.porcentaje),amount=num(f.importe);if(!amount&&pct)amount=base*pct/100;if(!pct&&amount&&base)pct=amount/base*100;
      const payload={presupuesto_id:f.presupuesto_id,orden:Math.max(1,Math.round(num(f.orden)||1)),nombre:f.nombre,descripcion:f.descripcion||null,porcentaje:pct||null,importe:amount||null,fecha_prevista:f.fecha_prevista||null,estado:f.estado||'pendiente'};
      const client=db();if(existing){const {error}=await client.from('presupuesto_fases_facturacion').update(payload).eq('id',existing.id);if(error)throw error}else{const {error}=await client.from('presupuesto_fases_facturacion').insert(payload);if(error)throw error}
    });
  }

  async function makeInvoice(phase,pid,budget){
    const client=db();if(!client)return;
    if(phase.factura_id){localStorage.setItem('iriarte_open_invoice',phase.factura_id);location.hash='#facturas';location.reload();return}
    const amount=num(phase.importe)||(num(budget.base)*num(phase.porcentaje)/100);if(amount<=0){alert('La fase necesita un importe o porcentaje antes de facturar.');return}
    try{
      const payload={numero:null,fecha:today(),cliente_id:budget.cliente_id||null,proyecto_id:pid,presupuesto_id:budget.id,presupuesto_fase_id:phase.id,concepto:phase.nombre||'Fase de facturación',estado:'borrador',irpf_pct:budget.irpf_enabled?num(budget.irpf_pct):0,notas:'Factura creada desde fase de facturación del presupuesto.'};
      const {data,error}=await client.from('facturas').insert(payload).select('id').single();if(error)throw error;
      const iva=num(budget.iva_pct||21);const r=await client.from('factura_lineas').insert({factura_id:data.id,orden:1,seccion:'Fase de facturación',descripcion:phase.nombre||'Fase',unidad:'ud',cantidad:1,precio_unitario:amount,descuento_pct:0,iva_pct:iva});if(r.error)throw r.error;
      const u=await client.from('presupuesto_fases_facturacion').update({factura_id:data.id,estado:'facturada'}).eq('id',phase.id);if(u.error)throw u.error;
      localStorage.setItem('iriarte_open_invoice',data.id);location.hash='#facturas';location.reload();
    }catch(err){alert('No se pudo facturar la fase:\n'+(err.message||err))}
  }

  async function loadAndRender(){
    if(window.APP?.route!=='proyectos')return;const pid=activeProject(),hub=$('#project-hub-v2');if(!pid||!hub||$('#billing-phases-v2'))return;
    const budgets=budgetsForProject(pid);if(!budgets.length)return;
    const ids=budgets.map(x=>x.id),client=db();if(!client)return;
    const {data,error}=await client.from('presupuesto_fases_facturacion').select('*').in('presupuesto_id',ids).order('orden',{ascending:true});if(error)return;
    const phases=data||[],planned=phases.reduce((a,x)=>a+num(x.importe),0),pct=phases.reduce((a,x)=>a+num(x.porcentaje),0);
    const card=document.createElement('section');card.id='billing-phases-v2';card.className='card panel';card.style.marginTop='14px';
    card.innerHTML=`<div class="page-head" style="margin-bottom:8px"><h3>Fases de facturación</h3><div class="grow"></div><button class="btn primary" data-phase-new>+ Fase</button></div>${phases.length?`<div class="table-wrap"><table class="table"><tr><th>Orden</th><th>Presupuesto</th><th>Hito</th><th>%</th><th>Importe</th><th>Prevista</th><th>Estado</th><th></th></tr>${phases.map(x=>{const b=budgets.find(y=>String(y.id)===String(x.presupuesto_id));return `<tr><td>${x.orden||''}</td><td>${esc(b?.name||b?.nombre||'Presupuesto')}</td><td><b>${esc(x.nombre||'')}</b><br><small>${esc(x.descripcion||'')}</small></td><td>${num(x.porcentaje).toLocaleString('es-ES')}%</td><td>${money(x.importe)}</td><td>${esc(x.fecha_prevista||'')}</td><td><span class="badge ${x.estado==='cobrada'?'good':x.estado==='anulada'?'bad':'warn'}">${esc(x.estado||'pendiente')}</span></td><td><div class="toolbar"><button class="btn" data-phase-edit="${x.id}">Editar</button>${x.estado!=='anulada'?`<button class="btn ${x.factura_id?'':'primary'}" data-phase-invoice="${x.id}">${x.factura_id?'Abrir factura':'Facturar'}</button>`:''}</div></td></tr>`}).join('')}<tr><td></td><td></td><td><b>Total planificado</b></td><td><b>${pct.toLocaleString('es-ES')}%</b></td><td><b>${money(planned)}</b></td><td></td><td></td><td></td></tr></table></div>`:'<div class="empty">Sin fases. Puedes crear anticipo, hitos, mensualidades o entrega final.</div>'}`;
    hub.appendChild(card);
    card.querySelector('[data-phase-new]').onclick=()=>phaseForm(pid);
    card.querySelectorAll('[data-phase-edit]').forEach(b=>b.onclick=()=>phaseForm(pid,phases.find(x=>String(x.id)===String(b.dataset.phaseEdit))));
    card.querySelectorAll('[data-phase-invoice]').forEach(b=>b.onclick=()=>{const ph=phases.find(x=>String(x.id)===String(b.dataset.phaseInvoice)),budget=budgets.find(x=>String(x.id)===String(ph.presupuesto_id));makeInvoice(ph,pid,budget)});
  }

  function schedule(){clearTimeout(timer);timer=setTimeout(loadAndRender,120)}
  new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true});window.addEventListener('hashchange',schedule);window.addEventListener('load',schedule);
})();

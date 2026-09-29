// Iriarte ERP V2 · fases de facturación flexibles por presupuesto/proyecto
(function(){
  'use strict';
  const db=()=>window.__iriarteDb;
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const num=v=>Number(String(v??0).replace(',','.'))||0;
  const money=v=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v||0));
  let timer,renderToken=0;

  function budgetsForProject(pid){return (window.APP?.data?.presupuestos||[]).filter(x=>String(x.proyecto_id||'')===String(pid))}
  function activeProject(){return window.APP?.sel?.project||null}
  function activeFullInvoice(budgetId){return (window.APP?.data?.facturas||[]).find(x=>String(x.presupuesto_id||'')===String(budgetId)&&!x.presupuesto_fase_id&&String(x.estado||'').toLowerCase()!=='anulada')||null}
  function openInvoice(id,pid){if(pid)window.APP.sel.project=pid;localStorage.setItem('iriarte_open_invoice',id);if(window.iriarteRoute)window.iriarteRoute('facturas');else location.hash='#facturas'}

  function modal(title,body,onSave){
    const root=$('#modal-root');
    root.innerHTML=`<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h2>${esc(title)}</h2><div class="grow"></div><button class="btn" type="button" data-phase-close>Cerrar</button></div><form id="phase-form"><div class="modal-body">${body}<div id="phase-error"></div></div><div class="modal-foot"><button class="btn" type="button" data-phase-close>Cancelar</button><button class="btn primary" type="submit">Guardar</button></div></form></div></div>`;
    const close=()=>root.innerHTML='';root.querySelectorAll('[data-phase-close]').forEach(b=>b.onclick=close);
    $('#phase-form').onsubmit=async e=>{e.preventDefault();e.submitter.disabled=true;try{await onSave(Object.fromEntries(new FormData(e.currentTarget).entries()));close();if(window.reloadIriarte)await window.reloadIriarte();else location.reload()}catch(err){$('#phase-error').innerHTML=`<div class="notice" style="background:#f6dfd7;color:#8f4d3c">${esc(err.message||err)}</div>`;e.submitter.disabled=false}};
  }

  async function phaseForm(pid,existing=null){
    const allBudgets=budgetsForProject(pid);if(!allBudgets.length){alert('Este proyecto todavía no tiene un presupuesto vinculado.');return}
    const locked=!!existing?.factura_id;
    const selectable=existing?allBudgets:allBudgets.filter(x=>!activeFullInvoice(x.id));
    if(!selectable.length){alert('Los presupuestos de este proyecto ya tienen factura completa activa. No se pueden crear fases sobre una factura completa.');return}
    const b=existing?allBudgets.find(x=>String(x.id)===String(existing.presupuesto_id))||allBudgets[0]:selectable[0];
    modal(existing?'Editar fase de facturación':'Nueva fase de facturación',`<div class="form-grid">
      ${locked?`<label>Presupuesto<input value="${esc(b?.name||b?.nombre||'Presupuesto')}" disabled></label>`:`<label>Presupuesto<select name="presupuesto_id">${selectable.map(x=>`<option value="${x.id}" ${String(x.id)===String(existing?.presupuesto_id||b.id)?'selected':''}>${esc(x.name||x.nombre||'Presupuesto')} · ${money(x.base)}</option>`).join('')}</select></label>`}
      <label>Orden<input name="orden" type="number" min="1" step="1" value="${existing?.orden||1}"></label>
      <label class="full">Nombre / hito<input name="nombre" required value="${esc(existing?.nombre||'')}" placeholder="Anticipo, entrega de proyecto, fin de obra…"></label>
      <label>Porcentaje %<input name="porcentaje" type="number" step="0.01" min="0" max="100" value="${existing?.porcentaje??''}" ${locked?'disabled':''}></label>
      <label>Importe €<input name="importe" type="number" step="0.01" min="0" value="${existing?.importe??''}" ${locked?'disabled':''}></label>
      <label>Fecha prevista<input name="fecha_prevista" type="date" value="${esc(existing?.fecha_prevista||'')}"></label>
      ${locked?`<label>Estado<input value="${esc(existing.estado||'pendiente')}" disabled></label>`:`<label>Estado<select name="estado"><option ${existing?.estado==='pendiente'?'selected':''}>pendiente</option><option ${existing?.estado==='anulada'?'selected':''}>anulada</option></select></label>`}
      <label class="full">Descripción<textarea name="descripcion">${esc(existing?.descripcion||'')}</textarea></label>
      <div class="notice full" data-phase-hint>${locked?'<b>Fase con factura vinculada.</b> El importe y porcentaje quedan bloqueados para no descuadrar el documento.':'Indica porcentaje o importe. Si escribes un importe, el porcentaje se recalcula sobre la base del presupuesto. La suma de fases activas nunca puede superar el 100% ni la base presupuestada.'}</div>
    </div>`,async f=>{
      const budgetId=locked?existing.presupuesto_id:f.presupuesto_id;
      const budget=allBudgets.find(x=>String(x.id)===String(budgetId));if(!budget)throw new Error('Presupuesto no encontrado.');
      if(activeFullInvoice(budgetId)&&!existing)throw new Error('Este presupuesto ya tiene una factura completa activa.');
      const base=num(budget.base);if(base<=0)throw new Error('Guarda primero un presupuesto con base superior a cero.');
      let pct=locked?num(existing.porcentaje):num(f.porcentaje),amount=locked?num(existing.importe):num(f.importe);
      if(!locked){
        if(amount>0)pct=amount/base*100;
        else if(pct>0)amount=base*pct/100;
        else throw new Error('Indica un porcentaje o importe mayor que cero.');
        if(amount<0||pct<0||pct>100.0001)throw new Error('La fase debe estar entre 0% y 100% y tener importe positivo.');
        const client=db(),{data:others,error}=await client.from('presupuesto_fases_facturacion').select('id,importe,porcentaje,estado').eq('presupuesto_id',budgetId).neq('estado','anulada');if(error)throw error;
        const active=(others||[]).filter(x=>!existing||String(x.id)!==String(existing.id));
        const otherAmount=active.reduce((a,x)=>a+(num(x.importe)>0?num(x.importe):base*num(x.porcentaje)/100),0);
        const otherPct=active.reduce((a,x)=>a+(num(x.porcentaje)>0?num(x.porcentaje):(base?num(x.importe)/base*100:0)),0);
        if(otherAmount+amount>base+0.01)throw new Error(`Las fases superarían la base del presupuesto: ${money(otherAmount+amount)} sobre ${money(base)}.`);
        if(otherPct+pct>100.01)throw new Error(`Las fases superarían el 100%: ${(otherPct+pct).toLocaleString('es-ES',{maximumFractionDigits:2})}%.`);
      }
      const payload={presupuesto_id:budgetId,orden:Math.max(1,Math.round(num(f.orden)||1)),nombre:f.nombre,descripcion:f.descripcion||null,porcentaje:pct||null,importe:amount||null,fecha_prevista:f.fecha_prevista||null,estado:locked?(existing.estado||'pendiente'):(f.estado||'pendiente')};
      const client=db();if(existing){const {error}=await client.from('presupuesto_fases_facturacion').update(payload).eq('id',existing.id);if(error)throw error}else{const {error}=await client.from('presupuesto_fases_facturacion').insert(payload);if(error)throw error}
    });
    const form=$('#phase-form');if(!form||locked)return;
    const budgetSel=form.elements.presupuesto_id,pctInput=form.elements.porcentaje,amountInput=form.elements.importe,hint=form.querySelector('[data-phase-hint]');
    const refreshHint=()=>{const budget=allBudgets.find(x=>String(x.id)===String(budgetSel.value)),base=num(budget?.base);if(!hint)return;hint.innerHTML=`<b>Base del presupuesto: ${money(base)}</b> Indica porcentaje o importe. Al escribir importe se recalcula su porcentaje equivalente. El total de fases activas no puede superar ${money(base)} ni el 100%.`};
    amountInput.oninput=()=>{const budget=allBudgets.find(x=>String(x.id)===String(budgetSel.value)),base=num(budget?.base),amount=num(amountInput.value);if(base>0&&amount>0)pctInput.value=(amount/base*100).toFixed(2)};
    pctInput.oninput=()=>{const budget=allBudgets.find(x=>String(x.id)===String(budgetSel.value)),base=num(budget?.base),pct=num(pctInput.value);if(base>0&&pct>0&&!amountInput.matches(':focus'))amountInput.value=(base*pct/100).toFixed(2)};
    budgetSel.onchange=()=>{pctInput.value='';amountInput.value='';refreshHint()};refreshHint();
  }

  async function makeInvoice(phase){
    const client=db();if(!client)return;
    if(phase.factura_id){openInvoice(phase.factura_id,activeProject());return}
    const full=activeFullInvoice(phase.presupuesto_id);if(full){alert('Este presupuesto ya tiene una factura completa activa. No se puede facturar una fase adicional.');openInvoice(full.id,full.proyecto_id||activeProject());return}
    try{
      const {data,error}=await client.rpc('crear_factura_desde_fase_v2',{p_fase_id:phase.id});if(error)throw error;
      const invoiceId=data?.invoice_id;if(!invoiceId)throw new Error('La base de datos no devolvió la factura creada.');
      openInvoice(invoiceId,data?.project_id||activeProject());
    }catch(err){alert('No se pudo crear la factura de la fase:\n'+(err.message||err))}
  }

  async function loadAndRender(){
    if(window.APP?.route!=='proyectos')return;const pid=activeProject(),detail=$('#app-view .card.detail');if(!pid||!detail||$('#billing-phases-v2'))return;
    const budgets=budgetsForProject(pid);if(!budgets.length)return;
    const my=++renderToken,ids=budgets.map(x=>x.id),client=db();if(!client)return;
    const {data,error}=await client.from('presupuesto_fases_facturacion').select('*').in('presupuesto_id',ids).order('orden',{ascending:true});if(error||my!==renderToken||window.APP?.route!=='proyectos'||String(activeProject())!==String(pid))return;
    const phases=data||[],active=phases.filter(x=>x.estado!=='anulada'),planned=active.reduce((a,x)=>a+num(x.importe),0),pct=active.reduce((a,x)=>a+num(x.porcentaje),0);
    const card=document.createElement('section');card.id='billing-phases-v2';card.className='card panel';card.style.marginTop='14px';
    card.innerHTML=`<div class="page-head" style="margin-bottom:8px"><div><h3 style="margin:0">Fases de facturación</h3><small style="color:var(--muted)">Planifica anticipos, hitos o entregas sin duplicar la factura completa del presupuesto.</small></div><div class="grow"></div><button class="btn primary" data-phase-new>+ Fase</button></div>${phases.length?`<div class="table-wrap"><table class="table"><tr><th>Orden</th><th>Presupuesto</th><th>Hito</th><th>%</th><th>Importe</th><th>Prevista</th><th>Estado</th><th></th></tr>${phases.map(x=>{const b=budgets.find(y=>String(y.id)===String(x.presupuesto_id)),full=activeFullInvoice(x.presupuesto_id),blocked=!!full&&!x.factura_id;return `<tr><td>${x.orden||''}</td><td>${esc(b?.name||b?.nombre||'Presupuesto')}</td><td><b>${esc(x.nombre||'')}</b><br><small>${esc(x.descripcion||'')}</small></td><td>${num(x.porcentaje).toLocaleString('es-ES',{maximumFractionDigits:2})}%</td><td>${money(x.importe)}</td><td>${esc(x.fecha_prevista||'')}</td><td><span class="badge ${x.estado==='cobrada'?'good':x.estado==='anulada'?'bad':'warn'}">${esc(x.factura_id&&x.estado==='pendiente'?'pendiente · factura borrador':(x.estado||'pendiente'))}</span></td><td><div class="toolbar"><button class="btn" data-phase-edit="${x.id}">Editar</button>${x.estado!=='anulada'?`<button class="btn ${x.factura_id?'':'primary'}" data-phase-invoice="${x.id}" ${blocked?'disabled title="Existe una factura completa activa"':''}>${x.factura_id?'Abrir factura':blocked?'Factura completa activa':'Crear factura'}</button>`:''}</div></td></tr>`}).join('')}<tr><td></td><td></td><td><b>Total planificado activo</b></td><td><b>${pct.toLocaleString('es-ES',{maximumFractionDigits:2})}%</b></td><td><b>${money(planned)}</b></td><td></td><td></td><td></td></tr></table></div>`:'<div class="empty">Sin fases. Puedes crear anticipo, hitos, mensualidades o entrega final.</div>'}`;
    detail.appendChild(card);
    card.querySelector('[data-phase-new]').onclick=()=>phaseForm(pid);
    card.querySelectorAll('[data-phase-edit]').forEach(b=>b.onclick=()=>phaseForm(pid,phases.find(x=>String(x.id)===String(b.dataset.phaseEdit))));
    card.querySelectorAll('[data-phase-invoice]').forEach(b=>b.onclick=()=>{if(b.disabled)return;const ph=phases.find(x=>String(x.id)===String(b.dataset.phaseInvoice));makeInvoice(ph)});
  }

  function schedule(){clearTimeout(timer);timer=setTimeout(loadAndRender,120)}
  new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true});window.addEventListener('hashchange',schedule);window.addEventListener('load',schedule);document.addEventListener('iriarte:route',schedule);
})();

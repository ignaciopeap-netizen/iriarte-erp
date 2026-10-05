// Iriarte ERP V2 · Banco: tesorería, movimientos y clasificación/conciliación
(function(){
  'use strict';
  const db=()=>window.__iriarteDb;
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[m]));
  const num=v=>Number(String(v??0).replace(',','.'))||0;
  const money=v=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(num(v));
  const pName=id=>(window.APP?.data?.proyectos||[]).find(p=>String(p.id)===String(id))?.nombre||'—';
  let timer;
  function signed(x){const amount=Math.abs(num(x.total??x.importe));return ['pago','gasto'].includes(String(x.tipo||'').toLowerCase())?-amount:amount}
  function kpis(rows){const incoming=rows.reduce((a,x)=>a+Math.max(0,signed(x)),0),outgoing=rows.reduce((a,x)=>a+Math.max(0,-signed(x)),0),pending=rows.filter(x=>!x.conciliado).length;return {incoming,outgoing,balance:incoming-outgoing,pending}}
  function state(x){
    if(x.origen_importacion&&x.conciliado){
      if(x.categoria==='no_estudio')return['N · no estudio','warn'];
      if(x.categoria==='general_estudio')return['general estudio','good'];
      if(x.categoria==='coste_personal')return['coste personal','good'];
      if(['gasto_directo','movimiento_proyecto'].includes(x.categoria))return['clasificado','good'];
      return['conciliado','good'];
    }
    if(x.origen_importacion)return['pendiente','warn'];
    if(x.cobro_id||x.pago_id)return['registrado ERP','good'];
    return x.conciliado?['conciliado','good']:['pendiente','warn'];
  }
  function action(x){
    if(!x.conciliado){const classify=x.origen_importacion?`<button class="btn" type="button" data-bank-classify="${esc(x.id)}">Clasificar</button>`:'';return `<button class="btn primary" type="button" data-wf-reconcile="${esc(x.id)}">Conciliar</button>${classify}`}
    if(x.origen_importacion)return `<button class="btn" type="button" data-bank-unreconcile="${esc(x.id)}">Desconciliar / reabrir</button>`;
    return''
  }
  async function unreconcile(id){
    const client=db(),m=(window.APP?.data?.movs||[]).find(x=>String(x.id)===String(id));if(!client||!m)return;
    if(!m.origen_importacion){alert('Este movimiento no procede de una importación bancaria. Corrige el cobro o pago desde su documento de origen.');return}
    const materialized=m.cobro_id?'cobro':m.pago_id?'pago':null;
    const msg=materialized?`¿Desconciliar este movimiento? Se eliminará el ${materialized} creado por la conciliación, se recalculará el estado del documento y el movimiento bancario volverá a quedar pendiente.`:'¿Reabrir este movimiento? Volverá a quedar pendiente, conservando su categoría/proyecto actuales hasta que lo reclasifiques.';
    if(!confirm(msg))return;
    const {error}=await client.rpc('desconciliar_movimiento_v2',{p_movimiento_id:id});if(error){alert('No se pudo desconciliar:\n'+error.message);return}
    if(window.reloadIriarte)await window.reloadIriarte();else location.reload();
  }
  function projectOptions(value){return `<option value="">— Selecciona proyecto —</option>`+(window.APP?.data?.proyectos||[]).map(p=>`<option value="${esc(p.id)}" ${String(p.id)===String(value)?'selected':''}>${esc(p.codigo||'')} · ${esc(p.nombre)}</option>`).join('')}
  function classify(id){
    const m=(window.APP?.data?.movs||[]).find(x=>String(x.id)===String(id)),root=document.querySelector('#modal-root');if(!m||!root)return;
    root.innerHTML=`<div class="modal-backdrop"><div class="modal"><div class="modal-head"><div><h2>Clasificar movimiento bancario</h2><small style="color:var(--muted)">${esc(m.fecha||'')} · ${esc(m.concepto||'')} · ${money(signed(m))}</small></div><div class="grow"></div><button class="btn" data-bc-close>Cerrar</button></div><form id="bank-class-form"><div class="modal-body"><div class="form-grid"><label>Destino<select name="clasificacion" id="bank-class-kind"><option value="proyecto">Proyecto · movimiento directo</option><option value="general">Estudio / general</option><option value="coste_personal">Coste de personal</option><option value="no_estudio">N · No estudio / personal</option></select></label><label>Proyecto<select name="proyecto_id" id="bank-class-project">${projectOptions(m.proyecto_id)}</select></label><label class="full">Subcategoría / nota corta<input name="subcategoria" placeholder="Ej. combustible, autónomos, nómina…"></label></div><div class="notice"><b>No crea otro movimiento.</b> Solo clasifica esta línea bancaria. “N · No estudio” queda registrada para cuadrar el extracto, pero no entra en rentabilidad del estudio ni de proyectos.</div><div id="bank-class-error"></div></div><div class="modal-foot"><button class="btn" type="button" data-bc-close>Cancelar</button><button class="btn primary" type="submit">Guardar clasificación</button></div></form></div></div>`;
    const close=()=>root.innerHTML='';root.querySelectorAll('[data-bc-close]').forEach(b=>b.onclick=close);const kind=root.querySelector('#bank-class-kind'),pr=root.querySelector('#bank-class-project');const sync=()=>{pr.disabled=kind.value!=='proyecto';if(kind.value!=='proyecto')pr.value=''};kind.onchange=sync;sync();
    root.querySelector('#bank-class-form').onsubmit=async e=>{e.preventDefault();const submit=e.submitter;submit.disabled=true;try{const f=Object.fromEntries(new FormData(e.currentTarget).entries());if(f.clasificacion==='proyecto'&&!f.proyecto_id)throw new Error('Selecciona un proyecto.');const {error}=await db().rpc('clasificar_movimiento_bancario_v2',{p_movimiento_id:m.id,p_clasificacion:f.clasificacion,p_proyecto_id:f.proyecto_id||null,p_subcategoria:f.subcategoria||null});if(error)throw error;close();if(window.reloadIriarte)await window.reloadIriarte();else location.reload()}catch(err){root.querySelector('#bank-class-error').innerHTML=`<div class="notice" style="background:#f6dfd7;color:#8f4d3c">${esc(err.message||err)}</div>`;submit.disabled=false}}
  }
  function fix(){
    clearTimeout(timer);timer=setTimeout(()=>{
      if(window.APP?.route!=='finanzas')return;
      const view=document.querySelector('#app-view');if(!view)return;
      const top=view.querySelector(':scope > .page-head h1, h1');if(top)top.textContent='Banco';
      view.querySelector('[data-draft-finance-note]')?.remove();
      const rows=window.APP?.data?.movs||[],m=kpis(rows),grid=view.querySelector(':scope > .grid.cols-4');
      if(grid&&!grid.dataset.bankKpis){grid.dataset.bankKpis='1';grid.innerHTML=`<div class="card kpi"><small>Entradas bancarias</small><strong class="positive">${money(m.incoming)}</strong></div><div class="card kpi"><small>Salidas bancarias</small><strong class="negative">${money(m.outgoing)}</strong></div><div class="card kpi"><small>Saldo de movimientos</small><strong class="${m.balance<0?'negative':'positive'}">${money(m.balance)}</strong></div><div class="card kpi"><small>Pendientes de revisar</small><strong class="${m.pending?'negative':'positive'}">${m.pending}</strong></div>`}
      const headings=[...view.querySelectorAll('h3')];
      const h=headings.find(x=>['Movimientos bancarios','Movimientos financieros'].includes(x.textContent.trim()));if(!h)return;
      const panel=h.closest('.card');if(!panel||panel.dataset.canonical==='1')return;panel.dataset.canonical='1';
      const pending=rows.filter(x=>!x.conciliado).length,linked=rows.filter(x=>x.proyecto_id).length,reconciled=rows.length-pending;
      panel.innerHTML=`<div class="page-head" style="margin-bottom:8px"><div><h3>Movimientos bancarios</h3><small style="color:var(--muted)">${reconciled} conciliados/clasificados · ${pending} pendientes de revisar</small></div><div class="grow"></div></div>${rows.length?`<div class="table-wrap"><table class="table"><tr><th>Fecha</th><th>Fecha valor</th><th>Concepto</th><th>Categoría</th><th>Subcategoría</th><th>Proyecto</th><th>Cuenta</th><th>Estado</th><th style="text-align:right">Importe</th><th></th></tr>${rows.map(x=>{const value=signed(x),st=state(x);return `<tr><td>${esc(x.fecha||'')}</td><td>${esc(x.fecha_valor||'')}</td><td><b>${esc(x.concepto||'')}</b><br><small>${esc(x.referencia||'')}</small></td><td>${esc(x.categoria||'')}</td><td>${esc(x.subcategoria||'')}</td><td>${esc(pName(x.proyecto_id))}</td><td>${esc(x.cuenta||'')}</td><td><span class="badge ${st[1]}">${st[0]}</span></td><td style="text-align:right" class="${value>=0?'positive':'negative'}"><b>${money(value)}</b></td><td><div class="toolbar">${action(x)}</div></td></tr>`}).join('')}</table></div>`:'<div class="empty">Sin movimientos bancarios importados.</div>'}<div style="margin-top:8px;color:var(--muted);font-size:11px">${linked} movimientos están vinculados a proyecto. Conciliar se usa para facturas/compras; Clasificar resuelve movimientos directos, generales, de personal o “N · no estudio”.</div>`;
    },65);
  }
  new MutationObserver(fix).observe(document.body,{subtree:true,childList:true});window.addEventListener('hashchange',fix);window.addEventListener('load',fix);
  document.addEventListener('click',e=>{const u=e.target.closest('[data-bank-unreconcile]');if(u){e.preventDefault();e.stopImmediatePropagation();unreconcile(u.dataset.bankUnreconcile);return}const c=e.target.closest('[data-bank-classify]');if(c){e.preventDefault();e.stopImmediatePropagation();classify(c.dataset.bankClassify)}},true);
})();

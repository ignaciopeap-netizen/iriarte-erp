// Iriarte ERP V2 · Banco: tesorería, movimientos y conciliación
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
  function state(x){if(x.origen_importacion)return x.conciliado?['conciliado','good']:['pendiente','warn'];if(x.cobro_id||x.pago_id)return['registrado ERP','good'];return x.conciliado?['conciliado','good']:['pendiente','warn']}
  function action(x){if(!x.conciliado)return `<button class="btn primary" type="button" data-wf-reconcile="${esc(x.id)}">Conciliar</button>`;if(x.origen_importacion)return `<button class="btn" type="button" data-bank-unreconcile="${esc(x.id)}">Desconciliar</button>`;return''}
  async function unreconcile(id){
    const client=db(),m=(window.APP?.data?.movs||[]).find(x=>String(x.id)===String(id));if(!client||!m)return;
    if(!m.origen_importacion){alert('Este movimiento no procede de una importación bancaria. Corrige el cobro o pago desde su documento de origen.');return}
    const materialized=m.cobro_id?'cobro':m.pago_id?'pago':null;
    const msg=materialized?`¿Desconciliar este movimiento? Se eliminará el ${materialized} creado por la conciliación, se recalculará el estado del documento y el movimiento bancario volverá a quedar pendiente.`:'¿Desconciliar este movimiento? Volverá a quedar pendiente y conservará su clasificación de proyecto/categoría para que puedas revisarla.';
    if(!confirm(msg))return;
    const {error}=await client.rpc('desconciliar_movimiento_v2',{p_movimiento_id:id});if(error){alert('No se pudo desconciliar:\n'+error.message);return}
    if(window.reloadIriarte)await window.reloadIriarte();else location.reload();
  }
  function fix(){
    clearTimeout(timer);timer=setTimeout(()=>{
      if(window.APP?.route!=='finanzas')return;
      const view=document.querySelector('#app-view');if(!view)return;
      const top=view.querySelector(':scope > .page-head h1, h1');if(top)top.textContent='Banco';
      view.querySelector('[data-draft-finance-note]')?.remove();
      const rows=window.APP?.data?.movs||[],m=kpis(rows),grid=view.querySelector(':scope > .grid.cols-4');
      if(grid&&!grid.dataset.bankKpis){grid.dataset.bankKpis='1';grid.innerHTML=`<div class="card kpi"><small>Entradas bancarias</small><strong class="positive">${money(m.incoming)}</strong></div><div class="card kpi"><small>Salidas bancarias</small><strong class="negative">${money(m.outgoing)}</strong></div><div class="card kpi"><small>Saldo de movimientos</small><strong class="${m.balance<0?'negative':'positive'}">${money(m.balance)}</strong></div><div class="card kpi"><small>Pendientes de conciliar</small><strong class="${m.pending?'negative':'positive'}">${m.pending}</strong></div>`}
      const headings=[...view.querySelectorAll('h3')];
      const h=headings.find(x=>['Movimientos bancarios','Movimientos financieros'].includes(x.textContent.trim()));if(!h)return;
      const panel=h.closest('.card');if(!panel||panel.dataset.canonical==='1')return;panel.dataset.canonical='1';
      const pending=rows.filter(x=>!x.conciliado).length,linked=rows.filter(x=>x.proyecto_id).length,reconciled=rows.length-pending;
      panel.innerHTML=`<div class="page-head" style="margin-bottom:8px"><div><h3>Movimientos bancarios</h3><small style="color:var(--muted)">${reconciled} conciliados/registrados · ${pending} pendientes</small></div><div class="grow"></div></div>${rows.length?`<div class="table-wrap"><table class="table"><tr><th>Fecha</th><th>Fecha valor</th><th>Concepto</th><th>Categoría</th><th>Subcategoría</th><th>Proyecto</th><th>Cuenta</th><th>Estado</th><th style="text-align:right">Importe</th><th></th></tr>${rows.map(x=>{const value=signed(x),st=state(x);return `<tr><td>${esc(x.fecha||'')}</td><td>${esc(x.fecha_valor||'')}</td><td><b>${esc(x.concepto||'')}</b><br><small>${esc(x.referencia||'')}</small></td><td>${esc(x.categoria||'')}</td><td>${esc(x.subcategoria||'')}</td><td>${esc(pName(x.proyecto_id))}</td><td>${esc(x.cuenta||'')}</td><td><span class="badge ${st[1]}">${st[0]}</span></td><td style="text-align:right" class="${value>=0?'positive':'negative'}"><b>${money(value)}</b></td><td><div class="toolbar">${action(x)}</div></td></tr>`}).join('')}</table></div>`:'<div class="empty">Sin movimientos bancarios importados.</div>'}<div style="margin-top:8px;color:var(--muted);font-size:11px">${linked} movimientos están vinculados a proyecto. “Registrado ERP” identifica movimientos creados automáticamente desde un cobro o pago manual; se corrigen desde su documento de origen.</div>`;
    },65);
  }
  new MutationObserver(fix).observe(document.body,{subtree:true,childList:true});window.addEventListener('hashchange',fix);window.addEventListener('load',fix);
  document.addEventListener('click',e=>{const b=e.target.closest('[data-bank-unreconcile]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();unreconcile(b.dataset.bankUnreconcile)},true);
})();

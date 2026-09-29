// Iriarte ERP V2 · Banco: tesorería, movimientos y conciliación
(function(){
  'use strict';
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const num=v=>Number(String(v??0).replace(',','.'))||0;
  const money=v=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(num(v));
  const pName=id=>(window.APP?.data?.proyectos||[]).find(p=>String(p.id)===String(id))?.nombre||'—';
  let timer;
  function signed(x){const amount=Math.abs(num(x.total??x.importe));return ['pago','gasto'].includes(String(x.tipo||'').toLowerCase())?-amount:amount}
  function kpis(rows){const incoming=rows.reduce((a,x)=>a+Math.max(0,signed(x)),0),outgoing=rows.reduce((a,x)=>a+Math.max(0,-signed(x)),0),pending=rows.filter(x=>!x.conciliado).length;return {incoming,outgoing,balance:incoming-outgoing,pending}}
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
      panel.innerHTML=`<div class="page-head" style="margin-bottom:8px"><div><h3>Movimientos bancarios</h3><small style="color:var(--muted)">${reconciled} conciliados · ${pending} pendientes</small></div><div class="grow"></div></div>${rows.length?`<div class="table-wrap"><table class="table"><tr><th>Fecha</th><th>Fecha valor</th><th>Concepto</th><th>Categoría</th><th>Subcategoría</th><th>Proyecto</th><th>Cuenta</th><th>Estado</th><th style="text-align:right">Importe</th></tr>${rows.map(x=>{const value=signed(x);return `<tr><td>${esc(x.fecha||'')}</td><td>${esc(x.fecha_valor||'')}</td><td><b>${esc(x.concepto||'')}</b><br><small>${esc(x.referencia||'')}</small></td><td>${esc(x.categoria||'')}</td><td>${esc(x.subcategoria||'')}</td><td>${esc(pName(x.proyecto_id))}</td><td>${esc(x.cuenta||'')}</td><td><span class="badge ${x.conciliado?'good':'warn'}">${x.conciliado?'conciliado':'pendiente'}</span></td><td style="text-align:right" class="${value>=0?'positive':'negative'}"><b>${money(value)}</b></td></tr>`}).join('')}</table></div>`:'<div class="empty">Sin movimientos bancarios importados.</div>'}<div style="margin-top:8px;color:var(--muted);font-size:11px">${linked} movimientos están vinculados a proyecto. La rentabilidad y los informes se consultan en la pestaña Finanzas.</div>`;
    },65);
  }
  new MutationObserver(fix).observe(document.body,{subtree:true,childList:true});window.addEventListener('hashchange',fix);window.addEventListener('load',fix);
})();

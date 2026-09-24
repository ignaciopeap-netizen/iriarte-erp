// Iriarte ERP V2 · tabla financiera detallada sobre movimientos_financieros
(function(){
  'use strict';
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const money=v=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v||0));
  const pName=id=>(window.APP?.data?.proyectos||[]).find(p=>String(p.id)===String(id))?.nombre||'—';
  let timer;
  function fix(){
    clearTimeout(timer);timer=setTimeout(()=>{
      if(window.APP?.route!=='finanzas')return;
      const rows=window.APP?.data?.movs||[];
      const headings=[...document.querySelectorAll('#app-view h3')];
      const h=headings.find(x=>['Movimientos bancarios','Movimientos financieros'].includes(x.textContent.trim()));if(!h)return;
      const panel=h.closest('.card');if(!panel||panel.dataset.canonical==='1')return;panel.dataset.canonical='1';
      const pending=rows.filter(x=>!x.conciliado).length,linked=rows.filter(x=>x.proyecto_id).length;
      panel.innerHTML=`<div class="page-head" style="margin-bottom:8px"><h3>Movimientos financieros</h3><div class="grow"></div><small style="color:var(--muted)">${rows.length} movimientos · ${pending} pendientes de conciliar</small></div>${rows.length?`<div class="table-wrap"><table class="table"><tr><th>Fecha</th><th>Fecha valor</th><th>Concepto</th><th>Categoría</th><th>Subcategoría</th><th>Proyecto</th><th>Cuenta</th><th>Estado</th><th style="text-align:right">Importe</th></tr>${rows.map(x=>{const sign=(x.tipo==='pago'||x.tipo==='gasto')?-1:1;return `<tr><td>${esc(x.fecha||'')}</td><td>${esc(x.fecha_valor||'')}</td><td><b>${esc(x.concepto||'')}</b><br><small>${esc(x.referencia||'')}</small></td><td>${esc(x.categoria||'')}</td><td>${esc(x.subcategoria||'')}</td><td>${esc(pName(x.proyecto_id))}</td><td>${esc(x.cuenta||'')}</td><td><span class="badge ${x.conciliado?'good':'warn'}">${x.conciliado?'conciliado':'pendiente'}</span></td><td style="text-align:right" class="${sign>0?'positive':'negative'}"><b>${money(sign*Math.abs(Number(x.total||0)))}</b></td></tr>`}).join('')}</table></div>`:'<div class="empty">Sin movimientos bancarios importados.</div>'}<div style="margin-top:8px;color:var(--muted);font-size:11px">${linked} movimientos están vinculados a proyecto. Los restantes no entran en la rentabilidad de un proyecto hasta que se concilien.</div>`;
    },60);
  }
  new MutationObserver(fix).observe(document.body,{subtree:true,childList:true});window.addEventListener('hashchange',fix);window.addEventListener('load',fix);
})();

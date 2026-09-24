// Iriarte ERP V2 · cobros, pagos y conciliación bancaria
(function(){
  'use strict';
  const URL='https://kzmjeccivhkhtuokfkta.supabase.co';
  const KEY='sb_publishable_YBf9vRaOlVQBHM4ionZLPw_TIIxZY9G';
  const db=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const $=s=>document.querySelector(s), money=v=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v||0));
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const num=v=>Number(String(v??0).replace(',','.'))||0;
  const today=()=>new Date().toISOString().slice(0,10);
  let timer;

  function modal(title,html,onSave){
    const root=$('#modal-root');
    root.innerHTML=`<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h2>${esc(title)}</h2><div class="grow"></div><button class="btn" type="button" data-wf-close>Cerrar</button></div><form id="wf-form"><div class="modal-body">${html}<div id="wf-error"></div></div><div class="modal-foot"><button class="btn" type="button" data-wf-close>Cancelar</button><button class="btn primary" type="submit">Guardar</button></div></form></div></div>`;
    const close=()=>root.innerHTML='';
    root.querySelectorAll('[data-wf-close]').forEach(b=>b.onclick=close);
    $('#wf-form').onsubmit=async e=>{e.preventDefault();e.submitter.disabled=true;try{await onSave(Object.fromEntries(new FormData(e.currentTarget).entries()));close();location.reload()}catch(err){$('#wf-error').innerHTML=`<div class="notice" style="background:#f6dfd7;color:#8f4d3c">${esc(err.message||err)}</div>`;e.submitter.disabled=false}};
  }

  async function snapshot(){
    const S=window.APP?.data||{};
    return S;
  }
  const pName=id=>(window.APP?.data?.proyectos||[]).find(x=>String(x.id)===String(id))?.nombre||'—';
  const cName=id=>(window.APP?.data?.clientes||[]).find(x=>String(x.id)===String(id))?.nombre||'—';
  const sName=id=>(window.APP?.data?.proveedores||[]).find(x=>String(x.id)===String(id))?.nombre||'—';

  function paidInvoice(fid){return (window.APP?.data?.cobros||[]).filter(x=>String(x.factura_id)===String(fid)).reduce((a,x)=>a+num(x.importe),0)}
  function paidPurchase(cid){return (window.APP?.data?.pagos||[]).filter(x=>String(x.compra_id)===String(cid)).reduce((a,x)=>a+num(x.importe),0)}

  function collect(fid){
    const x=(window.APP?.data?.facturas||[]).find(i=>String(i.id)===String(fid));if(!x)return;
    const pending=Math.max(0,num(x.total)-paidInvoice(fid));
    modal('Registrar cobro',`<div class="form-grid"><label>Fecha<input name="fecha" type="date" value="${today()}" required></label><label>Importe<input name="importe" type="number" step="0.01" value="${pending.toFixed(2)}" required></label><label>Cuenta<input name="cuenta" placeholder="Banco / caja"></label><label>Referencia<input name="referencia"></label><label class="full">Notas<textarea name="notas"></textarea></label></div>`,async f=>{
      const {error}=await db.from('cobros').insert({factura_id:fid,fecha:f.fecha,importe:num(f.importe),cuenta:f.cuenta||null,referencia:f.referencia||null,notas:f.notas||null});if(error)throw error;
    });
  }

  function pay(cid){
    const x=(window.APP?.data?.compras||[]).find(i=>String(i.id)===String(cid));if(!x)return;
    const pending=Math.max(0,num(x.total)-paidPurchase(cid));
    modal('Registrar pago',`<div class="form-grid"><label>Fecha<input name="fecha" type="date" value="${today()}" required></label><label>Importe<input name="importe" type="number" step="0.01" value="${pending.toFixed(2)}" required></label><label>Cuenta<input name="cuenta" placeholder="Banco / caja"></label><label>Referencia<input name="referencia"></label><label class="full">Notas<textarea name="notas"></textarea></label></div>`,async f=>{
      const {error}=await db.from('pagos').insert({compra_id:cid,fecha:f.fecha,importe:num(f.importe),cuenta:f.cuenta||null,referencia:f.referencia||null,notas:f.notas||null});if(error)throw error;
    });
  }

  function reconcile(mid){
    const S=window.APP?.data||{},m=(S.movs||[]).find(x=>String(x.id)===String(mid));if(!m)return;
    modal('Conciliar movimiento bancario',`<div class="form-grid">
      <label class="full">Concepto<input name="concepto" value="${esc(m.concepto||'')}"></label>
      <label>Categoría<input name="categoria" value="${esc(m.categoria||'')}"></label>
      <label>Subcategoría<input name="subcategoria" value="${esc(m.subcategoria||'')}"></label>
      <label>Proyecto<select name="proyecto_id"><option value="">—</option>${(S.proyectos||[]).map(x=>`<option value="${x.id}" ${String(x.id)===String(m.proyecto_id)?'selected':''}>${esc(x.nombre)}</option>`).join('')}</select></label>
      <label>Cliente<select name="cliente_id"><option value="">—</option>${(S.clientes||[]).map(x=>`<option value="${x.id}" ${String(x.id)===String(m.cliente_id)?'selected':''}>${esc(x.nombre)}</option>`).join('')}</select></label>
      <label>Proveedor<select name="proveedor_id"><option value="">—</option>${(S.proveedores||[]).map(x=>`<option value="${x.id}" ${String(x.id)===String(m.proveedor_id)?'selected':''}>${esc(x.nombre)}</option>`).join('')}</select></label>
      <label>Factura<select name="factura_id"><option value="">—</option>${(S.facturas||[]).map(x=>`<option value="${x.id}" ${String(x.id)===String(m.factura_id)?'selected':''}>${esc(x.numero||'Borrador')} · ${money(x.total)}</option>`).join('')}</select></label>
      <label>Compra<select name="compra_id"><option value="">—</option>${(S.compras||[]).map(x=>`<option value="${x.id}" ${String(x.id)===String(m.compra_id)?'selected':''}>${esc(x.numero_factura||x.concepto||'Compra')} · ${money(x.total)}</option>`).join('')}</select></label>
      <label class="full">Notas<textarea name="notas">${esc(m.notas||'')}</textarea></label>
    </div>`,async f=>{
      const payload={concepto:f.concepto||m.concepto,categoria:f.categoria||null,subcategoria:f.subcategoria||null,proyecto_id:f.proyecto_id||null,cliente_id:f.cliente_id||null,proveedor_id:f.proveedor_id||null,factura_id:f.factura_id||null,compra_id:f.compra_id||null,conciliado:true,notas:f.notas||null};
      const {error}=await db.from('movimientos_financieros').update(payload).eq('id',mid);if(error)throw error;
    });
  }

  function editExpense(id){
    const x=(window.APP?.data?.gastos||[]).find(g=>String(g.id)===String(id));if(!x)return;
    modal('Editar gasto general',`<div class="form-grid"><label>Fecha<input name="fecha" type="date" value="${esc(x.fecha||today())}"></label><label>Categoría<input name="categoria" value="${esc(x.categoria||'')}"></label><label class="full">Concepto<input name="concepto" value="${esc(x.concepto||'')}" required></label><label>Base<input name="base" type="number" step="0.01" value="${num(x.base)}"></label><label>IVA %<input name="iva_pct" type="number" step="0.01" value="${num(x.iva_pct||21)}"></label><label>Pagado<select name="pagado"><option value="false" ${x.pagado?'':'selected'}>No</option><option value="true" ${x.pagado?'selected':''}>Sí</option></select></label><label>Cuenta<input name="cuenta" value="${esc(x.cuenta||'')}"></label><label class="full">Notas<textarea name="notas">${esc(x.notas||'')}</textarea></label></div>`,async f=>{
      const base=num(f.base),pct=num(f.iva_pct),iva=base*pct/100;
      const {error}=await db.from('gastos_generales').update({fecha:f.fecha,categoria:f.categoria,concepto:f.concepto,base,iva_pct:pct,iva_importe:iva,total:base+iva,pagado:f.pagado==='true',cuenta:f.cuenta||null,notas:f.notas||null}).eq('id',id);if(error)throw error;
    });
  }

  function enhanceInvoices(){
    if($('#wf-invoice-panel'))return;const view=$('#app-view');if(!view)return;
    const arr=(window.APP?.data?.facturas||[]).filter(x=>x.estado!=='anulada');
    const pending=arr.filter(x=>num(x.total)-paidInvoice(x.id)>0.009);
    const panel=document.createElement('section');panel.id='wf-invoice-panel';panel.className='card panel';panel.style.marginTop='14px';
    panel.innerHTML=`<h3>Cobros pendientes</h3>${pending.length?`<div class="table-wrap"><table class="table"><tr><th>Factura</th><th>Cliente</th><th>Proyecto</th><th>Total</th><th>Cobrado</th><th>Pendiente</th><th></th></tr>${pending.map(x=>{const p=paidInvoice(x.id);return `<tr><td><b>${esc(x.numero||'Borrador')}</b></td><td>${esc(cName(x.cliente_id))}</td><td>${esc(pName(x.proyecto_id))}</td><td>${money(x.total)}</td><td>${money(p)}</td><td><b>${money(num(x.total)-p)}</b></td><td><button class="btn primary" data-wf-collect="${x.id}">Registrar cobro</button></td></tr>`}).join('')}</table></div>`:'<div class="empty">No hay facturas pendientes de cobro.</div>'}`;
    view.appendChild(panel);
  }

  function enhancePurchases(){
    if($('#wf-purchase-panel'))return;const view=$('#app-view');if(!view)return;
    const arr=(window.APP?.data?.compras||[]).filter(x=>x.estado!=='anulada'),pending=arr.filter(x=>num(x.total)-paidPurchase(x.id)>0.009);
    const panel=document.createElement('section');panel.id='wf-purchase-panel';panel.className='card panel';panel.style.marginTop='14px';
    panel.innerHTML=`<h3>Pagos pendientes</h3>${pending.length?`<div class="table-wrap"><table class="table"><tr><th>Compra</th><th>Proveedor</th><th>Proyecto</th><th>Total</th><th>Pagado</th><th>Pendiente</th><th></th></tr>${pending.map(x=>{const p=paidPurchase(x.id);return `<tr><td><b>${esc(x.numero_factura||x.referencia||'Compra')}</b></td><td>${esc(sName(x.proveedor_id))}</td><td>${esc(pName(x.proyecto_id))}</td><td>${money(x.total)}</td><td>${money(p)}</td><td><b>${money(num(x.total)-p)}</b></td><td><button class="btn primary" data-wf-pay="${x.id}">Registrar pago</button></td></tr>`}).join('')}</table></div>`:'<div class="empty">No hay compras pendientes de pago.</div>'}`;
    view.appendChild(panel);
  }

  function enhanceFinance(){
    if($('#wf-reconcile-panel'))return;const view=$('#app-view');if(!view)return;
    const rows=(window.APP?.data?.movs||[]).filter(x=>!x.conciliado);
    const panel=document.createElement('section');panel.id='wf-reconcile-panel';panel.className='card panel';panel.style.marginTop='14px';
    panel.innerHTML=`<h3>Conciliación bancaria pendiente</h3><p style="color:var(--muted);font-size:12px">Vincula cada movimiento a proyecto, cliente/proveedor y, cuando proceda, a su factura o compra.</p>${rows.length?`<div class="table-wrap"><table class="table"><tr><th>Fecha</th><th>Concepto</th><th>Importe</th><th>Cuenta</th><th></th></tr>${rows.map(x=>`<tr><td>${esc(x.fecha||'')}</td><td><b>${esc(x.concepto||'')}</b></td><td>${money((x.tipo==='pago'||x.tipo==='gasto')?-Math.abs(num(x.importe)):num(x.importe))}</td><td>${esc(x.cuenta||'')}</td><td><button class="btn primary" data-wf-reconcile="${x.id}">Conciliar</button></td></tr>`).join('')}</table></div>`:'<div class="empty">Todos los movimientos están conciliados.</div>'}`;
    view.appendChild(panel);
  }

  function enhanceExpenses(){
    if($('#wf-expense-panel'))return;const view=$('#app-view');if(!view)return;
    const rows=window.APP?.data?.gastos||[];const panel=document.createElement('section');panel.id='wf-expense-panel';panel.className='card panel';panel.style.marginTop='14px';
    panel.innerHTML=`<h3>Edición de gastos</h3>${rows.length?`<div class="table-wrap"><table class="table"><tr><th>Fecha</th><th>Categoría</th><th>Concepto</th><th>Base</th><th>Total</th><th>Pagado</th><th></th></tr>${rows.map(x=>`<tr><td>${esc(x.fecha||'')}</td><td>${esc(x.categoria||'')}</td><td>${esc(x.concepto||'')}</td><td>${money(x.base)}</td><td>${money(x.total)}</td><td>${x.pagado?'Sí':'No'}</td><td><button class="btn" data-wf-expense="${x.id}">Editar</button></td></tr>`).join('')}</table></div>`:'<div class="empty">Sin gastos generales.</div>'}`;
    view.appendChild(panel);
  }

  function enhance(){clearTimeout(timer);timer=setTimeout(()=>{const route=(location.hash||'#inicio').slice(1);if(route==='facturas')enhanceInvoices();if(route==='compras')enhancePurchases();if(route==='finanzas')enhanceFinance();if(route==='gastos')enhanceExpenses();},60)}
  new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});window.addEventListener('hashchange',enhance);window.addEventListener('load',enhance);
  document.addEventListener('click',e=>{let b=e.target.closest('[data-wf-collect],[data-wf-pay],[data-wf-reconcile],[data-wf-expense]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();if(b.dataset.wfCollect)collect(b.dataset.wfCollect);else if(b.dataset.wfPay)pay(b.dataset.wfPay);else if(b.dataset.wfReconcile)reconcile(b.dataset.wfReconcile);else if(b.dataset.wfExpense)editExpense(b.dataset.wfExpense)},true);
})();

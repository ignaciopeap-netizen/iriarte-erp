// Iriarte ERP V2 · ficha central de proyecto
(function(){
  'use strict';
  const $=s=>document.querySelector(s), money=v=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v||0));
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const num=v=>Number(v||0)||0;
  const issued=x=>!['borrador','anulada'].includes(String(x?.estado||'borrador').toLowerCase());
  const activePurchase=x=>String(x?.estado||'').toLowerCase()!=='anulada';
  const itemStyle='width:100%;text-align:left;border:0;background:transparent;color:inherit;font:inherit;cursor:pointer';
  let t;

  function projectData(){
    const S=window.APP;if(!S?.data)return null;
    const p=(S.data.proyectos||[]).find(x=>String(x.id)===String(S.sel?.project));if(!p)return null;
    const match=(arr,key='proyecto_id')=>(arr||[]).filter(x=>String(x[key]||x.project_id||'')===String(p.id));
    const allInvoices=match(S.data.facturas),invoices=allInvoices.filter(issued),draftInvoices=allInvoices.filter(x=>String(x.estado||'borrador').toLowerCase()==='borrador');
    const allPurchases=match(S.data.compras),purchases=allPurchases.filter(activePurchase),hours=match(S.data.horas),visits=match(S.data.visitas),tasks=match(S.data.tareas),incidents=match(S.data.incidencias),docs=match(S.data.docs),budgets=(S.data.presupuestos||[]).filter(x=>String(x.proyecto_id||x.project_id||'')===String(p.id));
    const invoiceIds=new Set(invoices.map(x=>String(x.id))),purchaseIds=new Set(purchases.map(x=>String(x.id)));
    const collections=(S.data.cobros||[]).filter(x=>invoiceIds.has(String(x.factura_id))),payments=(S.data.pagos||[]).filter(x=>purchaseIds.has(String(x.compra_id)));
    const baseInv=invoices.reduce((a,x)=>a+num(x.base),0),totalInv=invoices.reduce((a,x)=>a+num(x.total),0),basePur=purchases.reduce((a,x)=>a+num(x.base),0),totalPur=purchases.reduce((a,x)=>a+num(x.total),0),hourCost=hours.reduce((a,x)=>a+num(x.horas)*num(x.coste_hora),0),collected=collections.reduce((a,x)=>a+num(x.importe),0),paid=payments.reduce((a,x)=>a+num(x.importe),0),overheads=(S.data.gastos||[]).filter(x=>String(x.proyecto_id||'')===String(p.id)),overheadBase=overheads.reduce((a,x)=>a+num(x.base),0);
    return {S,p,allInvoices,invoices,draftInvoices,allPurchases,purchases,hours,visits,tasks,incidents,docs,budgets,collections,payments,overheads,baseInv,totalInv,basePur,totalPur,hourCost,collected,paid,overheadBase,margin:baseInv-basePur-hourCost};
  }

  function row(label,value,cls=''){return `<div class="info"><small>${esc(label)}</small><b class="${cls}">${esc(value)}</b></div>`}
  function record(type,id,title,small=''){return `<button type="button" class="master-item" style="${itemStyle}" data-project-record="${type}:${esc(id)}"><b>${title}</b>${small?`<small>${small}</small>`:''}</button>`}
  function section(title,items,render,emptyText){return `<div class="card panel"><h3>${esc(title)}</h3>${items.length?items.slice(0,12).map(render).join(''):`<div class="empty">${esc(emptyText)}</div>`}</div>`}
  function route(name){if(window.iriarteRoute)window.iriarteRoute(name);else location.hash='#'+name}
  function openRecord(type,id){if(window.iriarteOpenRecord)return window.iriarteOpenRecord(type,id);const r={project:'proyectos',invoice:'facturas',budget:'presupuestos',purchase:'compras',document:'documentos'}[type];if(!r)return;if(type==='project')window.APP.sel.project=id;else localStorage.setItem(`iriarte_open_${type}`,id);route(r)}

  function openBudget(d){
    if(!d.budgets.length){d.S.sel.project=d.p.id;route('presupuestos');return}
    if(d.budgets.length===1){openRecord('budget',d.budgets[0].id);return}
    const root=$('#modal-root');root.innerHTML=`<div class="modal-backdrop"><div class="modal" style="width:min(720px,94vw)"><div class="modal-head"><h2>Presupuestos · ${esc(d.p.nombre)}</h2><div class="grow"></div><button class="btn" data-ph-close>Cerrar</button></div><div class="modal-body">${d.budgets.map(x=>record('budget',x.id,esc(x.name||x.nombre||'Presupuesto'),`${esc(x.ref||x.numero||'')} · ${esc(x.status||x.estado||'')}`)).join('')}</div></div></div>`;root.querySelector('[data-ph-close]').onclick=()=>root.innerHTML='';
  }

  function profitability(d){
    const pendingCollect=Math.max(0,d.totalInv-d.collected),pendingPay=Math.max(0,d.totalPur-d.paid),result=d.margin-d.overheadBase,pct=d.baseInv?d.margin/d.baseInv*100:0;
    const root=$('#modal-root');root.innerHTML=`<div class="modal-backdrop"><div class="modal" style="width:min(1100px,96vw)"><div class="modal-head"><h2>Rentabilidad · ${esc(d.p.nombre)}</h2><div class="grow"></div><button class="btn" data-ph-close>Cerrar</button></div><div class="modal-body"><div class="grid cols-4">${row('Facturado base',money(d.baseInv))}${row('Facturado total',money(d.totalInv))}${row('Compras base',money(d.basePur))}${row('Coste de horas',money(d.hourCost))}${row('Margen directo',money(d.margin),d.margin>=0?'positive':'negative')}${row('Margen directo %',pct.toLocaleString('es-ES',{maximumFractionDigits:1})+'%',d.margin>=0?'positive':'negative')}${row('Gastos vinculados',money(d.overheadBase))}${row('Resultado tras vinculados',money(result),result>=0?'positive':'negative')}${row('Cobrado',money(d.collected))}${row('Pendiente de cobro',money(pendingCollect),pendingCollect>0?'negative':'positive')}${row('Pagado a proveedores',money(d.paid))}${row('Pendiente de pago',money(pendingPay),pendingPay>0?'negative':'positive')}</div><div class="grid cols-2" style="margin-top:14px"><div class="card panel"><h3>Facturas emitidas</h3>${d.invoices.length?d.invoices.map(x=>record('invoice',x.id,`${esc(x.numero||'Factura')} · ${money(x.total)}`,esc(x.fecha||''))).join(''):'<div class="empty">Sin facturas emitidas.</div>'}</div><div class="card panel"><h3>Costes directos</h3>${d.purchases.length?d.purchases.map(x=>record('purchase',x.id,`${esc(x.numero_factura||x.concepto||'Compra')} · ${money(x.total)}`,esc(x.fecha||''))).join(''):'<div class="empty">Sin compras.</div>'}</div></div></div></div></div>`;root.querySelector('[data-ph-close]').onclick=()=>root.innerHTML='';
  }

  function replaceCorePanel(panel,items,type,render){
    const h=panel.querySelector('h3');if(!h)return;panel.querySelectorAll(':scope > :not(h3)').forEach(x=>x.remove());
    if(!items.length){const e=document.createElement('div');e.className='empty';e.textContent='No hay datos todavía.';panel.appendChild(e);return}
    items.slice(0,10).forEach(x=>{const b=document.createElement('button');b.type='button';b.className='master-item';b.style.cssText=itemStyle;b.dataset.projectRecord=`${type}:${x.id}`;b.innerHTML=render(x);panel.appendChild(b)})
  }
  function decorateCore(d){
    const detail=$('.card.detail');if(!detail)return;
    detail.querySelectorAll('.card.panel').forEach(panel=>{const title=panel.querySelector('h3')?.textContent.trim();if(title==='Presupuestos')replaceCorePanel(panel,d.budgets,'budget',x=>`${esc(x.name||x.nombre||'Presupuesto')} · ${esc(x.status||x.estado||'')}`);else if(title==='Facturas')replaceCorePanel(panel,d.allInvoices,'invoice',x=>`${esc(x.numero||'Borrador')} · ${money(x.total)}`);else if(title==='Compras')replaceCorePanel(panel,d.allPurchases,'purchase',x=>`${esc(x.concepto||x.numero_factura||'Compra')} · ${money(x.total)}`);else if(title==='Documentos')replaceCorePanel(panel,d.docs,'document',x=>esc(x.nombre||x.archivo_nombre||'Documento'))});
  }

  function inject(){
    if((location.hash||'#inicio').slice(1)!=='proyectos'||$('#project-hub-v2'))return;
    const d=projectData(),view=$('#app-view');if(!d||!view)return;
    decorateCore(d);
    const openTasks=d.tasks.filter(x=>!['hecha','completada','cancelada','cerrada'].includes(String(x.estado||'').toLowerCase()));
    const openInc=d.incidents.filter(x=>!['resuelta','cerrada'].includes(String(x.estado||'').toLowerCase()));
    const pendingCollect=Math.max(0,d.totalInv-d.collected),pendingPay=Math.max(0,d.totalPur-d.paid);
    const hub=document.createElement('section');hub.id='project-hub-v2';hub.style.marginTop='16px';
    hub.innerHTML=`<div class="page-head"><div><small style="color:var(--muted);letter-spacing:1px">FICHA CENTRAL DEL PROYECTO</small><h1 style="font-size:24px;margin-top:3px">Toda la información vinculada</h1></div><div class="grow"></div><div class="toolbar"><button class="btn" data-hub-client>Cliente</button><button class="btn" data-hub-budget>Presupuestos</button><button class="btn" data-hub-route="obra">Obra</button><button class="btn" data-hub-route="documentos">Documentos</button><button class="btn" data-hub-route="facturas">Facturas</button><button class="btn" data-hub-profit>Rentabilidad</button></div></div>
      <div class="grid cols-6">${row('Facturado base',money(d.baseInv))}${row('Compras base',money(d.basePur))}${row('Coste horas',money(d.hourCost))}${row('Margen directo',money(d.margin),d.margin>=0?'positive':'negative')}${row('Pendiente cobro',money(pendingCollect),pendingCollect>0?'negative':'positive')}${row('Pendiente pago',money(pendingPay),pendingPay>0?'negative':'positive')}</div>
      ${d.draftInvoices.length?`<div class="notice" style="margin-top:12px"><b>${d.draftInvoices.length} factura${d.draftInvoices.length===1?'':'s'} en borrador.</b> Se muestran en el historial, pero no cuentan como facturación ni pendiente de cobro.</div>`:''}
      <div class="grid cols-4" style="margin-top:12px">${row('Presupuestos',d.budgets.length)}${row('Documentos',d.docs.length)}${row('Tareas abiertas',openTasks.length)}${row('Incidencias abiertas',openInc.length)}</div>
      <div class="grid cols-2" style="margin-top:14px">
        ${section('Presupuestos',d.budgets,x=>record('budget',x.id,esc(x.name||x.nombre||'Presupuesto'),esc(x.status||x.estado||'')),'Sin presupuestos vinculados')}
        ${section('Facturas',d.allInvoices,x=>record('invoice',x.id,esc(x.numero||'Borrador'),`${esc(x.fecha||'')} · ${money(x.total)} · ${esc(x.estado||'')}`),'Sin facturas')}
        ${section('Compras',d.allPurchases,x=>record('purchase',x.id,esc(x.numero_factura||x.referencia||x.concepto||'Compra'),`${esc(x.fecha||'')} · ${money(x.total)} · ${esc(x.estado||'')}`),'Sin compras')}
        ${section('Horas',d.hours,x=>`<div class="master-item"><b>${esc(x.persona||'')}</b><small>${esc(x.fecha||'')} · ${num(x.horas).toFixed(1)} h · ${money(num(x.horas)*num(x.coste_hora))}</small></div>`,'Sin horas registradas')}
        ${section('Obra',[...d.visits.map(x=>({...x,_tipo:'Visita'})),...d.tasks.map(x=>({...x,_tipo:'Tarea'})),...d.incidents.map(x=>({...x,_tipo:'Incidencia'}))],x=>`<div class="master-item"><b>${esc(x._tipo)} · ${esc(x.titulo||x.descripcion||'Registro')}</b><small>${esc(x.fecha||x.fecha_limite||'')} · ${esc(x.estado||x.estado_obra||'')}</small></div>`,'Sin actividad de obra')}
        ${section('Documentos',d.docs,x=>record('document',x.id,esc(x.nombre||x.archivo_nombre||'Documento'),`${esc(x.tipo||'')} · ${esc((x.fecha_documento||x.created_at||'').slice(0,10))}`),'Sin documentos')}
      </div>`;
    view.appendChild(hub);
    hub.querySelectorAll('[data-hub-route]').forEach(b=>b.onclick=()=>{d.S.sel.project=d.p.id;route(b.dataset.hubRoute)});
    hub.querySelector('[data-hub-client]').onclick=()=>window.iriarteOpenClientHub?.(d.p.cliente_id);
    hub.querySelector('[data-hub-budget]').onclick=()=>openBudget(d);
    hub.querySelector('[data-hub-profit]').onclick=()=>profitability(d);
  }

  function schedule(){clearTimeout(t);t=setTimeout(inject,80)}
  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});window.addEventListener('hashchange',schedule);window.addEventListener('load',schedule);
  document.addEventListener('click',e=>{
    const rec=e.target.closest('[data-project-record]');if(rec){e.preventDefault();e.stopImmediatePropagation();const [type,id]=rec.dataset.projectRecord.split(':');openRecord(type,id);return}
    const nav=e.target.closest('[data-project-nav]');if(!nav||window.APP?.route!=='proyectos')return;const d=projectData();if(!d)return;
    if(nav.dataset.projectNav==='clientes'){e.preventDefault();e.stopImmediatePropagation();window.iriarteOpenClientHub?.(d.p.cliente_id)}
    else if(nav.dataset.projectNav==='presupuestos'){e.preventDefault();e.stopImmediatePropagation();openBudget(d)}
    else if(nav.dataset.projectNav==='finanzas'){e.preventDefault();e.stopImmediatePropagation();profitability(d)}
  },true);
})();

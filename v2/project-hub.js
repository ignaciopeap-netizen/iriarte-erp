// Iriarte ERP V2 · ficha central de proyecto
(function(){
  'use strict';
  const $=s=>document.querySelector(s), money=v=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v||0));
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const num=v=>Number(v||0)||0;
  let t;

  function projectData(){
    const S=window.APP; if(!S?.data)return null;
    const p=(S.data.proyectos||[]).find(x=>String(x.id)===String(S.sel?.project));
    if(!p)return null;
    const match=(arr,key='proyecto_id')=>(arr||[]).filter(x=>String(x[key]||x.project_id||'')===String(p.id));
    const invoices=match(S.data.facturas), purchases=match(S.data.compras), hours=match(S.data.horas), visits=match(S.data.visitas), tasks=match(S.data.tareas), incidents=match(S.data.incidencias), docs=match(S.data.docs), budgets=(S.data.presupuestos||[]).filter(x=>String(x.proyecto_id||x.project_id||'')===String(p.id));
    const invoiceIds=new Set(invoices.map(x=>String(x.id))), purchaseIds=new Set(purchases.map(x=>String(x.id)));
    const collections=(S.data.cobros||[]).filter(x=>invoiceIds.has(String(x.factura_id)));
    const payments=(S.data.pagos||[]).filter(x=>purchaseIds.has(String(x.compra_id)));
    const baseInv=invoices.reduce((a,x)=>a+num(x.base),0), basePur=purchases.reduce((a,x)=>a+num(x.base),0), hourCost=hours.reduce((a,x)=>a+num(x.horas)*num(x.coste_hora),0), collected=collections.reduce((a,x)=>a+num(x.importe),0), paid=payments.reduce((a,x)=>a+num(x.importe),0);
    return {S,p,invoices,purchases,hours,visits,tasks,incidents,docs,budgets,collections,payments,baseInv,basePur,hourCost,collected,paid,margin:baseInv-basePur-hourCost};
  }

  function row(label,value,cls=''){return `<div class="info"><small>${esc(label)}</small><b class="${cls}">${esc(value)}</b></div>`}
  function section(title,items,render,emptyText){return `<div class="card panel"><h3>${esc(title)}</h3>${items.length?items.slice(0,12).map(render).join(''):`<div class="empty">${esc(emptyText)}</div>`}</div>`}

  function inject(){
    if((location.hash||'#inicio').slice(1)!=='proyectos')return;
    if($('#project-hub-v2'))return;
    const d=projectData(), view=$('#app-view'); if(!d||!view)return;
    const openTasks=d.tasks.filter(x=>!['hecha','completada','cancelada','cerrada'].includes(String(x.estado||'').toLowerCase()));
    const openInc=d.incidents.filter(x=>!['resuelta','cerrada'].includes(String(x.estado||'').toLowerCase()));
    const pendingCollect=Math.max(0,d.invoices.reduce((a,x)=>a+num(x.total),0)-d.collected);
    const pendingPay=Math.max(0,d.purchases.reduce((a,x)=>a+num(x.total),0)-d.paid);
    const hub=document.createElement('section'); hub.id='project-hub-v2'; hub.style.marginTop='16px';
    hub.innerHTML=`<div class="page-head"><div><small style="color:var(--muted);letter-spacing:1px">FICHA CENTRAL DEL PROYECTO</small><h1 style="font-size:24px;margin-top:3px">Toda la información vinculada</h1></div><div class="grow"></div><div class="toolbar"><button class="btn" data-hub-route="presupuestos">Presupuesto</button><button class="btn" data-hub-route="obra">Obra</button><button class="btn" data-hub-route="documentos">Documentos</button><button class="btn" data-hub-route="facturas">Facturas</button><button class="btn" data-hub-route="finanzas">Finanzas</button></div></div>
      <div class="grid cols-6">
        ${row('Facturado base',money(d.baseInv))}${row('Compras base',money(d.basePur))}${row('Coste horas',money(d.hourCost))}${row('Margen directo',money(d.margin),d.margin>=0?'positive':'negative')}${row('Pendiente cobro',money(pendingCollect),pendingCollect>0?'negative':'positive')}${row('Pendiente pago',money(pendingPay),pendingPay>0?'negative':'positive')}
      </div>
      <div class="grid cols-4" style="margin-top:12px">
        ${row('Presupuestos',d.budgets.length)}${row('Documentos',d.docs.length)}${row('Tareas abiertas',openTasks.length)}${row('Incidencias abiertas',openInc.length)}
      </div>
      <div class="grid cols-2" style="margin-top:14px">
        ${section('Presupuestos',d.budgets,x=>`<div class="master-item"><b>${esc(x.name||x.nombre||'Presupuesto')}</b><small>${esc(x.status||x.estado||'')}</small></div>`,'Sin presupuestos vinculados')}
        ${section('Facturas',d.invoices,x=>`<div class="master-item"><b>${esc(x.numero||'Borrador')}</b><small>${esc(x.fecha||'')} · ${money(x.total)} · ${esc(x.estado||'')}</small></div>`,'Sin facturas')}
        ${section('Compras',d.purchases,x=>`<div class="master-item"><b>${esc(x.numero_factura||x.referencia||x.concepto||'Compra')}</b><small>${esc(x.fecha||'')} · ${money(x.total)} · ${esc(x.estado||'')}</small></div>`,'Sin compras')}
        ${section('Horas',d.hours,x=>`<div class="master-item"><b>${esc(x.persona||'')}</b><small>${esc(x.fecha||'')} · ${num(x.horas).toFixed(1)} h · ${money(num(x.horas)*num(x.coste_hora))}</small></div>`,'Sin horas registradas')}
        ${section('Obra',[...d.visits.map(x=>({...x,_tipo:'Visita'})),...d.tasks.map(x=>({...x,_tipo:'Tarea'})),...d.incidents.map(x=>({...x,_tipo:'Incidencia'}))],x=>`<div class="master-item"><b>${esc(x._tipo)} · ${esc(x.titulo||x.descripcion||'Registro')}</b><small>${esc(x.fecha||x.fecha_limite||'')} · ${esc(x.estado||x.estado_obra||'')}</small></div>`,'Sin actividad de obra')}
        ${section('Documentos',d.docs,x=>`<div class="master-item"><b>${esc(x.nombre||x.archivo_nombre||'Documento')}</b><small>${esc(x.tipo||'')} · ${esc((x.fecha_documento||x.created_at||'').slice(0,10))}</small></div>`,'Sin documentos')}
      </div>`;
    view.appendChild(hub);
    hub.querySelectorAll('[data-hub-route]').forEach(b=>b.onclick=()=>{window.APP.sel.project=d.p.id;location.hash='#'+b.dataset.hubRoute;window.dispatchEvent(new HashChangeEvent('hashchange'))});
  }

  function schedule(){clearTimeout(t);t=setTimeout(inject,80)}
  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
  window.addEventListener('hashchange',schedule);window.addEventListener('load',schedule);
})();

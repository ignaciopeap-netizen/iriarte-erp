// Iriarte ERP V2 · flujo fiable Presupuesto -> Proyecto -> Factura
(function(){
  'use strict';
  const db=()=>window.__iriarteDb;
  const num=v=>Number(String(v??0).replace(',','.'))||0;
  const today=()=>new Date().toISOString().slice(0,10);

  function currentBudget(){
    const S=window.APP;
    return S?.data?.presupuestos?.find(x=>String(x.id)===String(S?.sel?.budget))||null;
  }
  function budgetBase(p){
    if((p.kind||'obra')==='honorarios')return (p.fee_lines||[]).reduce((a,x)=>a+num(x.amount??x.importe),0);
    return (p.items||[]).reduce((a,x)=>a+num(x.qty??x.cantidad)*num(x.price??x.precio),0);
  }
  function budgetIrpfPct(p){return p.irpf_enabled?num(p.irpf_pct||0):0}
  function dateValue(p){const d=p.date||p.fecha;return /^\d{4}-\d{2}-\d{2}$/.test(String(d||''))?String(d):today()}

  async function ensureProject(p){
    const client=db();if(!client)throw new Error('La conexión todavía no está preparada.');
    if(p.proyecto_id){
      const {data}=await client.from('projects').select('id,es_proyecto').eq('id',p.proyecto_id).maybeSingle();
      if(data?.id){
        if(!data.es_proyecto)await client.from('projects').update({es_proyecto:true,estado_gestion:'activo'}).eq('id',data.id);
        return data.id;
      }
    }

    const projectId=crypto.randomUUID();
    const name=p.name||p.nombre||'Proyecto';
    const address=p.address||p.direccion||null;
    const code=p.ref||p.numero||null;
    const payload={
      id:projectId,
      name,
      client:p.client||null,
      cliente_id:p.cliente_id||null,
      address,
      direccion:address,
      date:dateValue(p),
      fecha_inicio:dateValue(p),
      ref:code,
      codigo:code,
      expte:p.expte||null,
      status:'Proyecto',
      estado_gestion:'activo',
      es_proyecto:true,
      importe_contratado:budgetBase(p),
      descripcion:'Creado desde presupuesto '+(code||p.id)
    };
    const {error}=await client.from('projects').insert(payload);if(error)throw error;
    const {error:e2}=await client.from('presupuestos').update({proyecto_id:projectId,estado:'aceptado',status:'proyecto',phase:'Aceptado'}).eq('id',p.id);if(e2)throw e2;
    p.proyecto_id=projectId;p.estado='aceptado';p.status='proyecto';p.phase='Aceptado';
    return projectId;
  }

  function invoiceLines(p,invoiceId){
    if((p.kind||'obra')==='honorarios')return (p.fee_lines||[]).map((x,i)=>({factura_id:invoiceId,orden:i+1,codigo:null,seccion:'Honorarios',descripcion:x.description||x.concepto||'',ubicacion:null,unidad:'ud',cantidad:1,precio_unitario:num(x.amount??x.importe),descuento_pct:0,iva_pct:num(x.vat??x.ivaPct??21)}));
    return (p.items||[]).map((x,i)=>({factura_id:invoiceId,orden:i+1,codigo:x.code||x.codigo||null,seccion:x.section||x.seccion||null,descripcion:x.description||x.desc||x.descripcion||'',ubicacion:x.location||x.ubicacion||null,unidad:x.unit||x.unidad||'ud',cantidad:num(x.qty??x.cantidad),precio_unitario:num(x.price??x.precio),descuento_pct:0,iva_pct:num(x.vat??x.ivaPct??21)}));
  }

  function totals(rows,irpfPct){
    let base=0,iva=0;
    rows.forEach(l=>{const net=num(l.cantidad)*num(l.precio_unitario)*(1-num(l.descuento_pct)/100);base+=net;iva+=net*num(l.iva_pct)/100});
    const irpf=base*num(irpfPct)/100;
    return {base,iva,irpf,total:base+iva-irpf};
  }

  async function convert(){
    const p=currentBudget();if(!p)return;
    try{
      const existed=!!p.proyecto_id;
      const pid=await ensureProject(p);
      window.APP.sel.project=pid;
      if(!existed)alert('Proyecto creado y vinculado al presupuesto.');
      location.hash='#proyectos';location.reload();
    }catch(err){alert('No se pudo convertir el presupuesto en proyecto:\n'+(err.message||err))}
  }

  async function createInvoice(){
    const p=currentBudget();if(!p)return;const client=db();if(!client)return;
    try{
      const pid=await ensureProject(p);
      const irpfPct=budgetIrpfPct(p);
      const payload={numero:null,fecha:today(),cliente_id:p.cliente_id||null,proyecto_id:pid,presupuesto_id:p.id,concepto:p.name||p.nombre||'Presupuesto',estado:'borrador',irpf_pct:irpfPct,notas:'Factura creada desde presupuesto. Editable independientemente del presupuesto.'};
      const {data,error}=await client.from('facturas').insert(payload).select('id').single();if(error)throw error;
      const rows=invoiceLines(p,data.id);
      if(rows.length){const r=await client.from('factura_lineas').insert(rows);if(r.error)throw r.error}
      const t=totals(rows,irpfPct);
      const up=await client.from('facturas').update({base:t.base,iva_importe:t.iva,irpf_importe:t.irpf,total:t.total}).eq('id',data.id);if(up.error)throw up.error;
      localStorage.setItem('iriarte_open_invoice',data.id);location.hash='#facturas';location.reload();
    }catch(err){alert('No se pudo crear la factura desde el presupuesto:\n'+(err.message||err))}
  }

  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-action]');if(!b)return;
    if(b.dataset.action==='budget-to-project'){e.preventDefault();e.stopImmediatePropagation();convert()}
    else if(b.dataset.action==='budget-to-invoice'){e.preventDefault();e.stopImmediatePropagation();createInvoice()}
  },true);
})();

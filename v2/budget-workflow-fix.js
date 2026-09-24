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
  function dateValue(p){const d=p.date||p.fecha;return /^\d{4}-\d{2}-\d{2}$/.test(String(d||''))?String(d):today()}

  async function syncCurrentBudget(p){
    const client=db();if(!client)throw new Error('La conexión todavía no está preparada.');
    const date=dateValue(p),name=p.name||p.nombre||'Presupuesto',ref=p.ref||p.numero||null;
    const payload={
      nombre:name,name,cliente_id:p.cliente_id||null,proyecto_id:p.proyecto_id||null,
      fecha:date,date,numero:ref,ref,client:p.client||null,address:p.address||null,
      phase:p.phase||'Borrador',kind:p.kind||'obra',irpf_enabled:!!p.irpf_enabled,
      irpf_pct:p.irpf_enabled?num(p.irpf_pct||15):0,items:p.items||[],status:p.status||'Borrador',
      archived:!!p.archived,intro_text:p.intro_text||'',zonas:p.zonas||[],scope_items:p.scope_items||[],
      redaccion_toggle:p.redaccion_toggle!==false,redaccion_texto:p.redaccion_texto||'',fases_obra:p.fases_obra||[],
      direccion_resumen:p.direccion_resumen||'',fee_lines:p.fee_lines||[],clausulas:p.clausulas||[]
    };
    const {data,error}=await client.from('presupuestos').update(payload).eq('id',p.id).select('*').single();if(error)throw error;
    Object.assign(p,data);return p;
  }

  async function ensureProject(p){
    const client=db();if(!client)throw new Error('La conexión todavía no está preparada.');
    const payload={
      nombre:p.name||p.nombre||'Proyecto',cliente_id:p.cliente_id||null,codigo:p.ref||p.numero||null,
      direccion:p.address||null,fecha_inicio:dateValue(p),expediente:p.expte||null,importe_contratado:budgetBase(p)
    };
    if(p.proyecto_id){
      const {data,error}=await client.from('proyectos').select('id').eq('id',p.proyecto_id).maybeSingle();if(error)throw error;
      if(data?.id){
        const {error:updateError}=await client.from('proyectos').update(payload).eq('id',data.id);if(updateError)throw updateError;
        const {error:budgetError}=await client.from('presupuestos').update({estado:'aceptado',status:'proyecto',phase:'Aceptado'}).eq('id',p.id);if(budgetError)throw budgetError;
        p.estado='aceptado';p.status='proyecto';p.phase='Aceptado';return data.id;
      }
    }
    const {data,error}=await client.from('proyectos').insert({...payload,estado:'activo',descripcion:'Creado desde presupuesto '+(p.ref||p.numero||p.id)}).select('id').single();if(error)throw error;
    const {error:e2}=await client.from('presupuestos').update({proyecto_id:data.id,estado:'aceptado',status:'proyecto',phase:'Aceptado'}).eq('id',p.id);if(e2)throw e2;
    p.proyecto_id=data.id;p.estado='aceptado';p.status='proyecto';p.phase='Aceptado';return data.id;
  }

  async function convert(){
    const p=currentBudget();if(!p)return;
    try{
      const existed=!!p.proyecto_id;
      await syncCurrentBudget(p);
      const pid=await ensureProject(p);
      window.APP.sel.project=pid;localStorage.setItem('iriarte_open_project',pid);
      if(!existed)alert('Proyecto creado y vinculado al presupuesto.');
      location.hash='#proyectos';location.reload();
    }catch(err){alert('No se pudo convertir el presupuesto en proyecto:\n'+(err.message||err))}
  }

  async function createInvoice(){
    const p=currentBudget(),client=db();if(!p||!client)return;
    try{
      await syncCurrentBudget(p);
      const {data,error}=await client.rpc('crear_factura_desde_presupuesto_v2',{p_presupuesto_id:p.id});if(error)throw error;
      const invoiceId=data?.invoice_id,projectId=data?.project_id;if(!invoiceId)throw new Error('La base de datos no devolvió la factura creada.');
      if(projectId)window.APP.sel.project=projectId;
      localStorage.setItem('iriarte_open_invoice',invoiceId);location.hash='#facturas';location.reload();
    }catch(err){alert('No se pudo crear la factura desde el presupuesto:\n'+(err.message||err))}
  }

  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-action]');if(!b)return;
    if(b.dataset.action==='budget-to-project'){e.preventDefault();e.stopImmediatePropagation();convert()}
    else if(b.dataset.action==='budget-to-invoice'){e.preventDefault();e.stopImmediatePropagation();createInvoice()}
  },true);
})();

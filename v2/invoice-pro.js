// Iriarte ERP V2 · editor profesional de facturas por líneas
(function(){
  'use strict';
  const URL='https://kzmjeccivhkhtuokfkta.supabase.co';
  const KEY='sb_publishable_YBf9vRaOlVQBHM4ionZLPw_TIIxZY9G';
  const db=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const num=v=>Number(String(v??0).replace(',','.'))||0;
  const money=v=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v||0));
  const today=()=>new Date().toISOString().slice(0,10);

  function opts(arr,val,label='nombre'){
    return '<option value="">—</option>'+(arr||[]).map(x=>`<option value="${esc(x.id)}" ${String(x.id)===String(val)?'selected':''}>${esc(x[label]||x.name||'')}</option>`).join('');
  }

  async function getInvoice(fid){
    if(!fid)return {invoice:{fecha:today(),estado:'borrador',iva_pct:21,irpf_pct:0},lines:[]};
    const [{data:invoice,error:e1},{data:lines,error:e2}]=await Promise.all([
      db.from('facturas').select('*').eq('id',fid).single(),
      db.from('factura_lineas').select('*').eq('factura_id',fid).order('orden',{ascending:true})
    ]);
    if(e1)throw e1;if(e2)throw e2;return {invoice,lines:lines||[]};
  }

  function calc(lines){
    let base=0,iva=0;
    for(const l of lines){
      const gross=num(l.cantidad)*num(l.precio_unitario), net=gross*(1-num(l.descuento_pct)/100);
      base+=net;iva+=net*num(l.iva_pct)/100;
    }
    return {base,iva,total:base+iva};
  }

  function lineRow(l={},i){
    return `<div class="invoice-line" data-invoice-line="${i}" style="display:grid;grid-template-columns:70px 110px minmax(220px,1fr) 110px 60px 75px 95px 70px 70px 38px;gap:6px;margin-bottom:6px;align-items:center">
      <input data-k="codigo" value="${esc(l.codigo||'')}" placeholder="Cód.">
      <input data-k="seccion" value="${esc(l.seccion||'')}" placeholder="Sección">
      <input data-k="descripcion" value="${esc(l.descripcion||'')}" placeholder="Descripción">
      <input data-k="ubicacion" value="${esc(l.ubicacion||'')}" placeholder="Ubicación">
      <input data-k="unidad" value="${esc(l.unidad||'ud')}">
      <input data-k="cantidad" type="number" step="0.001" value="${num(l.cantidad||1)}">
      <input data-k="precio_unitario" type="number" step="0.01" value="${num(l.precio_unitario)}">
      <input data-k="descuento_pct" type="number" step="0.01" value="${num(l.descuento_pct)}">
      <input data-k="iva_pct" type="number" step="0.01" value="${l.iva_pct==null?21:num(l.iva_pct)}">
      <button type="button" class="btn danger" data-remove-invoice-line="${i}">×</button>
    </div>`;
  }

  async function openEditor(fid=null){
    let data;
    try{data=await getInvoice(fid)}catch(err){alert('No se puede abrir el editor por líneas. Aplica MIGRACION_V2.sql.\n\n'+err.message);return}
    const S=window.APP?.data||{}, invoice=data.invoice, lines=(data.lines||[]).map(x=>({...x}));
    const root=$('#modal-root');
    root.innerHTML=`<div class="modal-backdrop"><div class="modal" style="width:min(1180px,97vw)"><div class="modal-head"><h2>${fid?'Editar factura':'Nueva factura'}</h2><div class="grow"></div><button type="button" class="btn" data-inv-close>Cerrar</button></div><form id="invoice-pro-form"><div class="modal-body">
      <div class="form-grid">
        <label>Número<input name="numero" value="${esc(invoice.numero||'')}" placeholder="Se puede dejar vacío"></label>
        <label>Fecha<input name="fecha" type="date" value="${esc(invoice.fecha||today())}" required></label>
        <label>Cliente<select name="cliente_id">${opts(S.clientes,invoice.cliente_id)}</select></label>
        <label>Proyecto<select name="proyecto_id">${opts(S.proyectos,invoice.proyecto_id)}</select></label>
        <label>Vencimiento<input name="fecha_vencimiento" type="date" value="${esc(invoice.fecha_vencimiento||'')}"></label>
        <label>Estado<select name="estado"><option ${invoice.estado==='borrador'?'selected':''}>borrador</option><option ${invoice.estado==='emitida'?'selected':''}>emitida</option><option ${invoice.estado==='parcialmente_cobrada'?'selected':''}>parcialmente_cobrada</option><option ${invoice.estado==='cobrada'?'selected':''}>cobrada</option><option ${invoice.estado==='vencida'?'selected':''}>vencida</option></select></label>
        <label>Forma de pago<input name="forma_pago" value="${esc(invoice.forma_pago||'')}"></label>
        <label>IRPF %<input name="irpf_pct" id="invoice-irpf" type="number" step="0.01" value="${num(invoice.irpf_pct)}"></label>
        <label class="full">Concepto general<input name="concepto" value="${esc(invoice.concepto||'')}"></label>
      </div>
      <h3 style="font-family:Georgia,serif;margin:20px 0 8px">Líneas de factura</h3>
      <div style="display:grid;grid-template-columns:70px 110px minmax(220px,1fr) 110px 60px 75px 95px 70px 70px 38px;gap:6px;font-size:10px;color:#6e746a;margin-bottom:5px"><b>Código</b><b>Sección</b><b>Descripción</b><b>Ubicación</b><b>Ud.</b><b>Cant.</b><b>Precio</b><b>Dto %</b><b>IVA %</b><span></span></div>
      <div id="invoice-lines"></div>
      <div class="toolbar"><button type="button" class="btn" id="invoice-add-line">+ Línea</button><button type="button" class="btn" id="invoice-paste-lines">Pegar desde Excel</button></div>
      <div class="grid cols-4" style="margin-top:16px"><div class="info"><small>Base</small><b id="inv-base">0 €</b></div><div class="info"><small>IVA</small><b id="inv-iva">0 €</b></div><div class="info"><small>IRPF</small><b id="inv-irpf-amount">0 €</b></div><div class="info"><small>Total</small><b id="inv-total">0 €</b></div></div>
      <label style="display:block;margin-top:16px">Observaciones<textarea name="observaciones" style="width:100%;min-height:90px">${esc(invoice.observaciones||invoice.notas||'')}</textarea></label>
      <div id="invoice-pro-error"></div>
    </div><div class="modal-foot"><button type="button" class="btn" data-inv-close>Cancelar</button><button type="button" class="btn" id="invoice-preview">Vista PDF</button><button type="submit" class="btn primary">Guardar factura</button></div></form></div></div>`;
    const close=()=>root.innerHTML='';root.querySelectorAll('[data-inv-close]').forEach(x=>x.onclick=close);
    const lineBox=$('#invoice-lines');
    function redraw(){lineBox.innerHTML=lines.map(lineRow).join('');bindLines();totals()}
    function bindLines(){
      lineBox.querySelectorAll('[data-invoice-line] input').forEach(inp=>inp.oninput=()=>{const i=+inp.closest('[data-invoice-line]').dataset.invoiceLine,k=inp.dataset.k;lines[i][k]=['cantidad','precio_unitario','descuento_pct','iva_pct'].includes(k)?num(inp.value):inp.value;totals()});
      lineBox.querySelectorAll('[data-remove-invoice-line]').forEach(b=>b.onclick=()=>{lines.splice(+b.dataset.removeInvoiceLine,1);redraw()});
    }
    function totals(){const c=calc(lines),rp=num($('#invoice-irpf').value),irpf=c.base*rp/100;$('#inv-base').textContent=money(c.base);$('#inv-iva').textContent=money(c.iva);$('#inv-irpf-amount').textContent='− '+money(irpf);$('#inv-total').textContent=money(c.total-irpf)}
    $('#invoice-irpf').oninput=totals;
    $('#invoice-add-line').onclick=()=>{lines.push({codigo:'',seccion:'',descripcion:'',ubicacion:'',unidad:'ud',cantidad:1,precio_unitario:0,descuento_pct:0,iva_pct:21});redraw()};
    $('#invoice-paste-lines').onclick=()=>{const raw=prompt('Pega filas de Excel: Código | Sección | Descripción | Ubicación | Ud. | Cant. | Precio | Descuento % | IVA %');if(!raw)return;raw.split(/\r?\n/).filter(Boolean).forEach(r=>{const a=r.split('\t');lines.push({codigo:a[0]||'',seccion:a[1]||'',descripcion:a[2]||'',ubicacion:a[3]||'',unidad:a[4]||'ud',cantidad:num(a[5]||1),precio_unitario:num(a[6]),descuento_pct:num(a[7]),iva_pct:a[8]==null?21:num(a[8])})});redraw()};
    $('#invoice-preview').onclick=()=>printDraft(Object.fromEntries(new FormData($('#invoice-pro-form')).entries()),lines);
    $('#invoice-pro-form').onsubmit=async e=>{e.preventDefault();const submit=e.submitter;submit.disabled=true;try{
      const f=Object.fromEntries(new FormData(e.currentTarget).entries()),c=calc(lines),rp=num(f.irpf_pct),irpf=c.base*rp/100,total=c.total-irpf;
      const payload={numero:f.numero||null,fecha:f.fecha,cliente_id:f.cliente_id||null,proyecto_id:f.proyecto_id||null,fecha_vencimiento:f.fecha_vencimiento||null,estado:f.estado||'borrador',forma_pago:f.forma_pago||null,concepto:f.concepto||null,base:c.base,base_imponible:c.base,iva_importe:c.iva,irpf_pct:rp,irpf_importe:irpf,total,observaciones:f.observaciones||null,notas:f.observaciones||null};
      let invoiceId=fid;
      if(fid){const {error}=await db.from('facturas').update(payload).eq('id',fid);if(error)throw error;const del=await db.from('factura_lineas').delete().eq('factura_id',fid);if(del.error)throw del.error}else{const {data,error}=await db.from('facturas').insert(payload).select('id').single();if(error)throw error;invoiceId=data.id}
      if(lines.length){const rows=lines.map((l,i)=>({factura_id:invoiceId,orden:i+1,codigo:l.codigo||null,seccion:l.seccion||null,descripcion:l.descripcion||'',ubicacion:l.ubicacion||null,unidad:l.unidad||null,cantidad:num(l.cantidad),precio_unitario:num(l.precio_unitario),descuento_pct:num(l.descuento_pct),iva_pct:num(l.iva_pct)}));const ins=await db.from('factura_lineas').insert(rows);if(ins.error)throw ins.error}
      close();location.reload();
    }catch(err){$('#invoice-pro-error').innerHTML=`<div class="notice" style="background:#f6dfd7;color:#8f4d3c">${esc(err.message||err)}</div>`;submit.disabled=false}};
    if(!lines.length)lines.push({codigo:'',seccion:'',descripcion:'',ubicacion:'',unidad:'ud',cantidad:1,precio_unitario:0,descuento_pct:0,iva_pct:21});redraw();
  }

  function clientLabel(id){return (window.APP?.data?.clientes||[]).find(x=>String(x.id)===String(id))?.nombre||''}
  function projectLabel(id){return (window.APP?.data?.proyectos||[]).find(x=>String(x.id)===String(id))?.nombre||''}
  function printDraft(f,lines){
    const c=calc(lines),rp=num(f.irpf_pct),irpf=c.base*rp/100,total=c.total-irpf;
    const w=window.open('','_blank');if(!w)return;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Factura ${esc(f.numero||'borrador')}</title><style>@page{size:A4;margin:16mm}body{font-family:Arial,sans-serif;color:#20261e;font-size:12px}h1,h2{font-family:Georgia,serif;font-weight:500;color:#3f5a35}.brand{font-family:Georgia,serif;font-size:20px;color:#3f5a35}.sub{font-size:8px;letter-spacing:2px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:24px 0}.box{padding:9px;border:1px solid #ddd7c9}.box small{display:block;color:#777;margin-bottom:3px}table{width:100%;border-collapse:collapse;margin-top:24px}th,td{padding:8px 6px;border-bottom:1px solid #e4dfd4;text-align:left;vertical-align:top}th{font-size:10px;color:#667}.right{text-align:right}.totals{width:320px;margin:24px 0 0 auto}.totals div{display:flex;justify-content:space-between;padding:5px 0}.total{font-size:18px;border-top:1px solid #777;margin-top:6px;padding-top:9px!important}.notes{margin-top:28px;white-space:pre-wrap}@media print{button{display:none}}</style></head><body><div class="brand">Sonsoles Pérez Iriarte</div><div class="sub">JARDINERÍA Y PAISAJISMO</div><div style="display:flex;justify-content:space-between;align-items:flex-end"><h1>Factura ${esc(f.numero||'Borrador')}</h1><div>${esc(f.fecha||'')}</div></div><div class="meta"><div class="box"><small>Cliente</small><b>${esc(clientLabel(f.cliente_id))}</b></div><div class="box"><small>Proyecto</small><b>${esc(projectLabel(f.proyecto_id))}</b></div><div class="box"><small>Vencimiento</small>${esc(f.fecha_vencimiento||'—')}</div><div class="box"><small>Forma de pago</small>${esc(f.forma_pago||'—')}</div></div>${f.concepto?`<p><b>${esc(f.concepto)}</b></p>`:''}<table><tr><th>Descripción</th><th>Ud.</th><th class="right">Cant.</th><th class="right">Precio</th><th class="right">Dto.</th><th class="right">IVA</th><th class="right">Importe</th></tr>${lines.map(l=>{const gross=num(l.cantidad)*num(l.precio_unitario),net=gross*(1-num(l.descuento_pct)/100);return `<tr><td>${l.seccion?`<small>${esc(l.seccion)}</small><br>`:''}${esc(l.descripcion||'')}${l.ubicacion?`<br><small>${esc(l.ubicacion)}</small>`:''}</td><td>${esc(l.unidad||'')}</td><td class="right">${num(l.cantidad).toLocaleString('es-ES')}</td><td class="right">${money(l.precio_unitario)}</td><td class="right">${num(l.descuento_pct)}%</td><td class="right">${num(l.iva_pct)}%</td><td class="right">${money(net)}</td></tr>`}).join('')}</table><div class="totals"><div><span>Base imponible</span><b>${money(c.base)}</b></div><div><span>IVA</span><b>${money(c.iva)}</b></div>${rp?`<div><span>IRPF (${rp}%)</span><b>− ${money(irpf)}</b></div>`:''}<div class="total"><span>TOTAL</span><b>${money(total)}</b></div></div>${f.observaciones?`<div class="notes"><b>Observaciones</b><br>${esc(f.observaciones)}</div>`:''}<script>window.onload=()=>window.print()<\/script></body></html>`);w.document.close();
  }

  async function printSaved(fid){
    try{const {invoice,lines}=await getInvoice(fid);printDraft({numero:invoice.numero,fecha:invoice.fecha,cliente_id:invoice.cliente_id,proyecto_id:invoice.proyecto_id,fecha_vencimiento:invoice.fecha_vencimiento,forma_pago:invoice.forma_pago,concepto:invoice.concepto,irpf_pct:invoice.irpf_pct,observaciones:invoice.observaciones||invoice.notas},lines)}catch(err){alert(err.message)}
  }

  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-action]');if(!b)return;const a=b.dataset.action||'';
    if(a==='new-invoice'||a.startsWith('edit-invoice:')||a.startsWith('print-invoice:')){
      e.preventDefault();e.stopImmediatePropagation();
      if(a==='new-invoice')openEditor();else if(a.startsWith('edit-invoice:'))openEditor(a.split(':')[1]);else printSaved(a.split(':')[1]);
    }
  },true);
})();

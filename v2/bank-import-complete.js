// Iriarte ERP V2 · importación bancaria completa y conciliable
(function(){
'use strict';
const db=()=>window.__iriarteDb;
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[m]));
const norm=v=>String(v??'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const money=v=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v||0));
const num=v=>Number(v||0)||0;

function amount(v){let s=String(v??'').trim().replace(/\s/g,'').replace(/€/g,'');if(!s)return 0;if(s.includes(',')&&s.includes('.'))s=s.replace(/\./g,'').replace(',','.');else if(s.includes(','))s=s.replace(',','.');s=s.replace(/[^0-9.+-]/g,'');const n=Number(s);return Number.isFinite(n)?n:0}
function date(v){const s=String(v??'').trim();if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;const m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);if(m)return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;return null}
function detect(text){const first=(text.split(/\r?\n/).find(Boolean)||'');return first.includes('\t')?'\t':first.includes(';')?';':','}
function split(line,d){return line.split(d).map(x=>x.trim().replace(/^"|"$/g,''))}
function idx(headers,names){for(const n of names){const i=headers.findIndex(h=>h===n||h.includes(n));if(i>=0)return i}return-1}
function exactOrLoose(rows,raw,fields){const q=norm(raw);if(!q)return null;const list=rows||[];const exact=list.find(x=>fields.some(f=>{const v=norm(x[f]);return v&&v===q}));if(exact)return exact.id;const loose=list.find(x=>fields.some(f=>{const v=norm(x[f]);return v&&(v.includes(q)||q.includes(v))}));return loose?.id||null}
function matchProject(raw){return exactOrLoose(window.APP?.data?.proyectos,raw,['nombre','codigo'])}
function matchClient(raw){return exactOrLoose(window.APP?.data?.clientes,raw,['nombre','cif'])}
function matchSupplier(raw){return exactOrLoose(window.APP?.data?.proveedores,raw,['nombre','cif'])}
function matchInvoice(raw){return exactOrLoose(window.APP?.data?.facturas,raw,['numero','concepto'])}
function matchPurchase(raw){return exactOrLoose(window.APP?.data?.compras,raw,['numero_factura','concepto','referencia'])}
function bool(v){const q=norm(v);return ['si','sí','yes','true','1','conciliado','conciliada'].includes(q)}
function invoicePending(id){const D=window.APP?.data||{},f=(D.facturas||[]).find(x=>String(x.id)===String(id));if(!f)return 0;const paid=(D.cobros||[]).filter(x=>String(x.factura_id)===String(id)).reduce((a,x)=>a+num(x.importe),0);return Math.max(0,num(f.total)-paid)}
function purchasePending(id){const D=window.APP?.data||{},c=(D.compras||[]).find(x=>String(x.id)===String(id));if(!c)return 0;const paid=(D.pagos||[]).filter(x=>String(x.compra_id)===String(id)).reduce((a,x)=>a+num(x.importe),0);return Math.max(0,num(c.total)-paid)}

function parse(text){
  const d=detect(text),lines=text.split(/\r?\n/).filter(x=>x.trim());if(!lines.length)return[];
  const first=split(lines[0],d),headers=first.map(norm),hasHeader=headers.some(h=>/fecha|concepto|importe|cuenta|debe|haber/.test(h));const body=hasHeader?lines.slice(1):lines;
  const I=hasHeader?{
    fecha:idx(headers,['fecha operacion','fecha movimiento','fecha']),valor:idx(headers,['fecha valor']),concepto:idx(headers,['concepto banco','concepto','descripcion','detalle','movimiento']),importe:idx(headers,['importe','cantidad']),debe:idx(headers,['debe','cargo']),haber:idx(headers,['haber','abono']),cuenta:idx(headers,['cuenta','iban']),ref:idx(headers,['referencia','ref']),cat:idx(headers,['categoria']),sub:idx(headers,['subcategoria']),proy:idx(headers,['proyecto']),cliente:idx(headers,['cliente']),proveedor:idx(headers,['proveedor']),tercero:idx(headers,['cliente proveedor','cliente/proveedor','tercero']),factura:idx(headers,['factura']),compra:idx(headers,['compra']),doc:idx(headers,['factura compra','factura/compra','documento']),estado:idx(headers,['estado conciliacion','conciliacion','conciliado']),notas:idx(headers,['notas','observaciones'])
  }:{fecha:0,valor:1,concepto:2,importe:3,cuenta:4,cat:5,sub:6,proy:7,cliente:-1,proveedor:-1,tercero:8,factura:-1,compra:-1,doc:9,estado:10,notas:11,ref:-1,debe:-1,haber:-1};
  return body.map(line=>{
    const c=split(line,d),get=i=>i>=0?(c[i]||''):'';let signed=I.importe>=0?amount(get(I.importe)):0;
    if(I.importe<0){const debit=Math.abs(amount(get(I.debe))),credit=Math.abs(amount(get(I.haber)));signed=credit-debit}
    const tercero=get(I.tercero),documento=get(I.doc),cliente_id=matchClient(get(I.cliente)||tercero),proveedor_id=matchSupplier(get(I.proveedor)||tercero),factura_id=matchInvoice(get(I.factura)||documento),compra_id=matchPurchase(get(I.compra)||documento);
    let proyecto_id=matchProject(get(I.proy));
    if(!proyecto_id&&factura_id)proyecto_id=(window.APP?.data?.facturas||[]).find(x=>String(x.id)===String(factura_id))?.proyecto_id||null;
    if(!proyecto_id&&compra_id)proyecto_id=(window.APP?.data?.compras||[]).find(x=>String(x.id)===String(compra_id))?.proyecto_id||null;
    return {fecha:date(get(I.fecha))||new Date().toISOString().slice(0,10),fecha_valor:date(get(I.valor)),tipo:signed>=0?'cobro':'pago',concepto:get(I.concepto)||'Movimiento bancario',total:Math.abs(signed),cuenta:get(I.cuenta)||null,referencia:get(I.ref)||null,categoria:get(I.cat)||null,subcategoria:get(I.sub)||null,proyecto_id,cliente_id,proveedor_id,factura_id,compra_id,conciliado:bool(get(I.estado)),notas:get(I.notas)||null,origen_importacion:'excel_csv'};
  }).filter(x=>x.total>0);
}
function key(x){return [x.fecha,norm(x.concepto),Number(x.total||0).toFixed(2),norm(x.cuenta),norm(x.referencia)].join('|')}
function impact(rows){
  const autoCobros=rows.filter(x=>x.conciliado&&x.tipo==='cobro'&&x.factura_id).length;
  const autoPagos=rows.filter(x=>x.conciliado&&x.tipo==='pago'&&x.compra_id).length;
  const concSinDoc=rows.filter(x=>x.conciliado&&!((x.tipo==='cobro'&&x.factura_id)||(x.tipo==='pago'&&x.compra_id))).length;
  const totals=new Map();
  rows.forEach(x=>{if(!x.conciliado)return;const id=x.tipo==='cobro'?x.factura_id:x.tipo==='pago'?x.compra_id:null;if(!id)return;const k=x.tipo+':'+id;totals.set(k,(totals.get(k)||0)+num(x.total))});
  const excess=[];for(const [k,total] of totals){const [type,id]=k.split(':');const pending=type==='cobro'?invoicePending(id):purchasePending(id);if(total>pending+0.009)excess.push({type,id,total,pending})}
  return {autoCobros,autoPagos,concSinDoc,excess};
}

function open(){
  const client=db();if(!client)return alert('La conexión todavía no está preparada.');
  const root=$('#modal-root');root.innerHTML=`<div class="modal-backdrop"><div class="modal" style="width:min(1120px,97vw)"><div class="modal-head"><div><h2>Importar movimientos bancarios</h2><small style="color:var(--muted)">Pega desde Excel o CSV. Se conservan y vinculan todas las columnas reconocibles.</small></div><div class="grow"></div><button class="btn" type="button" data-bi-close>Cerrar</button></div><form id="bi-form"><div class="modal-body"><div class="notice"><b>Columnas admitidas:</b> Fecha operación · Fecha valor · Concepto banco · Importe (o Debe/Haber) · Cuenta · Categoría · Subcategoría · Proyecto · Cliente/Proveedor · Factura/Compra · Estado conciliación · Notas. Si una fila ya viene conciliada y está vinculada a una factura o compra, el ERP registrará además el cobro o pago real.</div><label style="display:block;font-size:11px;color:var(--muted)">Datos<textarea id="bi-raw" style="display:block;width:100%;min-height:260px;margin-top:6px;padding:10px;border:1px solid var(--line);border-radius:8px" placeholder="Fecha operación\tFecha valor\tConcepto banco\tImporte\tCuenta\tCategoría\tSubcategoría\tProyecto\tCliente/Proveedor\tFactura/Compra\tEstado conciliación\tNotas"></textarea></label><div id="bi-preview" style="margin-top:14px"></div><div id="bi-error"></div></div><div class="modal-foot"><button class="btn" type="button" id="bi-analyze">Analizar</button><button class="btn primary" type="submit">Importar movimientos válidos</button></div></form></div></div>`;
  const close=()=>root.innerHTML='';root.querySelector('[data-bi-close]').onclick=close;let rows=[];
  function preview(){
    rows=parse($('#bi-raw').value);const linked=rows.filter(x=>x.proyecto_id||x.cliente_id||x.proveedor_id||x.factura_id||x.compra_id).length,conc=rows.filter(x=>x.conciliado).length,fx=impact(rows);
    const effects=(fx.autoCobros||fx.autoPagos||fx.concSinDoc)?`<div class="notice" style="margin-top:10px"><b>Efecto al importar:</b> ${fx.autoCobros} cobros reales · ${fx.autoPagos} pagos reales · ${fx.concSinDoc} conciliados solo como clasificación.${fx.excess.length?`<br><b style="color:#8f4d3c">Atención:</b> ${fx.excess.length} documento(s) recibirían un importe conciliado superior a su saldo pendiente.`:''}</div>`:'';
    $('#bi-preview').innerHTML=rows.length?`<div class="grid cols-4"><div class="info"><small>Filas válidas</small><b>${rows.length}</b></div><div class="info"><small>Con vínculo reconocido</small><b>${linked}</b></div><div class="info"><small>Ya conciliadas</small><b>${conc}</b></div><div class="info"><small>Pendientes</small><b>${rows.length-conc}</b></div></div>${effects}<div class="table-wrap" style="margin-top:10px;max-height:300px"><table class="table"><tr><th>Fecha</th><th>Concepto</th><th>Importe</th><th>Proyecto</th><th>Tercero</th><th>Documento</th><th>Estado</th></tr>${rows.slice(0,40).map(x=>`<tr><td>${esc(x.fecha)}</td><td><b>${esc(x.concepto)}</b><br><small>${esc(x.categoria||'')} ${esc(x.subcategoria||'')}</small></td><td>${money((x.tipo==='pago'?-1:1)*x.total)}</td><td>${esc((window.APP?.data?.proyectos||[]).find(p=>String(p.id)===String(x.proyecto_id))?.nombre||'')}</td><td>${esc((window.APP?.data?.clientes||[]).find(p=>String(p.id)===String(x.cliente_id))?.nombre||(window.APP?.data?.proveedores||[]).find(p=>String(p.id)===String(x.proveedor_id))?.nombre||'')}</td><td>${esc((window.APP?.data?.facturas||[]).find(p=>String(p.id)===String(x.factura_id))?.numero||(window.APP?.data?.compras||[]).find(p=>String(p.id)===String(x.compra_id))?.numero_factura||'')}</td><td><span class="badge ${x.conciliado?'good':'warn'}">${x.conciliado?'conciliado':'pendiente'}</span></td></tr>`).join('')}</table></div>`:'<div class="empty">No se han reconocido movimientos.</div>';
  }
  $('#bi-analyze').onclick=preview;
  $('#bi-form').onsubmit=async e=>{
    e.preventDefault();const submit=e.submitter;submit.disabled=true;
    try{
      if(!rows.length)preview();if(!rows.length)throw new Error('No hay filas válidas para importar.');
      const {data:existing,error:e1}=await client.from('movimientos_financieros').select('fecha,concepto,total,cuenta,referencia');if(e1)throw e1;
      const keys=new Set((existing||[]).map(key)),fresh=rows.filter(x=>!keys.has(key(x)));if(!fresh.length)throw new Error('Todos los movimientos parecen estar ya importados.');
      const fx=impact(fresh);if(fx.excess.length&&!confirm(`${fx.excess.length} documento(s) recibirán un cobro/pago superior a su saldo pendiente. ¿Quieres continuar de todos modos?`)){submit.disabled=false;return}
      const ins=await client.from('movimientos_financieros').insert(fresh);if(ins.error)throw ins.error;
      const effects=[];if(fx.autoCobros)effects.push(`${fx.autoCobros} cobro(s) registrados`);if(fx.autoPagos)effects.push(`${fx.autoPagos} pago(s) registrados`);
      alert(`${fresh.length} movimientos importados. ${rows.length-fresh.length} duplicados omitidos.${effects.length?'\n'+effects.join(' · '):''}`);
      close();if(window.reloadIriarte)await window.reloadIriarte();else location.reload();
    }catch(ex){$('#bi-error').innerHTML=`<div class="notice" style="background:#f6dfd7;color:#8f4d3c">${esc(ex.message||ex)}</div>`;submit.disabled=false}
  };
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-action="import-bank"]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();open()},true);
})();

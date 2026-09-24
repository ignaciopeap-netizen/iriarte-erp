// Iriarte ERP V2 · mejoras de Presupuestos inspiradas en la herramienta original
(function(){
  'use strict';
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const money=v=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v||0));
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const num=v=>Number(String(v??0).replace(',','.'))||0;
  let timer;

  function current(){
    const S=window.APP;
    return S?.data?.presupuestos?.find(x=>String(x.id)===String(S?.sel?.budget));
  }
  function lineDesc(x){return x.description||x.desc||''}
  function lineQty(x){return num(x.qty??x.cantidad)}
  function linePrice(x){return num(x.price??x.precio)}
  function lineVat(x){return num(x.vat??x.ivaPct??21)}
  function sectionOrder(p){const out=[],seen=new Set();(p.items||[]).forEach(x=>{const s=(x.section||x.seccion||'Sin sección').trim()||'Sin sección';if(!seen.has(s)){seen.add(s);out.push(s)}});return out}
  function sectionItems(p,s){return (p.items||[]).filter(x=>((x.section||x.seccion||'Sin sección').trim()||'Sin sección')===s)}
  function sectionBase(p,s){return sectionItems(p,s).reduce((a,x)=>a+lineQty(x)*linePrice(x),0)}
  function base(p){return p.kind==='honorarios'?(p.fee_lines||[]).reduce((a,x)=>a+num(x.amount??x.importe),0):(p.items||[]).reduce((a,x)=>a+lineQty(x)*linePrice(x),0)}
  function vat(p){return p.kind==='honorarios'?(p.fee_lines||[]).reduce((a,x)=>a+num(x.amount??x.importe)*num(x.vat??x.ivaPct??21)/100,0):(p.items||[]).reduce((a,x)=>a+lineQty(x)*linePrice(x)*lineVat(x)/100,0)}
  function irpf(p){return p.irpf_enabled?base(p)*num(p.irpf_pct||15)/100:0}

  function buildPrint(p,kind){
    const supplier=kind==='supplier';
    const title=supplier?'SOLICITUD DE PRECIOS A PROVEEDOR':'PRESUPUESTO';
    let body='';
    if(p.kind==='honorarios'){
      body=`${p.intro_text?`<div class="pp-intro">${esc(p.intro_text)}</div>`:''}<table class="pp-table"><thead><tr><th>Concepto</th>${supplier?'':'<th class="right">Importe</th><th>IVA</th>'}</tr></thead><tbody>${(p.fee_lines||[]).map(x=>`<tr><td>${esc(x.description||x.concepto||'')}</td>${supplier?'':`<td class="right">${money(x.amount??x.importe)}</td><td>${num(x.vat??x.ivaPct??21)}%</td>`}</tr>`).join('')}</tbody></table>`;
    }else{
      body=sectionOrder(p).map(sec=>`<section class="pp-section"><h3>${esc(sec)}</h3><table class="pp-table"><thead><tr><th>Cód.</th><th>Ud.</th><th>Descripción</th><th>Ubicación</th><th class="right">Cant.</th>${supplier?'':'<th class="right">Precio ud.</th><th class="right">Importe</th>'}</tr></thead><tbody>${sectionItems(p,sec).map(x=>`<tr><td>${esc(x.code||x.codigo||'')}</td><td>${esc(x.unit||x.unidad||'')}</td><td>${esc(lineDesc(x))}</td><td>${esc(x.location||x.ubicacion||'')}</td><td class="right">${lineQty(x).toLocaleString('es-ES')}</td>${supplier?'':`<td class="right">${money(linePrice(x))}</td><td class="right">${money(lineQty(x)*linePrice(x))}</td>`}</tr>`).join('')}${supplier?'':`<tr class="subtotal"><td colspan="6">Subtotal ${esc(sec)}</td><td class="right">${money(sectionBase(p,sec))}</td></tr>`}</tbody></table></section>`).join('');
    }
    const totals=supplier?'':`<div class="pp-totals"><div><span>Base imponible</span><b>${money(base(p))}</b></div><div><span>IVA</span><b>${money(vat(p))}</b></div>${p.irpf_enabled?`<div><span>Retención IRPF (${num(p.irpf_pct||15)}%)</span><b>− ${money(irpf(p))}</b></div>`:''}<div class="grand"><span>TOTAL</span><b>${money(base(p)+vat(p)-irpf(p))}</b></div></div>`;
    return `<div class="pp-sheet"><header class="pp-head"><div><div class="pp-brand">Sonsoles Pérez Iriarte</div><div class="pp-subbrand">JARDINERÍA Y PAISAJISMO</div></div><div class="pp-meta"><b>${title}</b><br>${esc(p.date||'')}<br>${p.ref?`Ref. ${esc(p.ref)}`:''}</div></header><div class="pp-title"><h1>${esc(p.name||p.nombre||'Presupuesto')}</h1><p>${esc(p.client||'')}<br>${esc(p.address||'')}</p></div>${body}${totals}<footer class="pp-footer">Sonsoles Pérez Iriarte · Jardinería y Paisajismo</footer></div>`;
  }

  function openPrint(kind){
    const p=current();if(!p)return;
    const w=window.open('','_blank');
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${kind==='supplier'?'Proveedor':'Presupuesto'} - ${esc(p.name||p.nombre||'')}</title><style>
      @page{size:A4;margin:16mm 14mm}*{box-sizing:border-box}body{font:12px/1.45 Arial,sans-serif;color:#253020;margin:0}.pp-sheet{max-width:190mm;margin:auto}.pp-head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #cfc8b9;padding-bottom:15px}.pp-brand{font:22px Georgia,serif;color:#3f5a35}.pp-subbrand{font-size:9px;letter-spacing:2px;color:#6d7468;margin-top:3px}.pp-meta{text-align:right;font-size:10px;color:#6d7468}.pp-title h1{font:28px Georgia,serif;font-weight:500;margin:22px 0 4px}.pp-title p{color:#5e665b;margin:0 0 24px}.pp-intro{white-space:pre-wrap;margin:15px 0 22px}.pp-section{margin:0 0 18px;break-inside:avoid}.pp-section h3{font:17px Georgia,serif;color:#3f5a35;border-bottom:1px solid #ded8ca;padding-bottom:5px;margin:0 0 5px}.pp-table{width:100%;border-collapse:collapse}.pp-table th,.pp-table td{padding:7px 5px;border-bottom:1px solid #e8e3d8;vertical-align:top}.pp-table th{font-size:9px;letter-spacing:.5px;color:#6c7368;text-align:left}.right{text-align:right!important}.subtotal td{font-weight:700;background:#faf8f2}.pp-totals{width:280px;margin:24px 0 0 auto}.pp-totals div{display:flex;justify-content:space-between;padding:5px 0}.pp-totals .grand{font:18px Georgia,serif;border-top:1px solid #999;padding-top:9px;margin-top:4px}.pp-footer{margin-top:35px;border-top:1px solid #ded8ca;padding-top:8px;font-size:9px;color:#888;text-align:center}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
    </style></head><body>${buildPrint(p,kind)}<script>window.onload=()=>setTimeout(()=>window.print(),150)<\/script></body></html>`);w.document.close();
  }

  function enhanceEditor(){
    const S=window.APP;if(!S||S.route!=='presupuestos'||S.budgetView!=='edit')return;
    const p=current(),main=$('.budget-content');if(!p||!main||$('#pp-extra-controls'))return;
    const controls=document.createElement('div');controls.id='pp-extra-controls';controls.className='card panel';controls.style.marginTop='14px';
    if(p.kind==='honorarios'){
      controls.innerHTML=`<h3>Documento de honorarios</h3><div class="form-grid"><label class="full">Cláusulas / condiciones<textarea id="pp-clauses">${esc(Array.isArray(p.clausulas)?p.clausulas.map(x=>x.texto||x).join('\n'):p.clausulas||'')}</textarea></label><label class="full">Resumen de dirección de obra<textarea id="pp-direction">${esc(p.direccion_resumen||'')}</textarea></label></div><div class="toolbar"><button class="btn" data-pp-client>Vista/PDF cliente</button><button class="btn" data-pp-supplier>Documento proveedor</button></div>`;
      controls.querySelector('#pp-clauses').oninput=e=>p.clausulas=e.target.value.split(/\n+/).filter(Boolean).map(texto=>({texto}));
      controls.querySelector('#pp-direction').oninput=e=>p.direccion_resumen=e.target.value;
    }else{
      controls.innerHTML=`<h3>Opciones del presupuesto</h3><div class="form-grid"><label>Aplicar IRPF<select id="pp-irpf-enabled"><option value="false" ${p.irpf_enabled?'':'selected'}>No</option><option value="true" ${p.irpf_enabled?'selected':''}>Sí</option></select></label><label>IRPF %<input id="pp-irpf-pct" type="number" step="0.01" value="${num(p.irpf_pct||15)}"></label></div><div class="toolbar"><button class="btn" data-pp-client>Vista/PDF cliente</button><button class="btn" data-pp-supplier>Documento proveedor</button></div>`;
      controls.querySelector('#pp-irpf-enabled').onchange=e=>{p.irpf_enabled=e.target.value==='true';updateSummary(p)};
      controls.querySelector('#pp-irpf-pct').oninput=e=>{p.irpf_pct=num(e.target.value);updateSummary(p)};
    }
    main.appendChild(controls);
    controls.querySelector('[data-pp-client]').onclick=()=>openPrint('client');
    controls.querySelector('[data-pp-supplier]').onclick=()=>openPrint('supplier');
    addSectionSummary(p);
  }

  function addSectionSummary(p){
    if(p.kind==='honorarios'||!sectionOrder(p).length)return;
    const main=$('.budget-content');if(!main||$('#pp-section-summary'))return;
    const card=document.createElement('div');card.id='pp-section-summary';card.className='card panel';card.style.marginTop='14px';
    card.innerHTML=`<h3>Resumen por secciones</h3><table class="table"><tr><th>Sección</th><th class="right">Base</th></tr>${sectionOrder(p).map(s=>`<tr><td>${esc(s)}</td><td class="right"><b>${money(sectionBase(p,s))}</b></td></tr>`).join('')}</table>`;
    main.appendChild(card);
  }

  function updateSummary(p){
    const s=$('.budget-summary');if(!s)return;
    s.innerHTML=`<h3 style="font:20px Georgia,serif;margin-top:0">Resumen</h3><div class="info"><small>Base imponible</small><b>${money(base(p))}</b></div><div style="height:8px"></div><div class="info"><small>IVA</small><b>${money(vat(p))}</b></div>${p.irpf_enabled?`<div style="height:8px"></div><div class="info"><small>IRPF</small><b>− ${money(irpf(p))}</b></div>`:''}<div style="font:26px Georgia,serif;margin-top:16px">${money(base(p)+vat(p)-irpf(p))}</div>`;
  }

  function enhanceViews(){
    const S=window.APP;if(!S||S.route!=='presupuestos')return;
    if(S.budgetView==='client'||S.budgetView==='supplier'){
      const p=current(),area=$('.budget-content');if(!p||!area||$('#pp-print-actions'))return;
      const actions=document.createElement('div');actions.id='pp-print-actions';actions.className='toolbar no-print';actions.style.marginTop='12px';actions.innerHTML=`<button class="btn primary" data-pp-print>${S.budgetView==='supplier'?'Imprimir PDF proveedor':'Imprimir PDF cliente'}</button>`;area.appendChild(actions);actions.querySelector('[data-pp-print]').onclick=()=>openPrint(S.budgetView);
    }
  }

  function enhance(){clearTimeout(timer);timer=setTimeout(()=>{enhanceEditor();enhanceViews()},50)}
  new MutationObserver(enhance).observe(document.body,{subtree:true,childList:true});
  window.addEventListener('hashchange',enhance);window.addEventListener('load',enhance);
})();

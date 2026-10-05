// Iriarte ERP V2 · mejoras de Presupuestos inspiradas en la herramienta original
(function(){
  'use strict';
  const $=s=>document.querySelector(s);
  const money=v=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v||0));
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const num=v=>Number(String(v??0).replace(',','.'))||0;
  let timer;
  const supplierSelections=new Map();
  function selectedSections(p){return supplierSelections.get(String(p.id))||new Set()}
  function supplierBudget(p){const selected=selectedSections(p);return {...p,items:(p.items||[]).filter(x=>selected.has((x.section||x.seccion||'Sin sección').trim()||'Sin sección'))}}
  window.iriarteSupplierBudget=supplierBudget;

  function current(){const S=window.APP;return S?.data?.presupuestos?.find(x=>String(x.id)===String(S?.sel?.budget))}
  function projectFor(p){return (window.APP?.data?.proyectos||[]).find(x=>String(x.id)===String(p?.proyecto_id))||null}
  function clientFor(p){return (window.APP?.data?.clientes||[]).find(x=>String(x.id)===String(p?.cliente_id))||null}
  function lineDesc(x){return x.description||x.desc||x.descripcion||''}
  function lineQty(x){return num(x.qty??x.cantidad)}
  function linePrice(x){return num(x.price??x.precio)}
  function lineVat(x){return num(x.vat??x.ivaPct??21)}
  function sectionOrder(p){const out=[],seen=new Set();(p.items||[]).forEach(x=>{const s=(x.section||x.seccion||'Sin sección').trim()||'Sin sección';if(!seen.has(s)){seen.add(s);out.push(s)}});return out}
  function sectionItems(p,s){return (p.items||[]).filter(x=>((x.section||x.seccion||'Sin sección').trim()||'Sin sección')===s)}
  function sectionBase(p,s){return sectionItems(p,s).reduce((a,x)=>a+lineQty(x)*linePrice(x),0)}
  function sectionVat(p,s){return sectionItems(p,s).reduce((a,x)=>a+lineQty(x)*linePrice(x)*lineVat(x)/100,0)}
  function base(p){return p.kind==='honorarios'?(p.fee_lines||[]).reduce((a,x)=>a+num(x.amount??x.importe),0):(p.items||[]).reduce((a,x)=>a+lineQty(x)*linePrice(x),0)}
  function vat(p){return p.kind==='honorarios'?(p.fee_lines||[]).reduce((a,x)=>a+num(x.amount??x.importe)*num(x.vat??x.ivaPct??21)/100,0):(p.items||[]).reduce((a,x)=>a+lineQty(x)*linePrice(x)*lineVat(x)/100,0)}
  function irpf(p){return p.irpf_enabled?base(p)*num(p.irpf_pct||15)/100:0}
  function vatByRate(p){const out={};if(p.kind==='honorarios'){(p.fee_lines||[]).forEach(x=>{const r=num(x.vat??x.ivaPct??21),b=num(x.amount??x.importe);out[r]=(out[r]||0)+b*r/100})}else{(p.items||[]).forEach(x=>{const r=lineVat(x),b=lineQty(x)*linePrice(x);out[r]=(out[r]||0)+b*r/100})}return out}
  function phaseNumber(p){const raw=String(p.fase||p.phase_number||p.ref||p.numero||'');return raw.match(/(?:pres\.?|fase\s*)?(\d+)$/i)?.[1]||p.fase||'1'}
  function dateText(p){return p.fecha||p.date||''}
  function injectStyles(){if($('#pp-document-styles'))return;const s=document.createElement('style');s.id='pp-document-styles';s.textContent=`
    .budget-layout.pp-document-mode{grid-template-columns:250px minmax(0,1fr)}.budget-layout.pp-document-mode .budget-summary{display:none}.budget-layout.pp-document-mode .budget-main{min-width:0}
    .pp-actions{display:flex;justify-content:flex-end;gap:8px;margin:0 0 12px}.pp-sheet{background:#fff;max-width:980px;margin:0 auto;padding:32px 42px;border:1px solid #ddd6c8;box-shadow:0 8px 24px rgba(32,38,30,.05);color:#283126}.pp-head{display:flex;justify-content:space-between;gap:28px;align-items:flex-start;border-bottom:2px solid #415638;padding-bottom:20px}.pp-logo{width:230px;max-height:100px;object-fit:contain;object-position:left top}.pp-brand{font:26px Georgia,serif;color:#315b35}.pp-subbrand{font-size:10px;letter-spacing:1.4px;color:#3d6d44;margin-top:3px}.pp-doc-title{text-align:right;margin-left:auto}.pp-doc-title h1{font:27px Georgia,serif;margin:0;color:#283522}.pp-doc-title p{margin:4px 0 0;color:#74796f;font-size:12px}.pp-meta-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px 28px;padding:18px 0;border-bottom:1px solid #d9d1c2}.pp-meta-grid small{display:block;color:#777c73;font-size:10px;margin-bottom:2px}.pp-meta-grid b{font-size:13px;font-weight:500}.pp-intro{white-space:pre-wrap;margin:16px 0 22px}.pp-section{margin:18px 0 0}.pp-section h3{font:18px Georgia,serif;color:#34462d;border-bottom:1.5px solid #415638;padding-bottom:6px;margin:0 0 3px}.pp-table{width:100%;border-collapse:collapse;table-layout:fixed}.pp-table th,.pp-table td{padding:8px 5px;border-bottom:1px solid #ded7c9;vertical-align:top;font-size:11px}.pp-table th{font-size:9px;color:#666d63;text-align:left;font-weight:600}.pp-table .right{text-align:right}.pp-table .location{font-style:italic;color:#646b60}.pp-table .subtotal td{font-weight:700;border-top:1px solid #aaa394;background:#fbfaf7}.pp-totals{width:min(430px,100%);margin:26px 0 0 auto;border-top:1px solid #87917f;padding-top:7px}.pp-totals>div{display:flex;justify-content:space-between;gap:25px;padding:5px 0}.pp-totals .grand{font:21px Georgia,serif;font-weight:700;border-top:1px solid #d6d0c4;margin-top:5px;padding-top:10px}.pp-footer{margin-top:30px;border-top:1px solid #ded8ca;padding-top:8px;font-size:9px;color:#888;text-align:center}.pp-empty{padding:30px;text-align:center;color:#777}.pp-sheet-supplier .pp-table th,.pp-sheet-supplier .pp-table td{font-size:11.5px}
    @media(max-width:900px){.budget-layout.pp-document-mode{grid-template-columns:1fr}.budget-layout.pp-document-mode .budget-sidebar{display:none}.pp-sheet{padding:22px 16px;overflow:auto}.pp-head{display:block}.pp-doc-title{text-align:left;margin-top:15px}.pp-meta-grid{grid-template-columns:1fr 1fr}.pp-table{min-width:760px}}
  `;document.head.appendChild(s)}

  function brandHtml(){const logo=window.IRIARTE_LOGO_DATA_URI;return logo?`<img class="pp-logo" src="${logo}" alt="Sonsoles Pérez Iriarte">`:`<div><div class="pp-brand">Sonsoles Pérez Iriarte</div><div class="pp-subbrand">JARDINERÍA Y PAISAJISMO</div></div>`}
  function buildPrint(p,kind){
    const supplier=kind==='supplier';if(supplier)p=supplierBudget(p);
    const pr=projectFor(p),cl=clientFor(p),sections=sectionOrder(p),subtitle=supplier?`${pr?.nombre||p.name||p.nombre||''}${sections.length?' — '+sections.join(', '):''}`:'Presupuesto de jardinería y paisajismo';
    let body='';
    if(p.kind==='honorarios'){
      body=`${p.intro_text?`<div class="pp-intro">${esc(p.intro_text)}</div>`:''}<section class="pp-section"><h3>Honorarios</h3><table class="pp-table"><thead><tr><th>Concepto</th>${supplier?'':'<th class="right">Importe</th><th class="right">IVA</th><th class="right">Total c/IVA</th>'}</tr></thead><tbody>${(p.fee_lines||[]).map(x=>{const amount=num(x.amount??x.importe),rate=num(x.vat??x.ivaPct??21);return `<tr><td>${esc(x.description||x.concepto||'')}</td>${supplier?'':`<td class="right">${money(amount)}</td><td class="right">${rate}%</td><td class="right"><b>${money(amount*(1+rate/100))}</b></td>`}</tr>`}).join('')}</tbody></table></section>`;
    }else{
      body=sections.map(sec=>{const sb=sectionBase(p,sec),sv=sectionVat(p,sec);return `<section class="pp-section"><h3>${esc(sec)}</h3><table class="pp-table"><thead><tr><th style="width:5%">Cód.</th><th style="width:4%">Ud.</th><th>Descripción</th><th style="width:13%">Ubicación</th><th class="right" style="width:7%">Unidades</th>${supplier?'':`<th class="right" style="width:10%">Precio ud.</th><th class="right" style="width:12%">Base imponible</th><th class="right" style="width:5%">IVA</th><th class="right" style="width:12%">Total c/IVA</th>`}</tr></thead><tbody>${sectionItems(p,sec).map(x=>{const q=lineQty(x),price=linePrice(x),rate=lineVat(x),b=q*price;return `<tr><td>${esc(x.code||x.codigo||'')}</td><td>${esc(x.unit||x.unidad||'')}</td><td>${esc(lineDesc(x))}</td><td class="location">${esc(x.location||x.ubicacion||'')}</td><td class="right">${q.toLocaleString('es-ES',{maximumFractionDigits:3})}</td>${supplier?'':`<td class="right">${money(price)}</td><td class="right">${money(b)}</td><td class="right">${rate.toLocaleString('es-ES',{maximumFractionDigits:2})}%</td><td class="right"><b>${money(b*(1+rate/100))}</b></td>`}</tr>`}).join('')}${supplier?'':`<tr class="subtotal"><td colspan="6">Subtotal ${esc(sec)}</td><td class="right">${money(sb)}</td><td></td><td class="right">${money(sb+sv)}</td></tr>`}</tbody></table></section>`}).join('');
    }
    if(!body)body=`<div class="pp-empty">${supplier?'Selecciona al menos una sección arriba para generar el listado.':'Este presupuesto todavía no tiene líneas.'}</div>`;
    const rates=vatByRate(p),totals=supplier?'':`<div class="pp-totals"><div><span>Base imponible</span><b>${money(base(p))}</b></div>${Object.entries(rates).sort((a,b)=>Number(a[0])-Number(b[0])).map(([rate,val])=>`<div><span>IVA (${esc(rate)}%)</span><b>${money(val)}</b></div>`).join('')}${p.irpf_enabled?`<div><span>Retención IRPF (${num(p.irpf_pct||15)}%)</span><b>− ${money(irpf(p))}</b></div>`:''}<div class="grand"><span>Total</span><b>${money(base(p)+vat(p)-irpf(p))}</b></div></div>`;
    const meta=supplier?`<div><small>Proyecto</small><b>${esc(pr?.nombre||p.name||p.nombre||'—')}</b></div><div><small>Fecha</small><b>${esc(dateText(p))}</b></div><div><small>Ref.</small><b>${esc(p.ref||p.numero||pr?.codigo||'—')}</b></div>`:`<div><small>Cliente</small><b>${esc(cl?.nombre||p.client||'—')}</b></div><div><small>Dirección</small><b>${esc(pr?.direccion||p.address||cl?.direccion||'—')}</b></div><div><small>Fecha</small><b>${esc(dateText(p))}</b></div><div><small>Ref. proyecto</small><b>${esc(p.ref||p.numero||pr?.codigo||'—')}</b></div><div><small>Fase</small><b>${esc(phaseNumber(p))}</b></div>`;
    const footer=supplier?'Listado sin precios — Estudio de Jardinería y Paisajismo Sonsoles Pérez Iriarte.':'Estudio de Jardinería y Paisajismo Sonsoles Pérez Iriarte';
    return `<div class="pp-sheet ${supplier?'pp-sheet-supplier':''}"><header class="pp-head">${brandHtml()}<div class="pp-doc-title"><h1>${supplier?'Solicitud de precios a proveedor':esc(pr?.nombre||p.name||p.nombre||'Presupuesto')}</h1><p>${esc(subtitle)}</p></div></header><div class="pp-meta-grid">${meta}</div>${body}${totals}<footer class="pp-footer">${footer}</footer></div>`;
  }

  function printCss(){return `@page{size:A4;margin:13mm 11mm}*{box-sizing:border-box}body{font:11px/1.35 Arial,sans-serif;color:#283126;margin:0}.pp-sheet{max-width:190mm;margin:auto;color:#283126}.pp-head{display:flex;justify-content:space-between;gap:25px;align-items:flex-start;border-bottom:2px solid #415638;padding-bottom:15px}.pp-logo{width:58mm;max-height:27mm;object-fit:contain;object-position:left top}.pp-brand{font:25px Georgia,serif;color:#315b35}.pp-subbrand{font-size:9px;letter-spacing:1.4px;color:#3d6d44}.pp-doc-title{text-align:right;margin-left:auto}.pp-doc-title h1{font:22px Georgia,serif;margin:6px 0 0;color:#283522}.pp-doc-title p{margin:4px 0 0;color:#74796f;font-size:10px;max-width:115mm}.pp-meta-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px 25px;padding:13px 0;border-bottom:1px solid #d9d1c2}.pp-meta-grid small{display:block;color:#777c73;font-size:8.5px}.pp-meta-grid b{font-size:11px;font-weight:500}.pp-intro{white-space:pre-wrap;margin:13px 0 18px}.pp-section{margin:13px 0 0;break-inside:auto;page-break-inside:auto}.pp-section h3{font:15px Georgia,serif;color:#34462d;border-bottom:1.5px solid #415638;padding-bottom:4px;margin:0 0 2px;break-after:avoid;page-break-after:avoid}.pp-table{width:100%;border-collapse:collapse;table-layout:fixed;break-inside:auto;page-break-inside:auto}.pp-table thead{display:table-header-group}.pp-table tr{break-inside:avoid;page-break-inside:avoid}.pp-table th,.pp-table td{padding:5px 3px;border-bottom:1px solid #ded7c9;vertical-align:top;font-size:9px}.pp-table th{font-size:7.5px;color:#666d63;text-align:left}.right{text-align:right!important}.location{font-style:italic;color:#646b60}.subtotal td{font-weight:700;border-top:1px solid #aaa394}.pp-totals{width:78mm;margin:18px 0 0 auto;border-top:1px solid #87917f;padding-top:5px;break-inside:avoid;page-break-inside:avoid}.pp-totals>div{display:flex;justify-content:space-between;padding:3px 0}.pp-totals .grand{font:16px Georgia,serif;font-weight:700;border-top:1px solid #d6d0c4;margin-top:4px;padding-top:7px}.pp-footer{margin-top:20px;border-top:1px solid #ded8ca;padding-top:6px;font-size:7px;color:#888;text-align:center;break-inside:avoid;page-break-inside:avoid}.pp-empty{padding:25px;text-align:center;color:#777}`}
  function openPrint(kind){
    const p=current();if(!p)return;
    const w=window.open('','_blank');if(!w){alert('El navegador ha bloqueado la ventana de impresión. Permite ventanas emergentes para generar el PDF.');return}
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${kind==='supplier'?'Solicitud precios':'Presupuesto'} - ${esc(p.name||p.nombre||'')}</title><style>${printCss()}</style></head><body>${buildPrint(p,kind)}<script>window.onload=()=>setTimeout(()=>window.print(),180)<\/script></body></html>`);w.document.close();
  }

  function enhanceEditor(){
    const S=window.APP;if(!S||S.route!=='presupuestos'||S.budgetView!=='edit')return;
    const layout=$('.budget-layout');if(layout)layout.classList.remove('pp-document-mode');
    const p=current(),main=$('.budget-content');if(!p||!main||$('#pp-extra-controls'))return;
    const controls=document.createElement('div');controls.id='pp-extra-controls';controls.className='card panel';controls.style.marginTop='14px';
    if(p.kind==='honorarios'){
      controls.innerHTML=`<h3>Documento de honorarios</h3><div class="form-grid"><label class="full">Cláusulas / condiciones<textarea id="pp-clauses">${esc(Array.isArray(p.clausulas)?p.clausulas.map(x=>x.texto||x).join('\n'):p.clausulas||'')}</textarea></label><label class="full">Resumen de dirección de obra<textarea id="pp-direction">${esc(p.direccion_resumen||'')}</textarea></label></div><p style="margin:10px 0 0;color:var(--muted);font-size:11px">Las salidas para cliente y proveedor se revisan desde sus pestañas superiores.</p>`;
      controls.querySelector('#pp-clauses').oninput=e=>p.clausulas=e.target.value.split(/\n+/).filter(Boolean).map(texto=>({texto}));
      controls.querySelector('#pp-direction').oninput=e=>p.direccion_resumen=e.target.value;
    }else{
      controls.innerHTML=`<div class="budget-tax-options"><label><input id="pp-irpf-enabled" type="checkbox" ${p.irpf_enabled?'checked':''}> Aplicar retención IRPF</label><label>IRPF % <input id="pp-irpf-pct" type="number" min="0" max="100" step="0.01" value="${num(p.irpf_pct||15)}"></label></div>`;
      controls.querySelector('#pp-irpf-enabled').onchange=e=>{p.irpf_enabled=e.target.checked;updateSummary(p)};
      controls.querySelector('#pp-irpf-pct').oninput=e=>{p.irpf_pct=num(e.target.value);updateSummary(p)};
    }
    main.appendChild(controls);addSectionSummary(p);
  }

  function addSectionSummary(p){
    if(p.kind==='honorarios'||!sectionOrder(p).length)return;
    const main=$('.budget-content');if(!main||$('#pp-section-summary'))return;
    const card=document.createElement('div');card.id='pp-section-summary';card.className='card panel';card.style.marginTop='14px';
    card.innerHTML=`<h3>Resumen por secciones</h3><table class="table"><tr><th>Sección</th><th class="right">Base</th></tr>${sectionOrder(p).map(s=>`<tr><td>${esc(s)}</td><td class="right"><b>${money(sectionBase(p,s))}</b></td></tr>`).join('')}</table>`;
    main.appendChild(card);
  }

  function updateSummary(p){
    const s=$('.budget-summary');if(s&&window.iriarteBudgetSummary)s.innerHTML=window.iriarteBudgetSummary(p);
  }

  function enhanceViews(){
    const S=window.APP;if(!S||S.route!=='presupuestos')return;
    const layout=$('.budget-layout');
    if(S.budgetView!=='client'&&S.budgetView!=='supplier'){if(layout)layout.classList.remove('pp-document-mode');return}
    const p=current(),area=$('.budget-content');if(!p||!area||area.dataset.ppDocument===S.budgetView+':'+p.id)return;
    injectStyles();if(layout)layout.classList.add('pp-document-mode');
    const supplier=S.budgetView==='supplier';
    const selector=supplier?`<fieldset class="supplier-sections no-print"><legend>Elige las secciones que vas a enviar al proveedor — sin precios</legend>${sectionOrder(p).map((sec,i)=>`<label><input type="checkbox" data-supplier-section="${i}" ${selectedSections(p).has(sec)?'checked':''}>${esc(sec)}</label>`).join('')}</fieldset>`:'';
    area.dataset.ppDocument=S.budgetView+':'+p.id;area.innerHTML=`${selector}<div id="pp-print-actions" class="pp-actions no-print"><button class="btn" data-pp-print>Imprimir / Guardar PDF</button></div>${buildPrint(p,S.budgetView)}`;area.querySelector('[data-pp-print]').onclick=()=>openPrint(S.budgetView);
    area.querySelectorAll('[data-supplier-section]').forEach(input=>input.onchange=()=>{const selected=new Set(selectedSections(p)),sec=sectionOrder(p)[Number(input.dataset.supplierSection)];if(input.checked)selected.add(sec);else selected.delete(sec);supplierSelections.set(String(p.id),selected);area.querySelector('.pp-sheet').outerHTML=buildPrint(p,'supplier')});
  }

  function enhance(){clearTimeout(timer);timer=setTimeout(()=>{injectStyles();enhanceEditor();enhanceViews()},50)}
  new MutationObserver(enhance).observe(document.body,{subtree:true,childList:true});
  window.addEventListener('hashchange',enhance);window.addEventListener('load',enhance);
})();

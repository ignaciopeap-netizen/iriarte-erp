// Iriarte ERP V2 · ergonomía del editor de presupuestos
(function(){
'use strict';
const db=()=>window.__iriarteDb;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const num=v=>Number(String(v??0).replace(',','.'))||0;
const money=v=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(num(v));
let timer,showArchived=false;
function current(){const A=window.APP;return A?.data?.presupuestos?.find(x=>String(x.id)===String(A?.sel?.budget))||null}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function refreshSelected(id,focusLast=false){setTimeout(()=>{const item=document.querySelector(`[data-budget-item="${CSS.escape(String(id))}"]`);if(item)item.click();if(focusLast)setTimeout(()=>{const lines=$$('[data-line]');lines.at(-1)?.querySelector('[data-k="description"]')?.focus()},30)},10)}
function nextUnarchived(){return (window.APP?.data?.presupuestos||[]).find(x=>!x.archived&&(x.kind||'obra')===(window.APP?.budgetKind||'obra'))||null}
function lineBase(x){return num(x?.qty??x?.cantidad)*num(x?.price??x?.precio)}
function lineVat(x){return num(x?.vat??x?.ivaPct??21)}
function sectionName(x){return String(x?.section??x?.seccion??'').trim()||'Sin sección'}
function sectionOrder(p){const out=[],seen=new Set();(p.items||[]).forEach(x=>{const s=sectionName(x);if(!seen.has(s)){seen.add(s);out.push(s)}});return out}
function sectionRows(p,name){return (p.items||[]).map((x,i)=>({x,i})).filter(r=>sectionName(r.x)===name)}
function sectionTotals(p,name){const rows=sectionRows(p,name);return {base:rows.reduce((a,r)=>a+lineBase(r.x),0),total:rows.reduce((a,r)=>a+lineBase(r.x)*(1+lineVat(r.x)/100),0)}}
function projectFor(p){return (window.APP?.data?.proyectos||[]).find(x=>String(x.id)===String(p?.proyecto_id))||null}

function injectStyles(){if($('#budget-work-styles'))return;const s=document.createElement('style');s.id='budget-work-styles';s.textContent=`
.budget-work-project{grid-column:span 1}.budget-meta.budget-meta-labelled{grid-template-columns:repeat(3,minmax(0,1fr));align-items:end}.budget-meta-field{min-width:0}.budget-meta-field small{display:block;color:var(--muted);font-size:10px;margin:0 0 4px 2px}.budget-meta-field input,.budget-meta-field select{width:100%}.budget-meta-field input:disabled,.budget-meta-field select:disabled{background:#f3f1eb;color:#545a51}.budget-work-top-actions{display:flex;gap:8px;flex-wrap:wrap;margin:4px 0 12px}.budget-work-groups{min-width:930px}.budget-work-scroll{overflow:auto}.budget-line-head.budget-work-head,.budget-line.budget-work-line{grid-template-columns:64px 125px minmax(210px,1fr) 125px 48px 64px 82px 58px 98px 105px 38px 38px;gap:5px}.budget-line-head.budget-work-head{padding:7px 0 5px;border-bottom:1px solid #d9d3c7;position:sticky;top:0;background:var(--paper);z-index:2}.budget-line.budget-work-line{margin-bottom:5px}.budget-line.budget-work-line input{padding:7px}.budget-line-calc{font-size:11px;text-align:right;white-space:nowrap;padding:7px 2px;color:#41483f}.budget-line-calc.total{font-weight:700;color:#253120}.budget-section-block{margin:9px 0 15px}.budget-section-title{display:flex;align-items:center;gap:12px;border-bottom:2px solid #526749;padding:7px 2px 6px;margin-bottom:6px}.budget-section-title strong{font:17px Georgia,serif;color:#30452b}.budget-section-title .grow{flex:1}.budget-section-title span{font-size:10px;color:var(--muted);white-space:nowrap}.budget-section-title b{color:#354a30;font-size:11px}.budget-side-sections{border-top:1px solid var(--line);margin-top:16px;padding-top:12px}.budget-side-sections h4{font:15px Georgia,serif;margin:0 0 8px}.budget-side-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;padding:6px 0;border-bottom:1px solid #ece6da;font-size:11px}.budget-side-row small{color:var(--muted)}.budget-side-row b{text-align:right}.budget-side-row .sub{font-size:9px;color:var(--muted);display:block}.budget-content #pp-section-summary{display:none!important}.budget-content #pp-extra-controls{box-shadow:none;margin:0 0 12px!important}.budget-content #pp-extra-controls h3{margin-top:0}.budget-content .toolbar[data-budget-bottom]{margin-top:14px}.budget-content .btn[data-budget-dup-line]{padding-left:8px;padding-right:8px}
@media(max-width:1150px){.budget-meta.budget-meta-labelled{grid-template-columns:repeat(2,minmax(0,1fr))}.budget-work-groups{min-width:900px}}
@media(max-width:760px){.budget-meta.budget-meta-labelled{grid-template-columns:1fr}.budget-work-project{grid-column:auto}}
`;document.head.appendChild(s)}

async function duplicateBudget(){
 const p=current(),client=db();if(!p||!client)return;
 const pr=projectFor(p),sameProject=!!p.proyecto_id,count=(window.APP?.data?.presupuestos||[]).filter(x=>sameProject&&String(x.proyecto_id)===String(p.proyecto_id)).length+1;
 const ref=sameProject&&pr?.codigo?`${pr.codigo}-Pres.${count}`:null;
 const row={
  nombre:`${p.name||p.nombre||'Presupuesto'} (copia)`,name:`${p.name||p.nombre||'Presupuesto'} (copia)`,
  kind:p.kind||'obra',cliente_id:p.cliente_id||null,proyecto_id:p.proyecto_id||null,fecha:new Date().toISOString().slice(0,10),date:new Date().toISOString().slice(0,10),
  numero:ref,ref,client:p.client||null,address:p.address||null,phase:'Borrador',estado:'borrador',status:'Borrador',archived:false,
  irpf_enabled:!!p.irpf_enabled,irpf_pct:Number(p.irpf_pct||0),items:structuredClone(p.items||[]),
  intro_text:p.intro_text||'',zonas:structuredClone(p.zonas||[]),scope_items:structuredClone(p.scope_items||[]),redaccion_toggle:p.redaccion_toggle!==false,
  redaccion_texto:p.redaccion_texto||'',fases_obra:structuredClone(p.fases_obra||[]),direccion_resumen:p.direccion_resumen||'',
  fee_lines:structuredClone(p.fee_lines||[]),clausulas:structuredClone(p.clausulas||[]),base:0,total:0
 };
 try{
   const {data,error}=await client.from('presupuestos').insert(row).select('id').single();if(error)throw error;
   if(window.reloadIriarte)await window.reloadIriarte();
   window.APP.sel.budget=data.id;refreshSelected(data.id);
 }catch(err){alert('No se pudo duplicar el presupuesto:\n'+(err.message||err))}
}
async function archiveBudget(){
 const p=current(),client=db();if(!p||!client)return;
 if(!confirm(`¿Archivar “${p.name||p.nombre||'este presupuesto'}”? No se borrará y podrás volver a mostrarlo.`))return;
 try{
   const {error}=await client.from('presupuestos').update({archived:true}).eq('id',p.id);if(error)throw error;
   p.archived=true;
   const next=nextUnarchived();window.APP.sel.budget=next?.id||'';
   if(window.reloadIriarte)await window.reloadIriarte();
   if(next)refreshSelected(next.id);
 }catch(err){alert('No se pudo archivar el presupuesto:\n'+(err.message||err))}
}
async function restoreBudget(id){
 const client=db();if(!client||!id)return;const {error}=await client.from('presupuestos').update({archived:false}).eq('id',id);if(error)return alert(error.message);
 if(window.reloadIriarte)await window.reloadIriarte();window.APP.sel.budget=id;refreshSelected(id);
}
function duplicateLine(index){
 const p=current();if(!p)return;p.items=p.items||[];const src=p.items[index];if(!src)return;
 p.items.splice(index+1,0,structuredClone(src));refreshSelected(p.id);
}
function addLineAfter(index){
 const p=current();if(!p)return;p.items=p.items||[];p.items.splice(index+1,0,{code:'',section:p.items[index]?.section||p.items[index]?.seccion||'',description:'',location:p.items[index]?.location||p.items[index]?.ubicacion||'',unit:p.items[index]?.unit||p.items[index]?.unidad||'ud',qty:1,price:0,vat:p.items[index]?.vat??p.items[index]?.ivaPct??21});
 refreshSelected(p.id,true);
}

function enhanceMeta(p){
 const meta=$('.budget-meta');if(!meta||meta.dataset.workLabels==='1')return;meta.dataset.workLabels='1';meta.classList.add('budget-meta-labelled');
 const children=[...meta.children],labels=['Presupuesto','Cliente','Contacto','Fecha','Dirección','Ref. proyecto','Estado / fase'];
 children.forEach((el,i)=>{const w=document.createElement('label');w.className='budget-meta-field';w.innerHTML=`<small>${labels[i]||'Dato'}</small>`;el.before(w);w.appendChild(el)});
 const pr=projectFor(p),projectWrap=document.createElement('label');projectWrap.className='budget-meta-field budget-work-project';projectWrap.innerHTML=`<small>Proyecto</small><input type="text" disabled value="${esc(pr?.nombre||'Sin proyecto vinculado')}">`;meta.prepend(projectWrap);
 const client=meta.querySelector('[data-budget-client]');if(client&&p.proyecto_id){client.disabled=true;client.title='El cliente viene determinado por el proyecto vinculado'}
}
function enhanceToolbar(){
 const content=$('.budget-content'),toolbar=[...content?.querySelectorAll('.toolbar')||[]].find(x=>x.querySelector('[data-action="paste-budget"]'));if(!content||!toolbar)return;
 toolbar.dataset.budgetBottom='1';const paste=toolbar.querySelector('[data-action="paste-budget"]');if(paste&&!content.querySelector('.budget-work-top-actions')){const top=document.createElement('div');top.className='budget-work-top-actions no-print';paste.textContent='Importar líneas (pegar desde Excel)';top.appendChild(paste);const meta=$('.budget-meta');if(meta)meta.after(top);else content.prepend(top)}
}
function enhanceOptionsPosition(){const content=$('.budget-content'),extra=$('#pp-extra-controls'),top=$('.budget-work-top-actions');if(content&&extra&&top&&extra.previousElementSibling!==top)top.after(extra)}
function decorateRows(p){
 const content=$('.budget-content'),head=$('.budget-line-head'),rows=$$('[data-line]'),toolbar=[...content?.querySelectorAll('.toolbar')||[]].find(x=>x.querySelector('[data-action="save-budget"]'));if(!content||!head||!toolbar)return;
 let scroll=$('.budget-work-scroll');if(!scroll){scroll=document.createElement('div');scroll.className='budget-work-scroll';const groups=document.createElement('div');groups.className='budget-work-groups';scroll.appendChild(groups);toolbar.before(scroll)}const groups=scroll.querySelector('.budget-work-groups');
 head.classList.add('budget-work-head');head.innerHTML='<b>Código</b><b>Sección</b><b>Descripción</b><b>Ubicación</b><b>Ud.</b><b>Cant.</b><b>Precio</b><b>IVA</b><b style="text-align:right">Base imponible</b><b style="text-align:right">Total c/IVA</b><span></span><span></span>';groups.appendChild(head);
 rows.forEach(row=>{
   row.classList.add('budget-work-line');const i=Number(row.dataset.line),remove=row.querySelector('[data-remove-line]');if(!remove)return;
   let baseCell=row.querySelector('[data-budget-line-base]');if(!baseCell){baseCell=document.createElement('span');baseCell.className='budget-line-calc';baseCell.dataset.budgetLineBase='1';remove.before(baseCell)}
   let totalCell=row.querySelector('[data-budget-line-total]');if(!totalCell){totalCell=document.createElement('span');totalCell.className='budget-line-calc total';totalCell.dataset.budgetLineTotal='1';remove.before(totalCell)}
   if(!row.querySelector('[data-budget-dup-line]')){const b=document.createElement('button');b.type='button';b.className='btn';b.textContent='⧉';b.title='Duplicar línea';b.dataset.budgetDupLine=String(i);remove.before(b)}
   row.querySelectorAll('input').forEach(input=>{if(input.dataset.budgetKeysBound)return;input.dataset.budgetKeysBound='1';input.addEventListener('input',()=>refreshWorkTotals(p));input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.ctrlKey&&!e.altKey){e.preventDefault();input.dispatchEvent(new Event('input',{bubbles:true}));addLineAfter(Number(row.dataset.line))}})});
   const sec=row.querySelector('[data-k="section"]');if(sec&&!sec.dataset.sectionRegroup){sec.dataset.sectionRegroup='1';sec.addEventListener('change',()=>refreshSelected(p.id))}
 });
 groups.querySelectorAll('.budget-section-block').forEach(x=>x.remove());
 const order=sectionOrder(p);
 order.forEach(name=>{const block=document.createElement('section');block.className='budget-section-block';block.dataset.sectionName=name;const totals=sectionTotals(p,name);block.innerHTML=`<div class="budget-section-title"><strong>${esc(name)}</strong><span class="grow"></span><span>Base <b data-section-base>${money(totals.base)}</b></span><span>Total c/IVA <b data-section-total>${money(totals.total)}</b></span></div>`;sectionRows(p,name).forEach(({i})=>{const r=document.querySelector(`[data-line="${i}"]`);if(r)block.appendChild(r)});groups.appendChild(block)});
 if(!rows.length){const e=document.createElement('div');e.className='empty';e.textContent='Todavía no hay líneas. Añade una línea o importa desde Excel.';groups.appendChild(e)}
 refreshWorkTotals(p);
}
function sideSummary(p){
 const side=$('.budget-summary');if(!side)return;side.querySelector('#budget-side-sections')?.remove();const order=sectionOrder(p);if(!order.length)return;
 const box=document.createElement('div');box.id='budget-side-sections';box.className='budget-side-sections';box.innerHTML=`<h4>Resumen por partidas</h4>${order.map(name=>{const t=sectionTotals(p,name);return `<div class="budget-side-row"><div>${esc(name)}<span class="sub">Base / total c/IVA</span></div><b>${money(t.base)}<span class="sub">${money(t.total)}</span></b></div>`}).join('')}`;side.appendChild(box)
}
function refreshWorkTotals(p){
 $$('[data-line]').forEach(row=>{const i=Number(row.dataset.line),x=p.items?.[i];if(!x)return;const b=lineBase(x),total=b*(1+lineVat(x)/100),bc=row.querySelector('[data-budget-line-base]'),tc=row.querySelector('[data-budget-line-total]');if(bc)bc.textContent=money(b);if(tc)tc.textContent=money(total)});
 $$('.budget-section-block').forEach(block=>{const t=sectionTotals(p,block.dataset.sectionName),b=block.querySelector('[data-section-base]'),tt=block.querySelector('[data-section-total]');if(b)b.textContent=money(t.base);if(tt)tt.textContent=money(t.total)});sideSummary(p)
}
function enhanceWork(p){if(!p||(p.kind||'obra')!=='obra'||window.APP?.budgetView!=='edit')return;injectStyles();enhanceMeta(p);enhanceToolbar();enhanceOptionsPosition();decorateRows(p);sideSummary(p)}

function decorate(){
 clearTimeout(timer);timer=setTimeout(()=>{
   const A=window.APP;if(A?.route!=='presupuestos')return;
   injectStyles();const p=current(),head=$('.budget-main-head');
   if(head&&p&&!head.querySelector('[data-budget-duplicate]')){
     const grow=document.createElement('span');grow.style.flex='1';
     const dup=document.createElement('button');dup.className='btn';dup.type='button';dup.textContent='Duplicar';dup.dataset.budgetDuplicate='1';
     const arch=document.createElement('button');arch.className='btn danger';arch.type='button';arch.textContent=p.archived?'Restaurar':'Archivar';arch.dataset.budgetArchive=p.archived?'restore':'archive';
     head.append(grow,dup,arch);
   }
   const sidebar=$('.budget-sidebar');
   if(sidebar&&!sidebar.querySelector('[data-budget-archived-toggle]')){
     const box=document.createElement('label');box.style.cssText='display:flex;gap:7px;align-items:center;font-size:11px;color:var(--muted);margin:10px 2px 2px';
     box.innerHTML=`<input type="checkbox" data-budget-archived-toggle ${showArchived?'checked':''}> Mostrar archivados`;
     sidebar.appendChild(box);box.querySelector('input').onchange=e=>{showArchived=e.target.checked;decorateNow()};
   }
   decorateNow();if(p)enhanceWork(p);
 },50)
}
function decorateNow(){
 const A=window.APP;if(A?.route!=='presupuestos')return;
 $$('[data-budget-item]').forEach(item=>{
   const p=(A.data.presupuestos||[]).find(x=>String(x.id)===String(item.dataset.budgetItem));if(!p)return;
   item.style.display=p.archived&&!showArchived?'none':'';
   const sm=item.querySelector('small');if(sm)sm.innerHTML=`${esc(p.client||'')} · ${esc(p.phase||p.estado||p.status||'')}${p.archived?' · ARCHIVADO':''}`;
 });
 if(!showArchived&&current()?.archived){const n=nextUnarchived();if(n){A.sel.budget=n.id;refreshSelected(n.id)}}
}
new MutationObserver(decorate).observe(document.body,{childList:true,subtree:true});window.addEventListener('hashchange',decorate);window.addEventListener('load',decorate);
document.addEventListener('click',e=>{
 const dup=e.target.closest('[data-budget-duplicate]');if(dup){e.preventDefault();duplicateBudget();return}
 const arch=e.target.closest('[data-budget-archive]');if(arch){e.preventDefault();if(arch.dataset.budgetArchive==='restore')restoreBudget(current()?.id);else archiveBudget();return}
 const line=e.target.closest('[data-budget-dup-line]');if(line){e.preventDefault();duplicateLine(Number(line.dataset.budgetDupLine))}
},true);
})();

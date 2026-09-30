// Iriarte ERP V2 · ergonomía del editor de presupuestos
(function(){
'use strict';
const db=()=>window.__iriarteDb;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const num=v=>Number(String(v??0).replace(',','.'))||0;
let timer,showArchived=false,statusFilter='todos';
function current(){const A=window.APP;return A?.data?.presupuestos?.find(x=>String(x.id)===String(A?.sel?.budget))||null}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[m]))}
function canonicalState(p){const v=String(p?.phase||p?.estado||p?.status||'borrador').toLowerCase();if(v.includes('acept'))return'aceptado';if(v.includes('envi'))return'enviado';if(v.includes('rech'))return'rechazado';if(v.includes('anul'))return'anulado';return'borrador'}
function stateLabel(p){return ({borrador:'Borrador',enviado:'Enviado',aceptado:'Aceptado',rechazado:'Rechazado',anulado:'Anulado'})[canonicalState(p)]||'Borrador'}
function refreshSelected(id,focusLast=false){setTimeout(()=>{const item=document.querySelector(`[data-budget-item="${CSS.escape(String(id))}"]`);if(item)item.click();if(focusLast)setTimeout(()=>{const lines=$$('[data-line]');lines.at(-1)?.querySelector('[data-k="description"]')?.focus()},30)},10)}
function matchesFilter(x){const kind=(window.APP?.budgetKind||'obra')==='obra'?(x.kind||'obra')==='obra':x.kind==='honorarios';return kind&&(showArchived||!x.archived)&&(statusFilter==='todos'||canonicalState(x)===statusFilter)}
function nextVisible(){return (window.APP?.data?.presupuestos||[]).find(matchesFilter)||null}
function totals(p){let base=0,vat=0;if((p.kind||'obra')==='honorarios'){(p.fee_lines||[]).forEach(x=>{const b=num(x.amount??x.importe),r=num(x.vat??x.ivaPct??21);base+=b;vat+=b*r/100})}else{(p.items||[]).forEach(x=>{const b=num(x.qty??x.cantidad)*num(x.price??x.precio),r=num(x.vat??x.ivaPct??21);base+=b;vat+=b*r/100})}const irpf=p.irpf_enabled?base*num(p.irpf_pct||15)/100:0;return {base,total:base+vat-irpf}}
function nextRef(p){const project=(window.APP?.data?.proyectos||[]).find(x=>String(x.id)===String(p.proyecto_id));if(!project?.codigo)return null;let max=0;(window.APP?.data?.presupuestos||[]).filter(x=>String(x.proyecto_id||'')===String(p.proyecto_id)).forEach(x=>{const m=String(x.ref||x.numero||'').match(/-Pres\.(\d+)$/i);if(m)max=Math.max(max,Number(m[1])||0)});return `${project.codigo}-Pres.${max+1}`}

async function duplicateBudget(){
 const p=current(),client=db();if(!p||!client)return;const ref=nextRef(p),calc=totals(p);
 const row={nombre:`${p.name||p.nombre||'Presupuesto'} (copia)`,name:`${p.name||p.nombre||'Presupuesto'} (copia)`,kind:p.kind||'obra',cliente_id:p.cliente_id||null,proyecto_id:p.proyecto_id||null,fecha:new Date().toISOString().slice(0,10),date:new Date().toISOString().slice(0,10),numero:ref,ref,client:p.client||null,address:p.address||null,phase:'Borrador',estado:'borrador',status:'Borrador',archived:false,irpf_enabled:!!p.irpf_enabled,irpf_pct:Number(p.irpf_pct||0),items:structuredClone(p.items||[]),intro_text:p.intro_text||'',zonas:structuredClone(p.zonas||[]),scope_items:structuredClone(p.scope_items||[]),redaccion_toggle:p.redaccion_toggle!==false,redaccion_texto:p.redaccion_texto||'',fases_obra:structuredClone(p.fases_obra||[]),direccion_resumen:p.direccion_resumen||'',fee_lines:structuredClone(p.fee_lines||[]),clausulas:structuredClone(p.clausulas||[]),base:calc.base,total:calc.total};
 try{const {data,error}=await client.from('presupuestos').insert(row).select('id').single();if(error)throw error;if(window.reloadIriarte)await window.reloadIriarte();window.APP.sel.budget=data.id;statusFilter='todos';refreshSelected(data.id)}catch(err){alert('No se pudo duplicar el presupuesto:\n'+(err.message||err))}
}
async function archiveBudget(){const p=current(),client=db();if(!p||!client)return;if(!confirm(`¿Archivar “${p.name||p.nombre||'este presupuesto'}”? No se borrará y podrás volver a mostrarlo.`))return;try{const {error}=await client.from('presupuestos').update({archived:true}).eq('id',p.id);if(error)throw error;p.archived=true;const next=nextVisible();window.APP.sel.budget=next?.id||'';if(window.reloadIriarte)await window.reloadIriarte();if(next)refreshSelected(next.id)}catch(err){alert('No se pudo archivar el presupuesto:\n'+(err.message||err))}}
async function restoreBudget(id){const client=db();if(!client||!id)return;const {error}=await client.from('presupuestos').update({archived:false}).eq('id',id);if(error)return alert(error.message);if(window.reloadIriarte)await window.reloadIriarte();window.APP.sel.budget=id;refreshSelected(id)}
function duplicateLine(index){const p=current();if(!p)return;p.items=p.items||[];const src=p.items[index];if(!src)return;p.items.splice(index+1,0,structuredClone(src));refreshSelected(p.id)}
function addLineAfter(index){const p=current();if(!p)return;p.items=p.items||[];p.items.splice(index+1,0,{code:'',section:p.items[index]?.section||p.items[index]?.seccion||'',description:'',location:p.items[index]?.location||p.items[index]?.ubicacion||'',unit:p.items[index]?.unit||p.items[index]?.unidad||'ud',qty:1,price:0,vat:p.items[index]?.vat??p.items[index]?.ivaPct??21});refreshSelected(p.id,true)}
function ensureStatusFilters(sidebar){
 const legacy=[...sidebar.querySelectorAll('.budget-tabs')].find(x=>x.querySelector('[data-budget-filter]'));if(!legacy)return;
 if(window.APP)window.APP.budgetFilter='todos';
 legacy.innerHTML=[['todos','Todos'],['borrador','Borrador'],['enviado','Enviado'],['aceptado','Aceptado'],['rechazado','Rechazado']].map(([k,l])=>`<button class="${statusFilter===k?'active':''}" data-budget-status-filter="${k}">${l}</button>`).join('');
}
function syncPhase(p){const x=$('[data-budget-field="phase"]');if(!x||x.dataset.statusSync==='1')return;x.dataset.statusSync='1';const apply=()=>{p.phase=x.value;p.status=x.value;p.estado=canonicalState({phase:x.value});decorateNow()};x.addEventListener('input',apply);x.addEventListener('change',apply)}
function setEmptyState(empty){
 const layout=$('.budget-layout'),main=$('.budget-main'),summary=$('.budget-summary');if(!layout||!main||!summary)return;
 let msg=layout.querySelector('[data-budget-filter-empty]');
 if(empty){main.hidden=true;summary.hidden=true;if(!msg){msg=document.createElement('div');msg.className='card panel empty';msg.dataset.budgetFilterEmpty='1';msg.style.gridColumn='2 / -1';msg.textContent=`No hay presupuestos ${statusFilter==='todos'?'visibles':stateLabel({phase:statusFilter}).toLowerCase()} en este filtro.`;layout.appendChild(msg)}else msg.textContent=`No hay presupuestos ${statusFilter==='todos'?'visibles':stateLabel({phase:statusFilter}).toLowerCase()} en este filtro.`}
 else{main.hidden=false;summary.hidden=false;msg?.remove()}
}
function decorate(){
 clearTimeout(timer);timer=setTimeout(()=>{
   const A=window.APP;if(A?.route!=='presupuestos')return;const p=current(),head=$('.budget-main-head');
   if(head&&p&&!head.querySelector('[data-budget-duplicate]')){const grow=document.createElement('span');grow.style.flex='1';const dup=document.createElement('button');dup.className='btn';dup.type='button';dup.textContent='Duplicar';dup.dataset.budgetDuplicate='1';const arch=document.createElement('button');arch.className='btn danger';arch.type='button';arch.textContent=p.archived?'Restaurar':'Archivar';arch.dataset.budgetArchive=p.archived?'restore':'archive';head.append(grow,dup,arch)}
   const sidebar=$('.budget-sidebar');if(sidebar){ensureStatusFilters(sidebar);if(!sidebar.querySelector('[data-budget-archived-toggle]')){const box=document.createElement('label');box.style.cssText='display:flex;gap:7px;align-items:center;font-size:11px;color:var(--muted);margin:10px 2px 2px';box.innerHTML=`<input type="checkbox" data-budget-archived-toggle ${showArchived?'checked':''}> Mostrar archivados`;sidebar.appendChild(box);box.querySelector('input').onchange=e=>{showArchived=e.target.checked;decorateNow()}}}
   if(p)syncPhase(p);decorateNow();
 },40)
}
function decorateNow(){
 const A=window.APP;if(A?.route!=='presupuestos')return;
 $$('[data-budget-status-filter]').forEach(b=>b.classList.toggle('active',b.dataset.budgetStatusFilter===statusFilter));
 $$('[data-budget-item]').forEach(item=>{const p=(A.data.presupuestos||[]).find(x=>String(x.id)===String(item.dataset.budgetItem));if(!p)return;item.hidden=!matchesFilter(p);const sm=item.querySelector('small');if(sm)sm.innerHTML=`${esc(p.client||'')} · ${esc(stateLabel(p))}${p.archived?' · ARCHIVADO':''}`});
 const next=nextVisible(),selected=current(),selectedMatches=!!selected&&matchesFilter(selected);setEmptyState(!next);
 if(next&&!selectedMatches){A.sel.budget=next.id;refreshSelected(next.id);return}
 $$('[data-line]').forEach(row=>{if(row.querySelector('[data-budget-dup-line]'))return;const i=Number(row.dataset.line),remove=row.querySelector('[data-remove-line]');if(!remove)return;row.style.gridTemplateColumns='80px 110px minmax(220px,1fr) 120px 60px 70px 90px 65px 38px 38px';const b=document.createElement('button');b.type='button';b.className='btn';b.textContent='⧉';b.title='Duplicar línea';b.dataset.budgetDupLine=String(i);remove.before(b);row.querySelectorAll('input').forEach(input=>input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.ctrlKey&&!e.altKey){e.preventDefault();input.dispatchEvent(new Event('input',{bubbles:true}));addLineAfter(Number(row.dataset.line))}}))});
}
new MutationObserver(decorate).observe(document.body,{childList:true,subtree:true});window.addEventListener('hashchange',decorate);window.addEventListener('load',decorate);
document.addEventListener('click',e=>{
 const status=e.target.closest('[data-budget-status-filter]');if(status){e.preventDefault();e.stopImmediatePropagation();statusFilter=status.dataset.budgetStatusFilter;decorateNow();return}
 const dup=e.target.closest('[data-budget-duplicate]');if(dup){e.preventDefault();duplicateBudget();return}
 const arch=e.target.closest('[data-budget-archive]');if(arch){e.preventDefault();if(arch.dataset.budgetArchive==='restore')restoreBudget(current()?.id);else archiveBudget();return}
 const line=e.target.closest('[data-budget-dup-line]');if(line){e.preventDefault();duplicateLine(Number(line.dataset.budgetDupLine))}
},true);
})();

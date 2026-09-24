// Iriarte ERP V2 · ergonomía del editor de presupuestos
(function(){
'use strict';
const db=()=>window.__iriarteDb;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let timer,showArchived=false;
function current(){const A=window.APP;return A?.data?.presupuestos?.find(x=>String(x.id)===String(A?.sel?.budget))||null}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function refreshSelected(id,focusLast=false){setTimeout(()=>{const item=document.querySelector(`[data-budget-item="${CSS.escape(String(id))}"]`);if(item)item.click();if(focusLast)setTimeout(()=>{const lines=$$('[data-line]');lines.at(-1)?.querySelector('[data-k="description"]')?.focus()},30)},10)}
function nextUnarchived(){return (window.APP?.data?.presupuestos||[]).find(x=>!x.archived&&(x.kind||'obra')===(window.APP?.budgetKind||'obra'))||null}

async function duplicateBudget(){
 const p=current(),client=db();if(!p||!client)return;
 const row={
  nombre:`${p.name||p.nombre||'Presupuesto'} (copia)`,name:`${p.name||p.nombre||'Presupuesto'} (copia)`,
  kind:p.kind||'obra',cliente_id:p.cliente_id||null,proyecto_id:null,fecha:new Date().toISOString().slice(0,10),date:new Date().toISOString().slice(0,10),
  numero:null,ref:null,client:p.client||null,address:p.address||null,phase:'Borrador',estado:'borrador',status:'Borrador',archived:false,
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
   const next=nextUnarchived();window.APP.sel.budget=next?.id||'';
   if(window.reloadIriarte)await window.reloadIriarte();
   if(next)refreshSelected(next.id);
 }catch(err){alert('No se pudo archivar el presupuesto:\n'+(err.message||err))}
}
async function restoreBudget(id){
 const client=db();if(!client)return;const {error}=await client.from('presupuestos').update({archived:false}).eq('id',id);if(error)return alert(error.message);
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
function decorate(){
 clearTimeout(timer);timer=setTimeout(()=>{
   const A=window.APP;if(A?.route!=='presupuestos')return;
   const p=current(),head=$('.budget-main-head');
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
   decorateNow();
 },40)
}
function decorateNow(){
 const A=window.APP;if(A?.route!=='presupuestos')return;
 $$('[data-budget-item]').forEach(item=>{
   const p=(A.data.presupuestos||[]).find(x=>String(x.id)===String(item.dataset.budgetItem));if(!p)return;
   item.style.display=p.archived&&!showArchived?'none':'';
   const sm=item.querySelector('small');if(sm)sm.innerHTML=`${esc(p.client||'')} · ${esc(p.phase||p.estado||p.status||'')}${p.archived?' · ARCHIVADO':''}`;
 });
 if(!showArchived&&current()?.archived){const n=nextUnarchived();if(n){A.sel.budget=n.id;refreshSelected(n.id)}}
 $$('[data-line]').forEach(row=>{
   if(row.querySelector('[data-budget-dup-line]'))return;
   const i=Number(row.dataset.line),remove=row.querySelector('[data-remove-line]');if(!remove)return;
   row.style.gridTemplateColumns='80px 110px minmax(220px,1fr) 120px 60px 70px 90px 65px 38px 38px';
   const b=document.createElement('button');b.type='button';b.className='btn';b.textContent='⧉';b.title='Duplicar línea';b.dataset.budgetDupLine=String(i);remove.before(b);
   row.querySelectorAll('input').forEach(input=>input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.ctrlKey&&!e.altKey){e.preventDefault();input.dispatchEvent(new Event('input',{bubbles:true}));addLineAfter(Number(row.dataset.line))}}));
 });
}
new MutationObserver(decorate).observe(document.body,{childList:true,subtree:true});window.addEventListener('hashchange',decorate);window.addEventListener('load',decorate);
document.addEventListener('click',e=>{
 const dup=e.target.closest('[data-budget-duplicate]');if(dup){e.preventDefault();duplicateBudget();return}
 const arch=e.target.closest('[data-budget-archive]');if(arch){e.preventDefault();if(arch.dataset.budgetArchive==='restore')restoreBudget(current()?.id);else archiveBudget();return}
 const line=e.target.closest('[data-budget-dup-line]');if(line){e.preventDefault();duplicateLine(Number(line.dataset.budgetDupLine))}
},true);
})();

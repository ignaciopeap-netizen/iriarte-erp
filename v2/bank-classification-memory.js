// Iriarte ERP V2 · memoria de clasificación bancaria no destructiva
(function(){
'use strict';
const num=v=>Number(String(v??0).replace(',','.'))||0;
const money=v=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(num(v));
let timer;
function signed(x){const amount=Math.abs(num(x.total??x.importe));return ['pago','gasto'].includes(String(x.tipo||'').toLowerCase())?-amount:amount}
function normalizeConcept(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\d+/g,' ').replace(/[^a-z]+/g,' ').replace(/\s+/g,' ').trim()}
function classification(x){
 if(!x?.origen_importacion||!x?.conciliado)return null;
 if(x.categoria==='no_estudio')return {kind:'no_estudio',project:'',sub:x.subcategoria||''};
 if(x.categoria==='general_estudio')return {kind:'general',project:'',sub:x.subcategoria||''};
 if(x.categoria==='coste_personal')return {kind:'coste_personal',project:'',sub:x.subcategoria||''};
 if(['gasto_directo','movimiento_proyecto'].includes(String(x.categoria||''))&&x.proyecto_id)return {kind:'proyecto',project:String(x.proyecto_id),sub:x.subcategoria||''};
 return null
}
function signature(s){return [s.kind,s.project,String(s.sub||'').trim().toLowerCase()].join('|')}
function modalMovement(form){
 const small=form.closest('.modal')?.querySelector('.modal-head small');if(!small)return null;const label=small.textContent.trim();
 const rows=window.APP?.data?.movs||[];return rows.find(x=>`${x.fecha||''} · ${x.concepto||''} · ${money(signed(x))}`===label)||null
}
function suggestionFor(m){
 const key=normalizeConcept(m?.concepto);if(!key)return null;
 const peers=(window.APP?.data?.movs||[]).filter(x=>String(x.id)!==String(m.id)&&normalizeConcept(x.concepto)===key).map(classification).filter(Boolean);
 if(!peers.length)return null;const signatures=[...new Set(peers.map(signature))];if(signatures.length!==1)return null;return {...peers[0],count:peers.length}
}
function apply(){
 const form=document.querySelector('#bank-class-form');if(!form||form.dataset.memoryBound==='1')return;form.dataset.memoryBound='1';
 const m=modalMovement(form),s=suggestionFor(m);if(!s)return;
 const kind=form.elements.clasificacion,project=form.elements.proyecto_id,sub=form.elements.subcategoria,type=form.elements.tipo_personal;if(!kind)return;
 kind.value=s.kind;kind.dispatchEvent(new Event('change',{bubbles:true}));
 if(s.kind==='proyecto'&&project)project.value=s.project;
 if(s.kind==='coste_personal'&&type&&s.sub)type.value=s.sub;
 else if(sub)sub.value=s.sub||'';
 const notice=document.createElement('div');notice.className='notice';notice.dataset.bankMemorySuggestion='1';notice.style.marginTop='10px';notice.innerHTML=`<b>Sugerencia por historial:</b> ${s.count} movimiento${s.count===1?'':'s'} anterior${s.count===1?'':'es'} con este mismo concepto se clasificaron igual. Revisa los campos y confirma para aplicar.`;
 const body=form.querySelector('.modal-body');if(body)body.insertBefore(notice,body.querySelector('#bank-class-error')||null)
}
function schedule(){clearTimeout(timer);timer=setTimeout(apply,40)}
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});window.addEventListener('load',schedule);
})();

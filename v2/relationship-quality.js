// Iriarte ERP V2 · relaciones maestras pendientes de resolver
(function(){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[m]));
let timer;
function D(){return window.APP?.data||{}}
function issues(){
 const d=D(),out=[];
 (d.proyectos||[]).filter(x=>!x.cliente_id).forEach(x=>out.push({type:'project',id:x.id,title:x.nombre||x.codigo||'Proyecto',problem:'Proyecto sin cliente',detail:'Asigna el cliente correcto para que presupuestos, facturas y rentabilidad hereden el contexto comercial.'}));
 (d.presupuestos||[]).filter(x=>!x.proyecto_id&&!x.archived).forEach(x=>out.push({type:'budget',id:x.id,title:x.name||x.nombre||x.numero||'Presupuesto',problem:'Presupuesto sin proyecto',detail:'Vincúlalo a un proyecto existente o archívalo si es un borrador de prueba que ya no debe formar parte del circuito operativo.'}));
 return out
}
function openIssue(x){if(window.iriarteOpenRecord)return window.iriarteOpenRecord(x.type,x.id);if(x.type==='project'){window.APP.sel.project=x.id;return window.iriarteRoute?.('proyectos')}if(x.type==='budget'){window.APP.sel.budget=x.id;return window.iriarteRoute?.('presupuestos')}}
function render(){
 if(window.APP?.route!=='informes')return;const root=document.querySelector('#reports-v2');if(!root||root.querySelector('[data-relationship-quality]'))return;const list=issues();if(!list.length)return;
 const panel=document.createElement('section');panel.className='card panel';panel.dataset.relationshipQuality='1';panel.style.marginTop='14px';panel.innerHTML=`<div class="page-head" style="margin-bottom:10px"><div><h3 style="margin:0">Relaciones pendientes</h3><small style="color:var(--muted)">Registros válidos que aún no están conectados al eje Cliente → Proyecto → Presupuesto.</small></div></div><div class="notice" style="background:#fff2d8;color:#745b24"><b>${list.length} relación${list.length===1?'':'es'} pendiente${list.length===1?'':'s'}.</b> No se corrigen automáticamente porque requieren identificar el cliente o proyecto real.</div><div class="table-wrap"><table class="table"><tr><th>Registro</th><th>Problema</th><th>Qué revisar</th><th></th></tr>${list.map((x,i)=>`<tr><td><b>${esc(x.title)}</b></td><td>${esc(x.problem)}</td><td>${esc(x.detail)}</td><td><button class="btn" type="button" data-rq-open="${i}">Revisar</button></td></tr>`).join('')}</table></div>`;
 const before=root.querySelector('[data-monthly-review]')||root.querySelector('[data-analytics-integrity]');if(before)before.insertAdjacentElement('beforebegin',panel);else root.appendChild(panel);panel.querySelectorAll('[data-rq-open]').forEach(b=>b.onclick=()=>openIssue(list[Number(b.dataset.rqOpen)]) )
}
function schedule(){clearTimeout(timer);timer=setTimeout(render,120)}
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});window.addEventListener('load',schedule);window.addEventListener('hashchange',schedule);document.addEventListener('iriarte:route',schedule);
})();

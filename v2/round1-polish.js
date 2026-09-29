// Iriarte ERP V2 · retoques finales de la primera ronda
(function(){
'use strict';
let timer;
function open(type,id){if(window.iriarteOpenRecord)return window.iriarteOpenRecord(type,id)}
function decorateBank(){if(window.APP?.route!=='finanzas')return;const h=document.querySelector('#app-view .page-head h1');if(h)h.textContent='Banco';document.querySelectorAll('#app-view h3').forEach(x=>{if(x.textContent.trim()==='Movimientos financieros')x.textContent='Movimientos bancarios'})}
function decorateProjectHub(){const S=window.APP,hub=document.querySelector('#project-hub-v2');if(!S||S.route!=='proyectos'||!hub)return;const pid=S.sel?.project;if(!pid)return;const sets={Presupuestos:(S.data.presupuestos||[]).filter(x=>String(x.proyecto_id||'')===String(pid)).map(x=>['budget',x.id]),Facturas:(S.data.facturas||[]).filter(x=>String(x.proyecto_id||'')===String(pid)).map(x=>['invoice',x.id]),Compras:(S.data.compras||[]).filter(x=>String(x.proyecto_id||'')===String(pid)).map(x=>['purchase',x.id]),Documentos:(S.data.docs||[]).filter(x=>String(x.proyecto_id||'')===String(pid)).map(x=>['document',x.id])};hub.querySelectorAll('.card.panel').forEach(panel=>{const title=panel.querySelector('h3')?.textContent.trim(),rows=sets[title];if(!rows)return;panel.querySelectorAll(':scope > .master-item').forEach((el,i)=>{if(!rows[i])return;el.style.cursor='pointer';el.dataset.r1HubRecord=rows[i][0]+':'+rows[i][1]})})}
function run(){clearTimeout(timer);timer=setTimeout(()=>{decorateBank();decorateProjectHub()},70)}
new MutationObserver(run).observe(document.body,{childList:true,subtree:true});window.addEventListener('load',run);window.addEventListener('hashchange',run);
document.addEventListener('click',e=>{const el=e.target.closest('[data-r1-hub-record]');if(!el)return;e.preventDefault();e.stopImmediatePropagation();const [type,id]=el.dataset.r1HubRecord.split(':');open(type,id)},true);
})();

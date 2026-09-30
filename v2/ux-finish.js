(function(){
'use strict';
const $=s=>document.querySelector(s);
const labels={inicio:'Inicio',clientes:'Clientes',proyectos:'Proyectos',presupuestos:'Presupuestos',facturas:'Facturas',proveedores:'Proveedores',compras:'Compras',obra:'Obra',horas:'Horas',documentos:'Documentos',finanzas:'Banco',gastos:'Gastos generales',registros:'Registros',informes:'Finanzas'};
const contextRoutes=new Set(['presupuestos','facturas','compras','obra','horas','documentos']);
let timer;
function clean(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[m]))}
function applyBrand(){
 const logo=window.IRIARTE_LOGO_DATA_URI;if(!logo)return;
 const mark=$('.brand-mark');if(mark&&!mark.dataset.logoReady){mark.dataset.logoReady='1';mark.classList.add('with-logo');mark.innerHTML='<img alt="Sonsoles Pérez Iriarte">';mark.querySelector('img').src=logo}
 const card=$('.auth-card');if(card&&!card.querySelector('.auth-brand')){const w=document.createElement('div');w.className='auth-brand';w.innerHTML='<img alt="Sonsoles Pérez Iriarte">';w.querySelector('img').src=logo;card.prepend(w);const e=card.querySelector('.eyebrow');if(e)e.textContent='Acceso privado';const h=card.querySelector('h1');if(h&&!card.querySelector('.auth-subtitle')){const p=document.createElement('p');p.className='auth-subtitle';p.textContent='Gestión de clientes, proyectos, presupuestos, obra y finanzas.';h.after(p)}}
}
function applyContext(){
 const S=window.APP,v=$('#app-view');if(!S||!v)return;const old=$('#ux-project-context'),id=S.sel&&S.sel.project;
 if(!id||!contextRoutes.has(S.route)){if(old)old.remove();return}
 const p=(S.data.proyectos||[]).find(x=>String(x.id)===String(id));if(!p){if(old)old.remove();return}
 const c=(S.data.clientes||[]).find(x=>String(x.id)===String(p.cliente_id));const sig=S.route+':'+p.id+':'+(p.nombre||'');if(old&&old.dataset.signature===sig)return;if(old)old.remove();
 const bar=document.createElement('div');bar.id='ux-project-context';bar.className='ux-project-context';bar.dataset.signature=sig;bar.innerHTML='<span class="ux-context-dot"></span><div class="ux-context-copy"><span>Contexto de proyecto</span><b>'+clean(p.nombre||'Proyecto')+'</b>'+(c&&c.nombre?'<span>· '+clean(c.nombre)+'</span>':'')+'</div><div class="ux-context-actions"><button class="btn" type="button" data-open>Ver ficha</button><button class="btn" type="button" data-clear>Todos</button></div>';v.prepend(bar);
 bar.querySelector('[data-open]').onclick=()=>window.iriarteRoute&&window.iriarteRoute('proyectos');bar.querySelector('[data-clear]').onclick=async()=>{S.sel.project='';if(window.reloadIriarte)await window.reloadIriarte()};
}
function applyFinanceActions(){
 const S=window.APP;if(S?.route!=='informes')return;
 const small=[...document.querySelectorAll('#reports-v2 .info small')].find(x=>x.textContent.trim()==='Presupuestos pendientes de vincular a proyecto');
 const info=small?.closest('.info');if(info&&!info.querySelector('[data-ux-unlinked-budgets]')){const count=Number(info.querySelector('b')?.textContent||0);if(count){const b=document.createElement('button');b.type='button';b.className='btn';b.dataset.uxUnlinkedBudgets='1';b.textContent='Revisar presupuestos sin proyecto';b.style.marginTop='8px';b.onclick=()=>{if(typeof window.iriarteOpenUnlinkedBudgets==='function')window.iriarteOpenUnlinkedBudgets();else{localStorage.setItem('iriarte_budget_filter','sin-proyecto');window.iriarteRoute?.('presupuestos')}};info.appendChild(b)}}
 const projects=(S.data.proyectos||[]).filter(x=>!x.cliente_id),zeroHours=(S.data.horas||[]).filter(x=>Number(x.horas||0)>0&&Number(x.coste_hora||0)<=0);
 let box=$('#ux-structural-integrity');
 if(!projects.length&&!zeroHours.length){box?.remove();return}
 if(!box){box=document.createElement('section');box.id='ux-structural-integrity';box.className='card panel';const integrity=[...document.querySelectorAll('#reports-v2 .card.panel')].find(x=>x.querySelector('h3')?.textContent.trim()==='Control de integridad');if(integrity)integrity.after(box);else document.querySelector('#reports-v2')?.appendChild(box)}
 if(!box)return;
 box.innerHTML=`<h3>Pendientes estructurales</h3><div class="notice" style="background:#fff2d8;color:#745b24"><b>${projects.length+zeroHours.length} pendiente${projects.length+zeroHours.length===1?'':'s'} de estructura o coste.</b> No se modifica ningún dato automáticamente.</div><div class="grid cols-2" style="margin-top:10px">${projects.length?`<div class="info"><small>Proyectos sin cliente</small><b class="negative">${projects.length}</b><div style="margin-top:7px"><button class="btn" data-ux-project-client>Revisar proyecto</button></div></div>`:''}${zeroHours.length?`<div class="info"><small>Horas sin coste imputado</small><b class="negative">${zeroHours.length}</b><div style="margin-top:7px"><button class="btn" data-ux-zero-hours>Revisar horas</button></div></div>`:''}</div>`;
 const pb=box.querySelector('[data-ux-project-client]');if(pb)pb.onclick=()=>{S.sel.project=projects[0].id;window.iriarteRoute?.('proyectos')};
 const hb=box.querySelector('[data-ux-zero-hours]');if(hb)hb.onclick=()=>{S.sel.project=zeroHours[0].proyecto_id||'';window.iriarteRoute?.('horas')};
 const ok=[...document.querySelectorAll('#reports-v2 .notice')].find(x=>x.textContent.includes('Control de integridad: correcto.'));if(ok)ok.remove();
}
function applyMeta(){const r=labels[window.APP?.route||'inicio']||'Iriarte ERP';document.title=r+' · Iriarte ERP';document.body.classList.toggle('ux-modal-open',!!document.querySelector('.modal-backdrop'))}
function run(){clearTimeout(timer);timer=setTimeout(()=>{applyBrand();applyContext();applyFinanceActions();applyMeta()},30)}
new MutationObserver(run).observe(document.documentElement,{childList:true,subtree:true});document.addEventListener('DOMContentLoaded',run);window.addEventListener('hashchange',run);document.addEventListener('iriarte:route',run);
})();

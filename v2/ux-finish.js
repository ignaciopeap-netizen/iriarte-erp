(function(){
'use strict';
const $=s=>document.querySelector(s);
const labels={inicio:'Inicio',clientes:'Clientes',proyectos:'Proyectos',presupuestos:'Presupuestos',facturas:'Facturas',proveedores:'Proveedores',compras:'Compras',obra:'Obra',horas:'Horas',documentos:'Documentos',finanzas:'Finanzas',gastos:'Gastos generales',informes:'Informes'};
const routes=new Set(['presupuestos','facturas','compras','obra','horas','documentos','finanzas']);
let timer;
function clean(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function applyBrand(){
 const logo=window.IRIARTE_LOGO_DATA_URI;if(!logo)return;
 const mark=$('.brand-mark');if(mark&&!mark.dataset.logoReady){mark.dataset.logoReady='1';mark.classList.add('with-logo');mark.innerHTML='<img alt="Sonsoles Pérez Iriarte">';mark.querySelector('img').src=logo}
 const card=$('.auth-card');if(card&&!card.querySelector('.auth-brand')){const w=document.createElement('div');w.className='auth-brand';w.innerHTML='<img alt="Sonsoles Pérez Iriarte">';w.querySelector('img').src=logo;card.prepend(w);const e=card.querySelector('.eyebrow');if(e)e.textContent='Acceso privado';const h=card.querySelector('h1');if(h&&!card.querySelector('.auth-subtitle')){const p=document.createElement('p');p.className='auth-subtitle';p.textContent='Gestión de clientes, proyectos, presupuestos, obra y finanzas.';h.after(p)}}
}
function applyNav(){const starts=new Set(['presupuestos','proveedores','obra','finanzas']);document.querySelectorAll('.nav-item[data-route]').forEach(a=>{a.dataset.groupStart=starts.has(a.dataset.route)?'true':'false';a.title=labels[a.dataset.route]||a.textContent.trim()})}
function applyContext(){
 const S=window.APP,v=$('#app-view');if(!S||!v)return;const old=$('#ux-project-context'),id=S.sel&&S.sel.project;
 if(!id||!routes.has(S.route)){if(old)old.remove();return}
 const p=(S.data.proyectos||[]).find(x=>String(x.id)===String(id));if(!p){if(old)old.remove();return}
 const c=(S.data.clientes||[]).find(x=>String(x.id)===String(p.cliente_id));const sig=S.route+':'+p.id+':'+(p.nombre||'');if(old&&old.dataset.signature===sig)return;if(old)old.remove();
 const bar=document.createElement('div');bar.id='ux-project-context';bar.className='ux-project-context';bar.dataset.signature=sig;bar.innerHTML='<span class="ux-context-dot"></span><div class="ux-context-copy"><span>Contexto de proyecto</span><b>'+clean(p.nombre||'Proyecto')+'</b>'+(c&&c.nombre?'<span>· '+clean(c.nombre)+'</span>':'')+'</div><div class="ux-context-actions"><button class="btn" type="button" data-open>Ver ficha</button><button class="btn" type="button" data-clear>Todos</button></div>';v.prepend(bar);
 bar.querySelector('[data-open]').onclick=()=>window.iriarteRoute&&window.iriarteRoute('proyectos');bar.querySelector('[data-clear]').onclick=async()=>{S.sel.project='';if(window.reloadIriarte)await window.reloadIriarte()};
}
function applyDashboard(){const S=window.APP,v=$('#app-view');if(!S||S.route!=='inicio'||!v||v.querySelector('.ux-dashboard-links'))return;const hero=v.firstElementChild;if(!hero)return;const box=document.createElement('div');box.className='ux-dashboard-links';[['presupuestos','Presupuestos','P'],['proyectos','Proyectos','PR'],['obra','Obra','O'],['facturas','Facturación','F'],['finanzas','Finanzas','€']].forEach(x=>{const b=document.createElement('button');b.type='button';b.className='ux-dashboard-link';b.innerHTML='<span>'+x[2]+'</span>'+x[1];b.onclick=()=>window.iriarteRoute&&window.iriarteRoute(x[0]);box.appendChild(b)});hero.after(box)}
function applyMeta(){const r=window.APP?.route||'inicio';document.title=(labels[r]||'Iriarte ERP')+' · Iriarte ERP';document.body.classList.toggle('ux-modal-open',!!document.querySelector('.modal-backdrop'))}
function run(){clearTimeout(timer);timer=setTimeout(()=>{applyBrand();applyNav();applyContext();applyDashboard();applyMeta()},30)}
new MutationObserver(run).observe(document.documentElement,{childList:true,subtree:true});document.addEventListener('DOMContentLoaded',run);window.addEventListener('hashchange',run);
})();

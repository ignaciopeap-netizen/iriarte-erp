// Iriarte ERP V2 · atención mensual en Inicio
(function(){
'use strict';
const db=()=>window.__iriarteDb;
let cache=null,loading=false,timer;
function D(){return window.APP?.data||{}}
function monthKey(v){return String(v||'').slice(0,7)}
function latestMonth(costs){const d=D(),s=new Set();(d.movs||[]).forEach(x=>s.add(monthKey(x.fecha)));(d.horas||[]).forEach(x=>s.add(monthKey(x.fecha)));(d.facturas||[]).forEach(x=>s.add(monthKey(x.fecha)));(d.compras||[]).forEach(x=>s.add(monthKey(x.fecha)));(costs||[]).forEach(x=>s.add(monthKey(x.periodo)));return [...s].filter(x=>/^\d{4}-\d{2}$/.test(x)).sort().reverse()[0]||''}
function labelMonth(m){if(!m)return'—';const [y,mo]=m.split('-').map(Number);return new Intl.DateTimeFormat('es-ES',{month:'long',year:'numeric'}).format(new Date(y,mo-1,1))}
async function load(force=false){if(cache&&!force)return cache;if(loading)return cache;if(!db())return null;loading=true;try{const {data,error}=await db().from('costes_personal_mensuales').select('periodo,estado');if(error)throw error;cache=data||[];return cache}catch(err){console.warn('Atención mensual',err.message||err);return []}finally{loading=false}}
async function render(force=false){
 const S=window.APP,view=document.querySelector('#app-view');if(!S||S.route!=='inicio'||!view)return;const grid=view.querySelector('.ux-attention-grid');if(!grid)return;
 const costs=await load(force);if(window.APP?.route!=='inicio'||!document.contains(grid))return;const month=latestMonth(costs);if(!month)return;
 const pending=(D().movs||[]).filter(x=>monthKey(x.fecha)===month&&!x.conciliado).length,open=(costs||[]).filter(x=>monthKey(x.periodo)===month&&x.estado!=='cerrado').length,total=pending+open;
 let card=grid.querySelector('[data-dashboard-monthly-review]');if(!card){card=document.createElement('button');card.type='button';card.dataset.dashboardMonthlyReview='1';grid.appendChild(card)}
 card.className='ux-attention-card'+(total?' attention':'');card.innerHTML=`<small>Revisión mensual</small><strong>${total}</strong><span>${labelMonth(month)} · ${pending} banco · ${open} personal</span>`;
 card.title=total?'Abrir los bloqueos pendientes de la revisión mensual':'Abrir la revisión mensual';
 card.onclick=()=>{localStorage.setItem('iriarte_review_month',month);if(window.iriarteRoute)window.iriarteRoute('informes');else location.hash='#informes';setTimeout(()=>document.querySelector('[data-monthly-review]')?.scrollIntoView({behavior:'smooth',block:'start'}),160)}
}
function schedule(force=false){clearTimeout(timer);timer=setTimeout(()=>render(force),90)}
function refreshOnRoute(){cache=null;schedule(true)}
new MutationObserver(()=>schedule(false)).observe(document.documentElement,{childList:true,subtree:true});document.addEventListener('DOMContentLoaded',()=>schedule(true));window.addEventListener('hashchange',refreshOnRoute);document.addEventListener('iriarte:route',refreshOnRoute);
window.iriarteRefreshDashboardMonthlyReview=()=>{cache=null;return render(true)};
})();

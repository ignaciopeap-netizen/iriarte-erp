// Iriarte ERP V2 · foco mensual no destructivo para la tabla de Banco
(function(){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[m]));
let timer;
function monthKey(v){return String(v||'').slice(0,7)}
function labelMonth(m){if(!m)return'Todos los meses';const [y,mo]=m.split('-').map(Number);return new Intl.DateTimeFormat('es-ES',{month:'long',year:'numeric'}).format(new Date(y,mo-1,1))}
function months(){return [...new Set((window.APP?.data?.movs||[]).map(x=>monthKey(x.fecha)).filter(x=>/^\d{4}-\d{2}$/.test(x)))].sort().reverse()}
function panel(){return [...document.querySelectorAll('#app-view .card')].find(x=>x.querySelector('h3')?.textContent.trim()==='Movimientos bancarios')||null}
function apply(){
 if(window.APP?.route!=='finanzas')return;const p=panel();if(!p)return;const head=p.querySelector('.page-head');if(!head)return;
 let select=head.querySelector('[data-bank-month-focus]');if(!select){select=document.createElement('select');select.className='btn';select.dataset.bankMonthFocus='1';head.appendChild(select)}
 let pendingBtn=head.querySelector('[data-bank-pending-focus]');if(!pendingBtn){pendingBtn=document.createElement('button');pendingBtn.type='button';pendingBtn.className='btn';pendingBtn.dataset.bankPendingFocus='1';pendingBtn.textContent='Solo pendientes';head.appendChild(pendingBtn)}
 const ms=months(),stored=localStorage.getItem('iriarte_bank_focus_month')||'',selected=ms.includes(stored)?stored:'',pendingOnly=localStorage.getItem('iriarte_bank_pending_only')==='1';
 const signature=['',...ms].join('|');if(select.dataset.monthSignature!==signature){select.dataset.monthSignature=signature;select.innerHTML=`<option value="">Todos los meses</option>`+ms.map(m=>`<option value="${esc(m)}">${esc(labelMonth(m))}</option>`).join('')}
 select.value=selected;pendingBtn.className='btn'+(pendingOnly?' primary':'');pendingBtn.setAttribute('aria-pressed',pendingOnly?'true':'false');
 const rows=[...p.querySelectorAll('table tr')].filter(tr=>tr.querySelector('td')),visible=rows.filter(tr=>{const date=tr.querySelector('td')?.textContent.trim()||'',monthOk=!selected||monthKey(date)===selected,status=tr.querySelector('.badge')?.textContent.trim().toLowerCase()||'',pendingOk=!pendingOnly||status==='pendiente',show=monthOk&&pendingOk;tr.hidden=!show;return show});
 let note=head.querySelector('[data-bank-month-count]');if(!note){note=document.createElement('small');note.dataset.bankMonthCount='1';note.style.color='var(--muted)';head.appendChild(note)}const scope=selected?labelMonth(selected):'todo el histórico',kind=pendingOnly?' pendientes':'';note.textContent=`${visible.length} movimiento${visible.length===1?'':'s'}${kind} · ${scope}`;
 if(select.dataset.bound!=='1'){select.dataset.bound='1';select.addEventListener('change',()=>{if(select.value)localStorage.setItem('iriarte_bank_focus_month',select.value);else localStorage.removeItem('iriarte_bank_focus_month');apply()})}
 if(pendingBtn.dataset.bound!=='1'){pendingBtn.dataset.bound='1';pendingBtn.addEventListener('click',()=>{const on=localStorage.getItem('iriarte_bank_pending_only')==='1';if(on)localStorage.removeItem('iriarte_bank_pending_only');else localStorage.setItem('iriarte_bank_pending_only','1');apply()})}
}
function schedule(){clearTimeout(timer);timer=setTimeout(apply,90)}
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});window.addEventListener('load',schedule);window.addEventListener('hashchange',schedule);document.addEventListener('iriarte:route',schedule);
document.addEventListener('click',e=>{const b=e.target.closest('[data-mr-bank]');if(!b)return;const month=document.querySelector('[data-mr-month]')?.value||localStorage.getItem('iriarte_review_month')||'';if(month)localStorage.setItem('iriarte_bank_focus_month',month);localStorage.setItem('iriarte_bank_pending_only','1')},true);
window.iriarteFocusBankMonth=(month,pendingOnly=false)=>{if(month)localStorage.setItem('iriarte_bank_focus_month',month);else localStorage.removeItem('iriarte_bank_focus_month');if(pendingOnly)localStorage.setItem('iriarte_bank_pending_only','1');else localStorage.removeItem('iriarte_bank_pending_only');if(window.APP?.route==='finanzas')apply()};
})();

// Iriarte ERP V2 · validación numérica de compras
(function(){
'use strict';
let timer;
const num=v=>{const n=Number(String(v??'').replace(',','.'));return Number.isFinite(n)?n:NaN};
function isPurchaseForm(form){if(!form)return false;if(form.id==='c-form')return true;if(form.id!=='x-form')return false;return form.closest('.modal')?.querySelector('.modal-head h2')?.textContent?.trim()==='Nueva compra'}
function setup(form){if(!isPurchaseForm(form)||form.dataset.purchaseNumbers==='1')return;form.dataset.purchaseNumbers='1';const base=form.elements.base,iva=form.elements.iva_pct;if(base){base.min='0';base.step='0.01'}if(iva){iva.min='0';iva.max='100';iva.step='0.01'}form.addEventListener('input',e=>{const x=e.target;if(x!==base&&x!==iva)return;const v=num(x.value),bad=!Number.isFinite(v)||v<0||(x===iva&&v>100);x.style.borderColor=bad?'#b65d4c':'';x.style.background=bad?'#fff7f4':''})}
function run(){clearTimeout(timer);timer=setTimeout(()=>document.querySelectorAll('#c-form,#x-form').forEach(setup),30)}
new MutationObserver(run).observe(document.body,{childList:true,subtree:true});window.addEventListener('load',run);
document.addEventListener('submit',e=>{const form=e.target;if(!isPurchaseForm(form))return;const base=num(form.elements.base?.value),iva=num(form.elements.iva_pct?.value);let msg='',focus=null;if(!Number.isFinite(base)||base<0){msg='La base de la compra no puede ser negativa.';focus=form.elements.base}else if(!Number.isFinite(iva)||iva<0||iva>100){msg='El IVA debe estar entre 0% y 100%.';focus=form.elements.iva_pct}if(!msg)return;e.preventDefault();e.stopImmediatePropagation();const box=form.querySelector('#c-error,#x-error');if(box)box.innerHTML=`<div class="notice" style="background:#f6dfd7;color:#8f4d3c"><b>Revisa los importes.</b><br>${msg}</div>`;focus?.focus()},true);
})();

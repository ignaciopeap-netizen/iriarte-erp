// Iriarte ERP V2 · validaciones de factura antes de emisión
(function(){
'use strict';
let timer;
function enhance(){clearTimeout(timer);timer=setTimeout(()=>{const form=document.querySelector('#invoice-pro-form');if(!form)return;const state=form.elements.estado;if(state&&!Array.from(state.options).some(o=>o.value==='anulada')){const o=document.createElement('option');o.value='anulada';o.textContent='anulada';state.appendChild(o)}},50)}
new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});
document.addEventListener('submit',e=>{const form=e.target;if(form?.id!=='invoice-pro-form')return;const number=String(form.elements.numero?.value||'').trim(),state=String(form.elements.estado?.value||'borrador');const error=document.querySelector('#invoice-pro-error');if(state!=='borrador'&&state!=='anulada'&&!number){e.preventDefault();e.stopImmediatePropagation();if(error)error.innerHTML='<div class="notice" style="background:#f6dfd7;color:#8f4d3c"><b>Falta el número de factura.</b><br>Puedes dejarlo vacío mientras sea borrador, pero para emitirla necesita numeración.</div>';form.elements.numero?.focus()}},true);
})();

// Iriarte ERP V2 · validaciones de factura antes de emisión
(function(){
'use strict';
let timer;
function enhance(){clearTimeout(timer);timer=setTimeout(()=>{const form=document.querySelector('#invoice-pro-form');if(!form)return;const state=form.elements.estado;if(state&&!Array.from(state.options).some(o=>o.value==='anulada')){const o=document.createElement('option');o.value='anulada';o.textContent='anulada';state.appendChild(o)}},50)}
new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});
document.addEventListener('submit',e=>{
 const form=e.target;if(form?.id!=='invoice-pro-form')return;
 const state=String(form.elements.estado?.value||'borrador').toLowerCase();if(['borrador','anulada'].includes(state))return;
 const number=String(form.elements.numero?.value||'').trim(),client=String(form.elements.cliente_id?.value||'').trim(),project=String(form.elements.proyecto_id?.value||'').trim(),lines=[...form.querySelectorAll('[data-invoice-line]')];
 const error=document.querySelector('#invoice-pro-error');let msg='',focus=null;
 if(!number){msg='<b>Falta el número de factura.</b><br>Puedes dejarlo vacío mientras sea borrador, pero para emitirla necesita numeración.';focus=form.elements.numero}
 else if(!client){msg='<b>Falta el cliente.</b><br>Selecciona el cliente antes de emitir la factura.';focus=form.elements.cliente_id}
 else if(!project){msg='<b>Falta el proyecto.</b><br>La factura emitida debe quedar vinculada a su proyecto para que la rentabilidad y los informes cuadren.';focus=form.elements.proyecto_id}
 else if(!lines.length){msg='<b>La factura no tiene líneas.</b><br>Añade al menos una línea antes de emitirla.'}
 if(msg){e.preventDefault();e.stopImmediatePropagation();if(error)error.innerHTML=`<div class="notice" style="background:#f6dfd7;color:#8f4d3c">${msg}</div>`;focus?.focus()}
},true);
})();

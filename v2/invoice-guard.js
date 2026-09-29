// Iriarte ERP V2 · validaciones de factura antes de guardar/emisión
(function(){
'use strict';
let timer;
const num=v=>{const n=Number(String(v??'').replace(',','.'));return Number.isFinite(n)?n:NaN};
function option(value,label=value,selected=false){const o=document.createElement('option');o.value=value;o.textContent=label;o.selected=selected;return o}
function mark(input,bad){if(!input)return;input.style.borderColor=bad?'#b65d4c':'';input.style.background=bad?'#fff7f4':''}
function numericIssue(form){
 const irpf=form.elements.irpf_pct,irpfValue=num(irpf?.value||0);if(!Number.isFinite(irpfValue)||irpfValue<0||irpfValue>100){mark(irpf,true);return {msg:'El IRPF debe estar entre 0% y 100%.',focus:irpf}}
 const rows=[...form.querySelectorAll('[data-invoice-line]')];
 for(let i=0;i<rows.length;i++){
   const row=rows[i],get=k=>row.querySelector(`[data-k="${k}"]`),q=get('cantidad'),p=get('precio_unitario'),d=get('descuento_pct'),v=get('iva_pct');
   const tests=[[q,num(q?.value)>=0,'cantidad'],[p,num(p?.value)>=0,'precio'],[d,num(d?.value)>=0&&num(d?.value)<=100,'descuento'],[v,num(v?.value)>=0&&num(v?.value)<=100,'IVA']];
   for(const [input,ok,label] of tests){if(!Number.isFinite(num(input?.value))||!ok){mark(input,true);return {msg:`Línea ${i+1}: ${label} fuera de rango. Cantidad y precio no pueden ser negativos; descuento e IVA deben estar entre 0% y 100%.`,focus:input}}}
 }
 return null
}
function dateIssue(form){const date=String(form.elements.fecha?.value||''),due=String(form.elements.fecha_vencimiento?.value||'');if(date&&due&&due<date){mark(form.elements.fecha_vencimiento,true);return {msg:'La fecha de vencimiento no puede ser anterior a la fecha de la factura.',focus:form.elements.fecha_vencimiento}}return null}
function enhance(){
 clearTimeout(timer);timer=setTimeout(()=>{
   const form=document.querySelector('#invoice-pro-form');if(!form)return;
   const state=form.elements.estado;if(state&&!Array.from(state.options).some(o=>o.value==='anulada'))state.appendChild(option('anulada','anulada'));
   if(form.dataset.numericGuard==='1')return;form.dataset.numericGuard='1';
   form.addEventListener('input',e=>{const input=e.target;if(input===form.elements.fecha||input===form.elements.fecha_vencimiento){const bad=!!(form.elements.fecha?.value&&form.elements.fecha_vencimiento?.value&&form.elements.fecha_vencimiento.value<form.elements.fecha.value);mark(form.elements.fecha_vencimiento,bad);return}if(!input.matches('[data-k="cantidad"],[data-k="precio_unitario"],[data-k="descuento_pct"],[data-k="iva_pct"],input[name="irpf_pct"]'))return;const k=input.dataset.k,v=num(input.value);let bad=!Number.isFinite(v);if(k==='cantidad'||k==='precio_unitario')bad=bad||v<0;else bad=bad||v<0||v>100;mark(input,bad)});
 },35)
}
new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});window.addEventListener('load',enhance);
document.addEventListener('submit',e=>{
 const form=e.target;if(form?.id!=='invoice-pro-form')return;
 const error=document.querySelector('#invoice-pro-error'),dates=dateIssue(form),numeric=numericIssue(form);
 if(dates||numeric){const issue=dates||numeric;e.preventDefault();e.stopImmediatePropagation();if(error)error.innerHTML=`<div class="notice" style="background:#f6dfd7;color:#8f4d3c"><b>Revisa la factura.</b><br>${issue.msg}</div>`;issue.focus?.focus();return}
 const fd=new FormData(form),state=String(fd.get('estado')||'borrador').toLowerCase();if(['borrador','anulada'].includes(state))return;
 const number=String(fd.get('numero')||'').trim(),client=String(fd.get('cliente_id')||'').trim(),project=String(fd.get('proyecto_id')||'').trim(),lines=[...form.querySelectorAll('[data-invoice-line]')];
 let msg='',focus=null;
 if(!number){msg='<b>Falta el número de factura.</b><br>Puedes dejarlo vacío mientras sea borrador, pero para emitirla necesita numeración.';focus=form.elements.numero}
 else if(!client){msg='<b>Falta el cliente.</b><br>Selecciona el cliente antes de emitir la factura.';focus=form.elements.cliente_id}
 else if(!project){msg='<b>Falta el proyecto.</b><br>La factura emitida debe quedar vinculada a su proyecto para que la rentabilidad y los informes cuadren.';focus=form.elements.proyecto_id}
 else if(!lines.length){msg='<b>La factura no tiene líneas.</b><br>Añade al menos una línea antes de emitirla.'}
 if(msg){e.preventDefault();e.stopImmediatePropagation();if(error)error.innerHTML=`<div class="notice" style="background:#f6dfd7;color:#8f4d3c">${msg}</div>`;if(focus?.focus)focus.focus()}
},true);
})();

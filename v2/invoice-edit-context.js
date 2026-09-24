// Iriarte ERP V2 · contexto del editor de facturas para guardado atómico
(function(){
'use strict';
window.__iriarteEditingInvoiceId=null;
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-action]');if(!b)return;
  const a=b.dataset.action||'';
  if(a==='new-invoice')window.__iriarteEditingInvoiceId=null;
  else if(a.startsWith('edit-invoice:'))window.__iriarteEditingInvoiceId=a.slice('edit-invoice:'.length)||null;
},true);
})();

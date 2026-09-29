// Iriarte ERP V2 · contactos inactivos visibles en histórico, no seleccionables como nuevos
(function(){
'use strict';
let timer;
function decorate(){
 const A=window.APP,D=A?.data;if(!D)return;
 const inactiveClients=new Set((D.clientes||[]).filter(x=>x.activo===false).map(x=>String(x.id)));
 const inactiveSuppliers=new Set((D.proveedores||[]).filter(x=>x.activo===false).map(x=>String(x.id)));
 document.querySelectorAll('select[name="cliente_id"],select[name="proveedor_id"]').forEach(select=>{
   const inactive=select.name==='cliente_id'?inactiveClients:inactiveSuppliers,current=String(select.value||'');
   [...select.options].forEach(o=>{
     const id=String(o.value||'');if(!id||!inactive.has(id))return;
     if(id===current){if(!/· inactivo$/.test(o.textContent))o.textContent+=' · inactivo';o.dataset.inactiveHistorical='1'}
     else o.remove();
   });
 });
}
function run(){clearTimeout(timer);timer=setTimeout(decorate,25)}
new MutationObserver(run).observe(document.body,{childList:true,subtree:true});
document.addEventListener('DOMContentLoaded',run);window.addEventListener('load',run);window.addEventListener('hashchange',run);
})();

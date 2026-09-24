// Iriarte ERP V2 · guardado atómico del editor de facturas
(function(){
'use strict';
const db=()=>window.__iriarteDb;
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[m]));
function collectLines(form){
  return [...form.querySelectorAll('[data-invoice-line]')].map(row=>{
    const val=k=>row.querySelector(`[data-k="${k}"]`)?.value??'';
    return {
      codigo:val('codigo'),seccion:val('seccion'),descripcion:val('descripcion'),ubicacion:val('ubicacion'),unidad:val('unidad')||'ud',
      cantidad:val('cantidad')||0,precio_unitario:val('precio_unitario')||0,descuento_pct:val('descuento_pct')||0,iva_pct:val('iva_pct')||21
    };
  });
}
function install(){
  const form=$('#invoice-pro-form');if(!form||form.dataset.atomicSave==='1')return;
  form.dataset.atomicSave='1';
  form.onsubmit=async e=>{
    e.preventDefault();const submit=e.submitter;if(submit)submit.disabled=true;
    const errorBox=$('#invoice-pro-error');if(errorBox)errorBox.innerHTML='';
    try{
      const client=db();if(!client)throw new Error('La conexión todavía no está preparada.');
      const cabecera=Object.fromEntries(new FormData(form).entries()),lineas=collectLines(form),facturaId=window.__iriarteEditingInvoiceId||null;
      const {data,error}=await client.rpc('guardar_factura_v2',{p_factura_id:facturaId,p_cabecera:cabecera,p_lineas:lineas});if(error)throw error;
      window.__iriarteEditingInvoiceId=data?.factura_id||facturaId||null;
      const root=$('#modal-root');if(root)root.innerHTML='';
      if(window.reloadIriarte)await window.reloadIriarte();else location.reload();
    }catch(err){
      if(errorBox)errorBox.innerHTML=`<div class="notice" style="background:#f6dfd7;color:#8f4d3c"><b>No se pudo guardar la factura.</b><br>${esc(err.message||err)}</div>`;
      if(submit)submit.disabled=false;
    }
  };
}
let timer;function schedule(){clearTimeout(timer);timer=setTimeout(install,0)}
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});window.addEventListener('load',schedule);
})();

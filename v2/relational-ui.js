// Iriarte ERP V2 · coherencia visible Proyecto -> Cliente en editores
(function(){
'use strict';
let timer;
function project(id){return (window.APP?.data?.proyectos||[]).find(x=>String(x.id)===String(id))||null}
function hidden(form,name,value,key){let x=form.querySelector(`input[type="hidden"][data-rel-hidden="${key}"]`);if(!x){x=document.createElement('input');x.type='hidden';x.name=name;x.dataset.relHidden=key;form.appendChild(x)}x.value=value||'';return x}
function unlock(select,key,form){select.disabled=false;form.querySelector(`input[data-rel-hidden="${key}"]`)?.remove()}
function lock(select,key,form,value){select.value=value||'';select.disabled=true;hidden(form,select.name,value,key)}

function invoiceEditor(){
 const form=document.querySelector('#invoice-pro-form');if(!form||form.dataset.relReady==='1')return;form.dataset.relReady='1';
 const projectSel=form.elements.proyecto_id,clientSel=form.elements.cliente_id,stateSel=form.elements.estado;if(!projectSel||!clientSel)return;
 const initiallyLocked=String(stateSel?.value||'borrador').toLowerCase()!=='borrador';
 const note=document.createElement('div');note.className='notice';note.style.marginTop='10px';note.dataset.relNote='invoice';form.querySelector('.form-grid')?.after(note);
 function sync(){
   const p=project(projectSel.value);
   if(initiallyLocked){
     lock(projectSel,'invoice-project',form,projectSel.value);lock(clientSel,'invoice-client',form,clientSel.value);
     note.innerHTML='<b>Contexto financiero bloqueado.</b> Una factura ya emitida no puede cambiar de cliente o proyecto. El resto de campos editables se conserva.';return
   }
   unlock(projectSel,'invoice-project',form);
   if(p){
     clientSel.value=p.cliente_id||'';lock(clientSel,'invoice-client',form,p.cliente_id||'');
     note.innerHTML=`<b>Cliente heredado del proyecto.</b> ${p.nombre||'El proyecto seleccionado'} determina automáticamente el cliente de la factura.`
   }else{
     unlock(clientSel,'invoice-client',form);note.innerHTML='<b>Factura sin proyecto.</b> Puedes elegir cliente manualmente; al seleccionar un proyecto, su cliente se aplicará automáticamente.'
   }
 }
 projectSel.addEventListener('change',sync);sync()
}

function budgetEditor(){
 const A=window.APP,p=A?.data?.presupuestos?.find(x=>String(x.id)===String(A?.sel?.budget));if(A?.route!=='presupuestos'||A.budgetView!=='edit'||!p)return;
 const select=document.querySelector('[data-budget-client]');if(!select)return;
 const pr=project(p.proyecto_id);
 if(!pr){select.disabled=false;select.title='';select.dataset.relLocked='';return}
 if(select.dataset.relLocked===String(pr.id)&&String(select.value)===String(pr.cliente_id||''))return;
 p.cliente_id=pr.cliente_id||null;select.value=pr.cliente_id||'';select.disabled=true;select.dataset.relLocked=String(pr.id);select.title='El cliente se hereda del proyecto vinculado.';
 const meta=select.closest('.budget-meta');if(meta&&!meta.parentElement.querySelector('[data-rel-budget-note]')){const n=document.createElement('div');n.className='notice';n.dataset.relBudgetNote='1';n.style.margin='0 0 12px';n.innerHTML='<b>Cliente vinculado al proyecto.</b> Para evitar incoherencias contables, cambia el cliente desde el proyecto antes de crear documentos financieros.';meta.before(n)}
}
function run(){clearTimeout(timer);timer=setTimeout(()=>{invoiceEditor();budgetEditor()},50)}
new MutationObserver(run).observe(document.body,{childList:true,subtree:true});window.addEventListener('load',run);window.addEventListener('hashchange',run);document.addEventListener('iriarte:route',run);
})();

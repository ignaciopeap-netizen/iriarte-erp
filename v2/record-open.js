// Iriarte ERP V2 · apertura canónica de registros desde vistas transversales
(function(){
'use strict';
const db=()=>window.__iriarteDb;
function route(name){if(window.iriarteRoute)window.iriarteRoute(name);else location.hash='#'+name}
function storedLocation(raw){
 const v=String(raw||'');if(!v)return null;
 const parts=v.split('/').filter(Boolean);
 if(parts[0]==='documentos'||parts[0]==='obra-fotos')return {bucket:parts[0],path:parts.slice(1).join('/')};
 return {bucket:'documentos',path:v};
}
async function openDocument(id){
 const client=db(),doc=(window.APP?.data?.docs||[]).find(x=>String(x.id)===String(id));if(!client||!doc)return;
 const loc=storedLocation(doc.archivo_ruta);if(!loc?.path){alert('Este documento no tiene un archivo almacenado.');return}
 const tab=window.open('about:blank','_blank');
 if(tab){try{tab.opener=null;tab.document.title='Abriendo documento…';tab.document.body.innerHTML='<p style="font-family:Arial,sans-serif;padding:24px">Abriendo documento privado…</p>'}catch(_){}}
 const {data,error}=await client.storage.from(loc.bucket).createSignedUrl(loc.path,120);
 if(error){try{tab?.close()}catch(_){}alert('No se pudo abrir el documento:\n'+error.message);return}
 if(tab){tab.location.replace(data.signedUrl);return}
 alert('El navegador ha bloqueado la nueva pestaña. Permite ventanas emergentes para abrir el documento.');
}
function open(type,id){
 if(!id)return;
 if(type==='document')return openDocument(id);
 const cfg={
  project:['iriarte_open_project','proyectos'],
  budget:['iriarte_open_budget','presupuestos'],
  invoice:['iriarte_open_invoice','facturas'],
  purchase:['iriarte_open_purchase','compras']
 }[type];
 if(!cfg)return;
 const [key,destination]=cfg;localStorage.setItem(key,String(id));
 if(type==='project'&&window.APP)window.APP.sel.project=id;
 if(type==='budget'&&window.APP){const p=(window.APP.data?.presupuestos||[]).find(x=>String(x.id)===String(id));window.APP.budgetKind=(p?.kind||'obra')==='honorarios'?'honorarios':'obra';window.APP.sel.budget=id;window.APP.budgetView='edit'}
 route(destination);
}
window.iriarteOpenRecord=open;
window.iriarteOpenDocument=openDocument;
})();

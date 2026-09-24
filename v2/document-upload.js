// Iriarte ERP V2 · subida real de documentos a Supabase Storage
(function(){
'use strict';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const today=()=>new Date().toISOString().slice(0,10);
const db=()=>window.__iriarteDb;

function options(rows,value,label){
  return '<option value="">—</option>'+(rows||[]).map(x=>`<option value="${esc(x.id)}" ${String(x.id)===String(value)?'selected':''}>${esc(label(x))}</option>`).join('');
}
function safeName(name){
  return String(name||'documento').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]+/g,'_').replace(/_+/g,'_').slice(-140);
}
function kind(file){
  const t=String(file?.type||'').toLowerCase(),n=String(file?.name||'').toLowerCase();
  if(t.includes('pdf')||n.endsWith('.pdf'))return 'PDF';
  if(t.startsWith('image/'))return 'Imagen';
  if(/spreadsheet|excel/.test(t)||/\.(xlsx?|csv)$/.test(n))return 'Hoja de cálculo';
  if(/word|document/.test(t)||/\.(docx?|odt)$/.test(n))return 'Documento';
  if(/zip|compressed/.test(t)||/\.(zip|rar|7z)$/.test(n))return 'Archivo comprimido';
  return 'Archivo';
}
function storedLocation(raw){
  const v=String(raw||'');if(!v)return null;
  const parts=v.split('/').filter(Boolean);
  if(parts[0]==='documentos'||parts[0]==='obra-fotos')return {bucket:parts[0],path:parts.slice(1).join('/')};
  return {bucket:'documentos',path:v};
}

function openUploader(){
  const client=db();if(!client){alert('La conexión con la base de datos todavía no está preparada.');return}
  const S=window.APP?.data||{},selectedProject=window.APP?.sel?.project||'';
  const root=$('#modal-root');
  root.innerHTML=`<div class="modal-backdrop"><div class="modal" style="width:min(860px,96vw)">
    <div class="modal-head"><div><h2>Subir documento</h2><small style="color:var(--muted)">El archivo queda guardado en el almacenamiento privado del ERP y vinculado a su ficha.</small></div><div class="grow"></div><button class="btn" type="button" data-du-close>Cerrar</button></div>
    <form id="du-form"><div class="modal-body">
      <div class="form-grid">
        <label class="full">Archivo<input id="du-file" name="file" type="file" required style="display:block;width:100%;margin-top:6px"></label>
        <label class="full">Nombre en el ERP<input name="nombre" placeholder="Se completa con el nombre del archivo si lo dejas vacío"></label>
        <label>Tipo<input name="tipo" placeholder="PDF, plano, factura, contrato…"></label>
        <label>Fecha del documento<input name="fecha_documento" type="date" value="${today()}"></label>
        <label>Proyecto<select name="proyecto_id">${options(S.proyectos,selectedProject,x=>x.nombre)}</select></label>
        <label>Cliente<select name="cliente_id">${options(S.clientes,'',x=>x.nombre)}</select></label>
        <label>Proveedor<select name="proveedor_id">${options(S.proveedores,'',x=>x.nombre)}</select></label>
        <label>Factura<select name="factura_id">${options(S.facturas,'',x=>(x.numero||'Borrador')+' · '+(x.concepto||''))}</select></label>
        <label>Compra<select name="compra_id">${options(S.compras,'',x=>(x.numero_factura||x.concepto||'Compra'))}</select></label>
        <label class="full">Descripción<textarea name="descripcion" placeholder="Qué contiene o para qué sirve"></textarea></label>
        <label class="full">Notas internas<textarea name="notas"></textarea></label>
      </div>
      <div id="du-progress" class="notice" style="display:none"></div><div id="du-error"></div>
    </div><div class="modal-foot"><button class="btn" type="button" data-du-close>Cancelar</button><button class="btn primary" type="submit">Subir y guardar</button></div></form>
  </div></div>`;
  const close=()=>root.innerHTML='';root.querySelectorAll('[data-du-close]').forEach(b=>b.onclick=close);
  const fileInput=$('#du-file');
  fileInput.onchange=()=>{const f=fileInput.files?.[0];if(!f)return;const form=$('#du-form');if(!form.elements.nombre.value)form.elements.nombre.value=f.name;if(!form.elements.tipo.value)form.elements.tipo.value=kind(f)};
  $('#du-form').onsubmit=async e=>{
    e.preventDefault();const submit=e.submitter,progress=$('#du-progress'),errorBox=$('#du-error');submit.disabled=true;errorBox.innerHTML='';
    let uploadedPath='';
    try{
      const f=fileInput.files?.[0];if(!f)throw new Error('Selecciona un archivo.');
      const vals=Object.fromEntries(new FormData(e.currentTarget).entries());
      const folder=vals.proyecto_id||'general';
      uploadedPath=`${folder}/${Date.now()}-${crypto.randomUUID?.()||Math.random().toString(36).slice(2)}-${safeName(f.name)}`;
      progress.style.display='block';progress.textContent=`Subiendo ${f.name}…`;
      const up=await client.storage.from('documentos').upload(uploadedPath,f,{cacheControl:'3600',upsert:false,contentType:f.type||undefined});if(up.error)throw up.error;
      progress.textContent='Archivo subido. Guardando la ficha…';
      const payload={
        proyecto_id:vals.proyecto_id||null,cliente_id:vals.cliente_id||null,proveedor_id:vals.proveedor_id||null,
        factura_id:vals.factura_id||null,compra_id:vals.compra_id||null,
        nombre:(vals.nombre||f.name).trim(),tipo:vals.tipo||kind(f),descripcion:vals.descripcion||null,
        archivo_nombre:f.name,archivo_ruta:'documentos/'+uploadedPath,mime_type:f.type||null,tamano_bytes:f.size,
        fecha_documento:vals.fecha_documento||null,notas:vals.notas||null
      };
      const ins=await client.from('documentos').insert(payload);if(ins.error)throw ins.error;
      close();if(window.reloadIriarte)await window.reloadIriarte();else location.reload();
    }catch(err){
      if(uploadedPath){try{await client.storage.from('documentos').remove([uploadedPath])}catch(_){}}
      progress.style.display='none';errorBox.innerHTML=`<div class="notice" style="background:#f6dfd7;color:#8f4d3c"><b>No se pudo guardar el documento.</b><br>${esc(err.message||err)}</div>`;submit.disabled=false;
    }
  };
}

async function removeDocument(id){
  const client=db(),doc=(window.APP?.data?.docs||[]).find(x=>String(x.id)===String(id));if(!client||!doc)return;
  if(!confirm(`¿Eliminar “${doc.nombre||doc.archivo_nombre||'este documento'}”? Se borrará también el archivo almacenado.`))return;
  try{
    const loc=storedLocation(doc.archivo_ruta);
    if(loc?.path){const r=await client.storage.from(loc.bucket).remove([loc.path]);if(r.error&&!/not found|not_found|404/i.test(r.error.message||''))throw r.error}
    const del=await client.from('documentos').delete().eq('id',id);if(del.error)throw del.error;
    if(window.reloadIriarte)await window.reloadIriarte();else location.reload();
  }catch(err){alert('No se pudo eliminar el documento:\n'+(err.message||err))}
}

document.addEventListener('click',e=>{
  const create=e.target.closest('[data-action="new-doc"]');
  if(create){e.preventDefault();e.stopImmediatePropagation();openUploader();return}
  const del=e.target.closest('[data-op-delete^="documentos:"]');
  if(del){e.preventDefault();e.stopImmediatePropagation();removeDocument(del.dataset.opDelete.split(':')[1])}
},true);
})();

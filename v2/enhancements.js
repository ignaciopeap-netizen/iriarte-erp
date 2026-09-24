// Iriarte ERP V2 · CRUD aligned with the verified Supabase schema
(function(){
  'use strict';

  const SUPABASE_URL='https://kzmjeccivhkhtuokfkta.supabase.co';
  const SUPABASE_KEY='sb_publishable_YBf9vRaOlVQBHM4ionZLPw_TIIxZY9G';
  const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const num=v=>Number(String(v??0).replace(',','.'))||0;
  const today=()=>new Date().toISOString().slice(0,10);

  function opts(arr,value,label='nombre'){
    return '<option value="">—</option>'+(arr||[]).map(x=>`<option value="${esc(x.id)}" ${String(x.id)===String(value)?'selected':''}>${esc(x[label]||x.name||'')}</option>`).join('');
  }
  function modal(title,html,onSubmit){
    const root=$('#modal-root');
    root.innerHTML=`<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h2>${esc(title)}</h2><div class="grow"></div><button class="btn" type="button" data-v2-close>Cerrar</button></div><form id="v2-extra-form"><div class="modal-body">${html}<div id="v2-extra-error"></div></div><div class="modal-foot"><button class="btn" type="button" data-v2-close>Cancelar</button><button class="btn primary" type="submit">Guardar</button></div></form></div></div>`;
    const close=()=>root.innerHTML='';
    root.querySelectorAll('[data-v2-close]').forEach(x=>x.onclick=close);
    $('#v2-extra-form').onsubmit=async e=>{
      e.preventDefault();const submit=e.submitter;submit.disabled=true;
      try{const fd=Object.fromEntries(new FormData(e.currentTarget).entries());await onSubmit(fd,e.currentTarget);close();location.reload()}
      catch(err){$('#v2-extra-error').innerHTML=`<div class="notice" style="background:#f6dfd7;color:#8f4d3c">${esc(err.message||err)}</div>`;submit.disabled=false}
    };
  }
  async function insert(table,payload){const {error}=await db.from(table).insert(payload);if(error)throw error}

  function purchaseForm(){
    const S=window.APP||{data:{},sel:{}};
    modal('Nueva compra',`<div class="form-grid">
      <label>Fecha<input name="fecha" type="date" value="${today()}" required></label>
      <label>Nº factura<input name="numero_factura"></label>
      <label>Proveedor<select name="proveedor_id">${opts(S.data.proveedores)}</select></label>
      <label>Proyecto<select name="proyecto_id">${opts(S.data.proyectos,S.sel.project)}</select></label>
      <label class="full">Concepto<input name="concepto" required></label>
      <label>Base imponible<input name="base" type="number" step="0.01" value="0"></label>
      <label>IVA %<input name="iva_pct" type="number" step="0.01" value="21"></label>
      <label>Estado<select name="estado"><option>pendiente</option><option>pagada</option><option>anulada</option></select></label>
      <label>Vencimiento<input name="fecha_vencimiento" type="date"></label>
      <label class="full">Notas<textarea name="notas"></textarea></label>
    </div>`,async f=>{
      const base=num(f.base),pct=num(f.iva_pct),iva=base*pct/100;
      await insert('compras',{fecha:f.fecha,numero_factura:f.numero_factura||null,proveedor_id:f.proveedor_id||null,proyecto_id:f.proyecto_id||null,concepto:f.concepto,base,iva_pct:pct,iva_importe:iva,total:base+iva,estado:f.estado||'pendiente',fecha_vencimiento:f.fecha_vencimiento||null,notas:f.notas||null});
    });
  }

  function taskForm(){
    const S=window.APP||{data:{},sel:{}};
    modal('Nueva tarea de obra',`<div class="form-grid">
      <label>Proyecto<select name="project_id" required>${opts(S.data.proyectos,S.sel.project)}</select></label>
      <label>Prioridad<select name="prioridad"><option>baja</option><option selected>normal</option><option>alta</option><option>urgente</option></select></label>
      <label class="full">Título<input name="titulo" required></label>
      <label>Fecha límite<input name="fecha_limite" type="date"></label>
      <label class="full">Descripción<textarea name="descripcion"></textarea></label>
    </div>`,async f=>insert('obra_tareas',{project_id:f.project_id,titulo:f.titulo,descripcion:f.descripcion||null,estado:'pendiente',prioridad:f.prioridad||'normal',fecha_limite:f.fecha_limite||null}));
  }

  function visitForm(){
    const S=window.APP||{data:{},sel:{}};
    modal('Nueva visita de obra',`<div class="form-grid">
      <label>Proyecto<select name="project_id" required>${opts(S.data.proyectos,S.sel.project)}</select></label>
      <label>Fecha<input name="fecha" type="date" value="${today()}" required></label>
      <label class="full">Título<input name="titulo" value="Visita de seguimiento" required></label>
      <label>Estado de obra<input name="estado_obra"></label>
      <label>Asistentes<input name="asistentes"></label>
      <label class="full">Descripción<textarea name="descripcion"></textarea></label>
      <label class="full">Observaciones<textarea name="observaciones"></textarea></label>
    </div>`,async f=>insert('obra_visitas',{project_id:f.project_id,fecha:f.fecha,titulo:f.titulo,descripcion:f.descripcion||null,asistentes:f.asistentes||null,estado_obra:f.estado_obra||null,observaciones:f.observaciones||null}));
  }

  function incidentForm(){
    const S=window.APP||{data:{},sel:{}};
    modal('Nueva incidencia',`<div class="form-grid">
      <label>Proyecto<select name="project_id" required>${opts(S.data.proyectos,S.sel.project)}</select></label>
      <label>Prioridad<select name="prioridad"><option>baja</option><option selected>normal</option><option>alta</option><option>urgente</option></select></label>
      <label class="full">Título<input name="titulo" required></label>
      <label>Tipo<input name="tipo"></label>
      <label>Proveedor<select name="proveedor_id">${opts(S.data.proveedores)}</select></label>
      <label class="full">Descripción<textarea name="descripcion"></textarea></label>
    </div>`,async f=>insert('obra_incidencias',{project_id:f.project_id,titulo:f.titulo,descripcion:f.descripcion||null,tipo:f.tipo||null,prioridad:f.prioridad||'normal',estado:'abierta',proveedor_id:f.proveedor_id||null}));
  }

  function hourForm(){
    const S=window.APP||{data:{},sel:{}};
    modal('Registrar horas',`<div class="form-grid">
      <label>Proyecto<select name="proyecto_id" required>${opts(S.data.proyectos,S.sel.project)}</select></label>
      <label>Persona<input name="persona" required></label>
      <label>Fecha<input name="fecha" type="date" value="${today()}" required></label>
      <label>Horas<input name="horas" type="number" step="0.1" min="0" value="1"></label>
      <label>Coste/hora histórico<input name="coste_hora" type="number" step="0.01" min="0" value="0"></label>
      <label class="full">Concepto<textarea name="concepto"></textarea></label>
      <label class="full">Notas<textarea name="notas"></textarea></label>
    </div>`,async f=>insert('horas_proyecto',{proyecto_id:f.proyecto_id,persona:f.persona,fecha:f.fecha,horas:num(f.horas),coste_hora:num(f.coste_hora),concepto:f.concepto||null,notas:f.notas||null}));
  }

  function documentForm(){
    const S=window.APP||{data:{},sel:{}};
    modal('Subir documento',`<div class="form-grid">
      <label>Proyecto<select name="proyecto_id">${opts(S.data.proyectos,S.sel.project)}</select></label>
      <label>Tipo<input name="tipo" value="Documento"></label>
      <label class="full">Archivo<input id="v2-doc-file" type="file" required></label>
      <label class="full">Descripción<textarea name="descripcion"></textarea></label>
      <label class="full">Notas<textarea name="notas"></textarea></label>
    </div>`,async f=>{
      const file=$('#v2-doc-file').files[0];if(!file)throw new Error('Selecciona un archivo');
      const safe=file.name.replace(/[^\w.\-áéíóúñ]+/gi,'_'),path=`${f.proyecto_id||'general'}/${Date.now()}-${safe}`;
      let bucket=null,stored=null,last=null;
      for(const candidate of ['obra-fotos','documentos']){const r=await db.storage.from(candidate).upload(path,file,{upsert:false});if(!r.error){bucket=candidate;stored=r.data.path;break}last=r.error}
      if(!stored)throw last||new Error('No hay bucket disponible para documentos');
      await insert('documentos',{proyecto_id:f.proyecto_id||null,nombre:file.name,tipo:f.tipo||'Documento',descripcion:f.descripcion||null,archivo_nombre:file.name,archivo_ruta:`${bucket}/${stored}`,mime_type:file.type||null,tamano_bytes:file.size,fecha_documento:today(),notas:f.notas||null});
    });
  }

  function overheadForm(){
    const S=window.APP||{data:{},sel:{}};
    modal('Nuevo gasto general',`<div class="form-grid">
      <label>Fecha<input name="fecha" type="date" value="${today()}" required></label>
      <label>Categoría<input name="categoria" value="Otros"></label>
      <label class="full">Concepto<input name="concepto" required></label>
      <label>Proveedor<select name="proveedor_id">${opts(S.data.proveedores)}</select></label>
      <label>Proyecto (opcional)<select name="proyecto_id">${opts(S.data.proyectos,S.sel.project)}</select></label>
      <label>Base<input name="base" type="number" step="0.01" value="0"></label>
      <label>IVA %<input name="iva_pct" type="number" step="0.01" value="21"></label>
      <label>Pagado<select name="pagado"><option value="false">No</option><option value="true">Sí</option></select></label>
      <label>Cuenta<input name="cuenta"></label>
      <label class="full">Notas<textarea name="notas"></textarea></label>
    </div>`,async f=>{
      const base=num(f.base),pct=num(f.iva_pct),iva=base*pct/100;
      await insert('gastos_generales',{fecha:f.fecha,categoria:f.categoria||'Otros',concepto:f.concepto,proveedor_id:f.proveedor_id||null,proyecto_id:f.proyecto_id||null,criterio_reparto:f.proyecto_id?'directo':'sin_repartir',base,iva_pct:pct,iva_importe:iva,total:base+iva,pagado:f.pagado==='true',cuenta:f.cuenta||null,notas:f.notas||null});
    });
  }

  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-action]');if(!b)return;
    const supported={'new-purchase':purchaseForm,'new-task':taskForm,'new-visit':visitForm,'new-incident':incidentForm,'new-hour':hourForm,'new-doc':documentForm,'new-overhead':overheadForm};
    const fn=supported[b.dataset.action];if(fn){e.preventDefault();e.stopImmediatePropagation();fn()}
  },true);
})();

// Iriarte ERP V2 · espacios operativos de Obra, Documentos y Horas
(function(){
  'use strict';
  const URL='https://kzmjeccivhkhtuokfkta.supabase.co';
  const KEY='sb_publishable_YBf9vRaOlVQBHM4ionZLPw_TIIxZY9G';
  const db=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const money=v=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v||0));
  const num=v=>Number(v||0);
  let timer=false;

  function projectId(){const S=window.APP;return S?.sel?.project||S?.data?.proyectos?.[0]?.id||''}
  function projectSelect(pid){const rows=window.APP?.data?.proyectos||[];return `<select class="btn" data-op-project><option value="">Todos los proyectos</option>${rows.map(p=>`<option value="${esc(p.id)}" ${String(p.id)===String(pid)?'selected':''}>${esc(p.nombre)}</option>`).join('')}</select>`}
  function pName(id){return (window.APP?.data?.proyectos||[]).find(p=>String(p.id)===String(id))?.nombre||'—'}
  function badge(s){const val=String(s||'—');const c=/complet|resuelt|cerrad/i.test(val)?'good':/cancel/i.test(val)?'bad':'warn';return `<span class="badge ${c}">${esc(val.replaceAll('_',' '))}</span>`}
  function empty(t='No hay registros.'){return `<div class="empty">${esc(t)}</div>`}
  function btn(t,a,cls=''){return `<button class="btn ${cls}" data-action="${a}">${esc(t)}</button>`}

  function renderObra(){
    const S=window.APP,pid=projectId();if(!S)return;
    const visits=(S.data.visitas||[]).filter(x=>!pid||String(x.project_id)===String(pid));
    const tasks=(S.data.tareas||[]).filter(x=>!pid||String(x.project_id)===String(pid));
    const incidents=(S.data.incidencias||[]).filter(x=>!pid||String(x.project_id)===String(pid));
    $('#app-view').innerHTML=`<div id="op-workspace"><div class="page-head"><h1>Obra</h1><div class="grow"></div><div class="toolbar">${projectSelect(pid)}${btn('+ Visita','new-visit','primary')}${btn('+ Tarea','new-task')}${btn('+ Incidencia','new-incident')}</div></div>
    ${pid?`<div class="notice"><b>${esc(pName(pid))}</b> · seguimiento de obra, tareas e incidencias del mismo proyecto.</div>`:''}
    <div class="grid cols-3">
      <section class="card panel"><h3>Visitas</h3>${visits.length?visits.map(v=>`<div class="master-item"><b>${esc(v.titulo||'Visita de obra')}</b><small>${esc(v.fecha||'')} · ${esc(v.estado_obra||'')}</small><div style="margin-top:5px">${esc(v.descripcion||v.observaciones||'')}</div><div class="toolbar" style="margin-top:7px"><button class="btn danger" data-op-delete="obra_visitas:${v.id}">Eliminar</button></div></div>`).join(''):empty('Todavía no hay visitas.')}</section>
      <section class="card panel"><h3>Tareas</h3>${tasks.length?tasks.map(t=>`<div class="master-item"><b>${esc(t.titulo||'Tarea')}</b><small>${esc(t.fecha_limite||'Sin fecha límite')} · ${esc(t.prioridad||'normal')}</small><div style="margin:5px 0">${esc(t.descripcion||'')}</div>${badge(t.estado)}<div class="toolbar" style="margin-top:7px">${!/complet|hecha|cancel/i.test(t.estado||'')?`<button class="btn primary" data-op-task-complete="${t.id}">Completar</button>`:''}<button class="btn danger" data-op-delete="obra_tareas:${t.id}">Eliminar</button></div></div>`).join(''):empty('Todavía no hay tareas.')}</section>
      <section class="card panel"><h3>Incidencias</h3>${incidents.length?incidents.map(i=>`<div class="master-item"><b>${esc(i.titulo||'Incidencia')}</b><small>${esc(i.tipo||'')} · ${esc(i.prioridad||'normal')}</small><div style="margin:5px 0">${esc(i.descripcion||'')}</div>${badge(i.estado)}<div class="toolbar" style="margin-top:7px">${!/resuelt|cerrad/i.test(i.estado||'')?`<button class="btn primary" data-op-incident-resolve="${i.id}">Resolver</button>`:''}<button class="btn danger" data-op-delete="obra_incidencias:${i.id}">Eliminar</button></div></div>`).join(''):empty('No hay incidencias abiertas.')}</section>
    </div></div>`;
  }

  function renderHours(){
    const S=window.APP,pid=projectId();if(!S)return;
    const rows=(S.data.horas||[]).filter(x=>!pid||String(x.proyecto_id)===String(pid));
    const hours=rows.reduce((a,x)=>a+num(x.horas),0),cost=rows.reduce((a,x)=>a+num(x.horas)*num(x.coste_hora),0);
    $('#app-view').innerHTML=`<div id="op-workspace"><div class="page-head"><h1>Horas</h1><div class="grow"></div><div class="toolbar">${projectSelect(pid)}${btn('+ Registrar horas','new-hour','primary')}</div></div><div class="grid cols-4"><div class="card kpi"><small>Horas</small><strong>${hours.toFixed(1)}</strong></div><div class="card kpi"><small>Coste imputado</small><strong>${money(cost)}</strong></div><div class="card kpi"><small>Personas</small><strong>${new Set(rows.map(x=>x.persona).filter(Boolean)).size}</strong></div><div class="card kpi"><small>Registros</small><strong>${rows.length}</strong></div></div>${rows.length?`<div class="card panel table-wrap" style="margin-top:14px"><table class="table"><tr><th>Fecha</th><th>Persona</th><th>Proyecto</th><th>Concepto</th><th>Horas</th><th>Coste/h</th><th>Total</th><th></th></tr>${rows.map(x=>`<tr><td>${esc(x.fecha||'')}</td><td><b>${esc(x.persona||'')}</b></td><td>${esc(pName(x.proyecto_id))}</td><td>${esc(x.concepto||'')}</td><td>${num(x.horas).toFixed(1)}</td><td>${money(x.coste_hora)}</td><td>${money(num(x.horas)*num(x.coste_hora))}</td><td><button class="btn danger" data-op-delete="horas_proyecto:${x.id}">Eliminar</button></td></tr>`).join('')}</table></div>`:empty('No hay horas registradas para este proyecto.')}</div>`;
  }

  function renderDocs(){
    const S=window.APP,pid=projectId();if(!S)return;
    const rows=(S.data.docs||[]).filter(x=>!pid||String(x.proyecto_id)===String(pid));
    $('#app-view').innerHTML=`<div id="op-workspace"><div class="page-head"><h1>Documentos</h1><div class="grow"></div><div class="toolbar">${projectSelect(pid)}${btn('+ Subir documento','new-doc','primary')}</div></div>${rows.length?`<div class="card panel table-wrap"><table class="table"><tr><th>Nombre</th><th>Proyecto</th><th>Tipo</th><th>Fecha</th><th>Tamaño</th><th></th></tr>${rows.map(x=>`<tr><td><b>${esc(x.nombre||x.archivo_nombre||'Documento')}</b><br><small>${esc(x.descripcion||'')}</small></td><td>${esc(pName(x.proyecto_id))}</td><td>${esc(x.tipo||'')}</td><td>${esc(x.fecha_documento||String(x.created_at||'').slice(0,10))}</td><td>${x.tamano_bytes?Math.round(Number(x.tamano_bytes)/1024)+' KB':'—'}</td><td><div class="toolbar"><button class="btn" data-op-doc-open="${x.id}">Abrir</button><button class="btn danger" data-op-delete="documentos:${x.id}">Eliminar</button></div></td></tr>`).join('')}</table></div>`:empty('No hay documentos asociados.')}</div>`;
  }

  async function openDoc(id){
    const d=(window.APP?.data?.docs||[]).find(x=>String(x.id)===String(id));if(!d)return;
    const raw=d.archivo_ruta||'';if(!raw){alert('Este documento no tiene una ruta de almacenamiento.');return}
    let bucket='obra-fotos',path=raw;
    if(raw.includes('/')){const first=raw.split('/')[0];if(first==='obra-fotos'||first==='documentos'){bucket=first;path=raw.split('/').slice(1).join('/')}}
    const {data,error}=await db.storage.from(bucket).createSignedUrl(path,120);if(error){alert(error.message);return}window.open(data.signedUrl,'_blank','noopener');
  }
  async function remove(table,id){if(!confirm('¿Eliminar este registro?'))return;const {error}=await db.from(table).delete().eq('id',id);if(error){alert(error.message);return}location.reload()}
  async function completeTask(id){const {error}=await db.from('obra_tareas').update({estado:'completada',fecha_completada:new Date().toISOString().slice(0,10)}).eq('id',id);if(error)alert(error.message);else location.reload()}
  async function resolveIncident(id){const {error}=await db.from('obra_incidencias').update({estado:'resuelta',fecha_resolucion:new Date().toISOString().slice(0,10)}).eq('id',id);if(error)alert(error.message);else location.reload()}

  function enhance(){clearTimeout(timer);timer=setTimeout(()=>{const route=window.APP?.route;if(!['obra','horas','documentos'].includes(route))return;if($('#op-workspace'))return;if(route==='obra')renderObra();else if(route==='horas')renderHours();else renderDocs()},80)}
  new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});window.addEventListener('hashchange',enhance);window.addEventListener('load',enhance);
  document.addEventListener('change',e=>{if(e.target.matches('[data-op-project]')){window.APP.sel.project=e.target.value;const route=window.APP.route;if(route==='obra')renderObra();else if(route==='horas')renderHours();else if(route==='documentos')renderDocs()}},true);
  document.addEventListener('click',e=>{const b=e.target.closest('[data-op-delete],[data-op-doc-open],[data-op-task-complete],[data-op-incident-resolve]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();if(b.dataset.opDelete){const [table,id]=b.dataset.opDelete.split(':');remove(table,id)}else if(b.dataset.opDocOpen)openDoc(b.dataset.opDocOpen);else if(b.dataset.opTaskComplete)completeTask(b.dataset.opTaskComplete);else if(b.dataset.opIncidentResolve)resolveIncident(b.dataset.opIncidentResolve)},true);
})();

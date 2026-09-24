// Iriarte ERP V2 · altas completas de clientes y proveedores
(function(){
'use strict';
const db=()=>window.__iriarteDb;
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const num=v=>Number(String(v??0).replace(',','.'))||0;
function modal(title,body,onSave){
 const root=$('#modal-root');root.innerHTML=`<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h2>${esc(title)}</h2><div class="grow"></div><button type="button" class="btn" data-cc-close>Cerrar</button></div><form id="cc-form"><div class="modal-body">${body}<div id="cc-error"></div></div><div class="modal-foot"><button type="button" class="btn" data-cc-close>Cancelar</button><button type="submit" class="btn primary">Guardar</button></div></form></div></div>`;
 const close=()=>root.innerHTML='';root.querySelectorAll('[data-cc-close]').forEach(b=>b.onclick=close);
 $('#cc-form').onsubmit=async e=>{e.preventDefault();const submit=e.submitter;submit.disabled=true;try{await onSave(Object.fromEntries(new FormData(e.currentTarget).entries()));close();if(window.reloadIriarte)await window.reloadIriarte();else location.reload()}catch(err){$('#cc-error').innerHTML=`<div class="notice" style="background:#f6dfd7;color:#8f4d3c">${esc(err.message||err)}</div>`;submit.disabled=false}};
}
function client(){modal('Nuevo cliente',`<div class="form-grid">
 <label class="full">Nombre / razón social<input name="nombre" required autofocus></label>
 <label>CIF / NIF<input name="cif"></label><label>IRPF %<input name="irpf" type="number" step="0.01" value="0"></label>
 <label>Persona de contacto<input name="contacto"></label><label>Email<input name="email" type="email"></label>
 <label>Teléfono<input name="telefono"></label><label>Teléfono 2<input name="telefono2"></label>
 <label class="full">Dirección<input name="direccion"></label><label>Código postal<input name="codigo_postal"></label>
 <label>Población<input name="poblacion"></label><label>Provincia<input name="provincia"></label>
 <label class="full">Notas<textarea name="notas"></textarea></label>
 </div>`,async f=>{const payload={nombre:f.nombre,cif:f.cif||null,irpf:num(f.irpf),contacto:f.contacto||null,email:f.email||null,telefono:f.telefono||null,telefono2:f.telefono2||null,direccion:f.direccion||null,codigo_postal:f.codigo_postal||null,poblacion:f.poblacion||null,provincia:f.provincia||null,notas:f.notas||null,activo:true};const {error}=await db().from('clientes').insert(payload);if(error)throw error})}
function supplier(){modal('Nuevo proveedor',`<div class="form-grid">
 <label class="full">Nombre / razón social<input name="nombre" required autofocus></label>
 <label>CIF<input name="cif"></label><label>Tipo<input name="tipo" placeholder="Vivero, construcción, riego, iluminación…"></label>
 <label>Persona de contacto<input name="contacto"></label><label>Email<input name="email" type="email"></label>
 <label>Teléfono<input name="telefono"></label><label>Web<input name="web"></label><label>Zona<input name="zona"></label>
 <label class="full">Descripción<textarea name="descripcion"></textarea></label><label class="full">Notas<textarea name="notas"></textarea></label>
 </div>`,async f=>{const payload={nombre:f.nombre,cif:f.cif||null,tipo:f.tipo||null,contacto:f.contacto||null,email:f.email||null,telefono:f.telefono||null,web:f.web||null,zona:f.zona||null,descripcion:f.descripcion||null,notas:f.notas||null,activo:true};const {error}=await db().from('proveedores').insert(payload);if(error)throw error})}
document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;if(b.dataset.action==='new-client'){e.preventDefault();e.stopImmediatePropagation();client()}else if(b.dataset.action==='new-supplier'){e.preventDefault();e.stopImmediatePropagation();supplier()}},true);
})();

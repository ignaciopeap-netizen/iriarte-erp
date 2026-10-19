(function(root){
'use strict';
const clean=v=>String(v??'').trim(), norm=v=>clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,''), tax=v=>clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
const fields={nombre:['Nombre / razón social','nombre','razon social','nombre fiscal','cliente','proveedor','empresa','name'],cif:['NIF / CIF','nif','cif','nif cif','cif nif','dni','identificacion fiscal','vat'],contacto:['Persona de contacto','contacto','persona de contacto'],email:['Correo electrónico','email','correo','correo electronico','e mail'],telefono:['Teléfono','telefono','telefono 1','movil','phone'],telefono2:['Teléfono 2','telefono2','telefono 2'],direccion:['Dirección','direccion','domicilio','domicilio fiscal','direccion fiscal'],codigo_postal:['Código postal','codigo postal','cp','c postal'],poblacion:['Población','poblacion','ciudad','municipio','localidad'],provincia:['Provincia','provincia'],irpf:['IRPF %','irpf','retencion'],tipo:['Tipo','tipo','categoria'],web:['Web','web','pagina web','sitio web'],zona:['Zona','zona'],descripcion:['Descripción','descripcion'],activo:['Activo','activo','estado'],notas:['Notas','notas','observaciones']};
const keys=table=>table==='clientes'?['nombre','cif','contacto','email','telefono','telefono2','direccion','codigo_postal','poblacion','provincia','irpf','activo','notas']:['nombre','cif','tipo','contacto','email','telefono','web','zona','descripcion','activo','notas'];
function guess(headers,table){const used=new Set();return headers.map(h=>{const key=keys(table).find(k=>!used.has(k)&&[k,...fields[k]].some(alias=>norm(alias)===norm(h)));if(key)used.add(key);return key||''})}
function validate(matrix,header,mapping,table,existing=[]){
 const seenTax=new Map(),seenName=new Map(),results=[];
 const identity=p=>norm(p.nombre)+'|'+clean(p.email).toLowerCase();
 const remember=(p,source)=>{if(tax(p.cif))seenTax.set(tax(p.cif),source);const key=identity(p);if(!seenName.has(key))seenName.set(key,[]);seenName.get(key).push({cif:tax(p.cif),source})};
 existing.forEach(p=>remember(p,'Ya existe en la aplicación'));
 const assigned=mapping.filter(Boolean),allowed=keys(table);
 if(!assigned.includes('nombre'))throw new Error('Asigna una columna al nombre / razón social.');
 if(new Set(assigned).size!==assigned.length)throw new Error('Cada campo debe asignarse a una sola columna.');
 if(assigned.some(k=>!allowed.includes(k)))throw new Error('Hay un campo no disponible para esta lista.');
 for(let i=header+1;i<matrix.length;i++){
  const row=matrix[i];if(!row.some(v=>clean(v)))continue;
  const p=Object.fromEntries(allowed.map(k=>[k,k==='activo'?true:k==='irpf'?0:null]));
  mapping.forEach((k,col)=>{if(k)p[k]=clean(row[col])||null});
  const errors=[];
  if(!p.nombre)errors.push('Falta el nombre');
  if(p.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email))errors.push('Correo no válido');
  if(table==='clientes'){const raw=clean(p.irpf).replace(/\s*%$/,'').replace(',','.');p.irpf=raw?Number(raw):0;if(!Number.isFinite(p.irpf)||p.irpf<0||p.irpf>100)errors.push('IRPF fuera de 0–100 %');}
  if(p.activo==null||p.activo===true)p.activo=true;else{const v=norm(p.activo);if(['si','true','1','activo','activa','yes'].includes(v))p.activo=true;else if(['no','false','0','inactivo','inactiva'].includes(v))p.activo=false;else errors.push('Activo debe ser Sí o No');}
  const duplicate=seenTax.get(tax(p.cif))||(seenName.get(identity(p))||[]).find(x=>!x.cif||!tax(p.cif)||x.cif===tax(p.cif))?.source;
  const status=errors.length?'error':duplicate?'duplicate':'new';
  results.push({row:i+1,payload:p,status,message:errors.join(' · ')||duplicate||'Nuevo'});
  if(status==='new')remember(p,'Repetido en el Excel (fila '+(i+1)+')');
 }
 return results;
}
const api={fields,keys,guess,validate};root.IriarteContactImport=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);

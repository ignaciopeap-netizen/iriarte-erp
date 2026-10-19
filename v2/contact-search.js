(function(){
'use strict';
const queries={clientes:'',proveedores:''},normalize=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();let timer;
function enhance(){const route=window.APP?.route,root=document.querySelector(route==='clientes'?'#clients-plus':route==='proveedores'?'#suppliers-plus':'#no-contact-list');if(!root||root.querySelector('[data-contact-search]'))return;
 const data=window.APP.data[route]||[],bar=document.createElement('div');bar.className='contact-search-bar';bar.innerHTML='<input class="master-search" data-contact-search type="search" aria-label="Buscar '+route+'" placeholder="Buscar por nombre, NIF/CIF, teléfono o correo…"><output aria-live="polite"></output>';root.querySelector('.page-head').after(bar);
 const empty=document.createElement('div');empty.className='contact-no-results';empty.hidden=true;empty.textContent='No hay coincidencias. Prueba con otro nombre o dato.';bar.after(empty);
 const input=bar.querySelector('input');input.value=queries[route];const rows=[...root.querySelectorAll('tr')].filter(tr=>tr.querySelector(route==='clientes'?'[data-ct-client]':'[data-ct-supplier]'));
 const items=rows.map(row=>{const id=row.querySelector(route==='clientes'?'[data-ct-client]':'[data-ct-supplier]').dataset[route==='clientes'?'ctClient':'ctSupplier'],item=data.find(x=>String(x.id)===id)||{};return {row,text:normalize([item.nombre,item.cif,item.contacto,item.telefono,item.telefono2,item.email,item.zona].join(' '))}});
 function filter(){queries[route]=input.value;const terms=normalize(input.value).trim().split(/\s+/).filter(Boolean);let count=0;items.forEach(x=>{const visible=terms.every(t=>x.text.includes(t));x.row.hidden=!visible;if(visible)count++});const label=count+' de '+items.length+' '+route;if(bar.querySelector('output').textContent!==label)bar.querySelector('output').textContent=label;empty.hidden=count!==0||items.length===0}
 input.oninput=filter;filter();
}
function schedule(){clearTimeout(timer);timer=setTimeout(enhance,80)}new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});window.addEventListener('load',schedule);window.addEventListener('hashchange',schedule);
})();

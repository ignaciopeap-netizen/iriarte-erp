// Iriarte ERP V2 · exportaciones de Presupuestos para Excel
(function(){
'use strict';
const escFile=v=>String(v||'presupuesto').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]+/g,'_').replace(/_+/g,'_').slice(0,90);
const num=v=>Number(String(v??0).replace(',','.'))||0;
const moneyNumber=v=>num(v).toFixed(2).replace('.',',');
let timer;
function current(){const A=window.APP;return A?.data?.presupuestos?.find(x=>String(x.id)===String(A?.sel?.budget))||null}
function csvCell(v){const s=String(v??'');return /[;"\n\r]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s}
function lineData(x){const q=num(x.qty??x.cantidad),p=num(x.price??x.precio),vat=num(x.vat??x.ivaPct??21);return {codigo:x.code||x.codigo||'',seccion:x.section||x.seccion||'',descripcion:x.description||x.desc||x.descripcion||'',ubicacion:x.location||x.ubicacion||'',unidad:x.unit||x.unidad||'',cantidad:q,precio:p,iva:vat,importe:q*p}}
function download(text,name){const blob=new Blob(['\ufeff'+text],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function exportBudget(mode){
 const p=current();if(!p)return;
 const supplier=mode==='supplier',rows=(p.items||[]).map(lineData),out=[];
 if(supplier)out.push(['Código','Sección','Descripción','Ubicación','Ud.','Cant.']);
 else out.push(['Código','Sección','Descripción','Ubicación','Ud.','Cant.','Precio €','IVA %','Importe €']);
 rows.forEach(r=>out.push(supplier?[r.codigo,r.seccion,r.descripcion,r.ubicacion,r.unidad,String(r.cantidad).replace('.',',')]:[r.codigo,r.seccion,r.descripcion,r.ubicacion,r.unidad,String(r.cantidad).replace('.',','),moneyNumber(r.precio),String(r.iva).replace('.',','),moneyNumber(r.importe)]));
 if(!supplier){const base=rows.reduce((a,r)=>a+r.importe,0),iva=rows.reduce((a,r)=>a+r.importe*r.iva/100,0),irpf=p.irpf_enabled?base*num(p.irpf_pct||15)/100:0;out.push([]);out.push(['','','','','','', 'Base imponible','',moneyNumber(base)]);out.push(['','','','','','', 'IVA','',moneyNumber(iva)]);if(p.irpf_enabled)out.push(['','','','','','',`IRPF ${num(p.irpf_pct||15)}%`,'',moneyNumber(-irpf)]);out.push(['','','','','','', 'TOTAL','',moneyNumber(base+iva-irpf)])}
 const text=out.map(r=>r.map(csvCell).join(';')).join('\r\n');download(text,`${escFile(p.ref||p.name||p.nombre||'presupuesto')}_${supplier?'proveedor':'cliente'}.csv`);
}
function inject(){clearTimeout(timer);timer=setTimeout(()=>{
 const A=window.APP,p=current();if(A?.route!=='presupuestos'||A?.budgetView!=='edit'||!p||p.kind==='honorarios')return;
 const host=document.querySelector('#pp-extra-controls .toolbar');if(!host||host.querySelector('[data-budget-excel]'))return;
 const client=document.createElement('button');client.type='button';client.className='btn';client.textContent='Excel cliente';client.dataset.budgetExcel='client';
 const supplier=document.createElement('button');supplier.type='button';supplier.className='btn';supplier.textContent='Excel proveedor';supplier.dataset.budgetExcel='supplier';
 host.prepend(supplier);host.prepend(client);
},80)}
new MutationObserver(inject).observe(document.body,{subtree:true,childList:true});window.addEventListener('hashchange',inject);window.addEventListener('load',inject);
document.addEventListener('click',e=>{const b=e.target.closest('[data-budget-excel]');if(!b)return;e.preventDefault();exportBudget(b.dataset.budgetExcel)},true);
})();

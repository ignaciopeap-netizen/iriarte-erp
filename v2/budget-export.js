// Iriarte ERP V2 · exportaciones de Presupuestos para Excel/CSV
(function(){
'use strict';
const escFile=v=>String(v||'presupuesto').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]+/g,'_').replace(/_+/g,'_').slice(0,90);
const num=v=>Number(String(v??0).replace(',','.'))||0;
const moneyNumber=v=>num(v).toFixed(2).replace('.',',');
let timer,excelLibrary;
function ensureExcel(){if(window.XLSX)return Promise.resolve(window.XLSX);if(!excelLibrary)excelLibrary=new Promise((resolve,reject)=>{const script=document.createElement("script");script.src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";script.onload=()=>resolve(window.XLSX);script.onerror=()=>{excelLibrary=null;reject(new Error("No se pudo cargar Excel. Comprueba la conexión."))};document.head.appendChild(script)});return excelLibrary}
function current(){const A=window.APP;return A?.data?.presupuestos?.find(x=>String(x.id)===String(A?.sel?.budget))||null}
function csvCell(v){const s=String(v??'');return /[;"\n\r]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s}
function lineData(x){const q=num(x.qty??x.cantidad),p=num(x.price??x.precio),vat=num(x.vat??x.ivaPct??21);return {codigo:x.code||x.codigo||'',seccion:x.section||x.seccion||'',descripcion:x.description||x.desc||x.descripcion||'',ubicacion:x.location||x.ubicacion||'',unidad:x.unit||x.unidad||'',cantidad:q,precio:p,iva:vat,importe:q*p}}
function download(text,name){const blob=new Blob(['\ufeff'+text],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
async function exportBudget(mode){
 let p=current();if(!p)return;if(mode==='supplier'&&window.iriarteSupplierBudget)p=window.iriarteSupplierBudget(p);if(mode==='supplier'&&!(p.items||[]).length){alert('Selecciona al menos una sección para exportar.');return}
 const supplier=mode==='supplier',rows=(p.items||[]).map(lineData),out=[];
 if(supplier)out.push(['Código','Sección','Descripción','Ubicación','Ud.','Cant.']);
 else out.push(['Código','Sección','Descripción','Ubicación','Ud.','Cant.','Precio €','IVA %','Base imponible €','Total c/IVA €']);
 rows.forEach(r=>out.push(supplier?[r.codigo,r.seccion,r.descripcion,r.ubicacion,r.unidad,String(r.cantidad).replace('.',',')]:[r.codigo,r.seccion,r.descripcion,r.ubicacion,r.unidad,String(r.cantidad).replace('.',','),moneyNumber(r.precio),String(r.iva).replace('.',','),moneyNumber(r.importe),moneyNumber(r.importe*(1+r.iva/100))]));
 if(!supplier){const base=rows.reduce((a,r)=>a+r.importe,0),iva=rows.reduce((a,r)=>a+r.importe*r.iva/100,0),irpf=p.irpf_enabled?base*num(p.irpf_pct||15)/100:0;out.push([]);out.push(['','','','','','', 'Base imponible','',moneyNumber(base)]);out.push(['','','','','','', 'IVA','',moneyNumber(iva)]);if(p.irpf_enabled)out.push(['','','','','','',`IRPF ${num(p.irpf_pct||15)}%`,'',moneyNumber(-irpf)]);out.push(['','','','','','', 'TOTAL','',moneyNumber(base+iva-irpf)])}
 try{const XLSX=await ensureExcel();const numeric=out.map((r,index)=>r.map((value,col)=>{if(index===0||value===''||col<5)return value;const parsed=Number(String(value).replace(',','.'));return Number.isFinite(parsed)?parsed:value}));const workbook=XLSX.utils.book_new(),sheet=XLSX.utils.aoa_to_sheet(numeric);sheet['!cols']=[{wch:10},{wch:24},{wch:70},{wch:25},{wch:8},{wch:12},{wch:16},{wch:10},{wch:18},{wch:18}];XLSX.utils.book_append_sheet(workbook,sheet,supplier?'Solicitud proveedor':'Presupuesto cliente');XLSX.writeFile(workbook,`${escFile(p.ref||p.name||p.nombre||'presupuesto')}_${supplier?'proveedor':'cliente'}.xlsx`)}catch(error){alert(error.message)}
}
function inject(){clearTimeout(timer);timer=setTimeout(()=>{
 const A=window.APP,p=current();if(A?.route!=='presupuestos'||!['client','supplier'].includes(A?.budgetView)||!p||p.kind==='honorarios')return;
 const host=document.querySelector('#pp-print-actions');if(!host||host.querySelector('[data-budget-excel]'))return;
 const b=document.createElement('button');b.type='button';b.className='btn';b.textContent='Descargar Excel';b.dataset.budgetExcel=A.budgetView;b.title=A.budgetView==='supplier'?'Exportar listado sin precios para proveedor':'Exportar presupuesto de cliente con precios';host.appendChild(b);
},80)}
new MutationObserver(inject).observe(document.body,{subtree:true,childList:true});window.addEventListener('hashchange',inject);window.addEventListener('load',inject);
document.addEventListener('click',e=>{const b=e.target.closest('[data-budget-excel]');if(!b)return;e.preventDefault();exportBudget(b.dataset.budgetExcel)},true);
})();
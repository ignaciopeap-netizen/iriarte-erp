// Iriarte ERP V2 · descarga PDF directa de presupuesto / solicitud proveedor
(function(){
'use strict';
let timer,libraryPromise;
function safe(v){return String(v||'documento').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[\\/:*?"<>|]+/g,'-').replace(/\s+/g,' ').trim().slice(0,100)||'documento'}
function current(){const A=window.APP;return A?.data?.presupuestos?.find(x=>String(x.id)===String(A?.sel?.budget))||null}
function project(p){return (window.APP?.data?.proyectos||[]).find(x=>String(x.id)===String(p?.proyecto_id))||null}
function ensureLibrary(){
 if(window.html2pdf)return Promise.resolve(window.html2pdf);
 if(libraryPromise)return libraryPromise;
 libraryPromise=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';s.onload=()=>window.html2pdf?resolve(window.html2pdf):reject(new Error('No se pudo iniciar el generador PDF.'));s.onerror=()=>reject(new Error('No se pudo cargar el generador PDF. Comprueba la conexión e inténtalo de nuevo.'));document.head.appendChild(s)});return libraryPromise
}
async function downloadPdf(button){
 const p=current(),sheet=document.querySelector('.pp-sheet');if(!p||!sheet)return;
 const supplier=window.APP?.budgetView==='supplier',pr=project(p),old=button.textContent;button.disabled=true;button.textContent='Generando PDF…';
 try{
  await ensureLibrary();
  const filename=safe(`${supplier?'Solicitud de precios':'Presupuesto'} - ${pr?.nombre||p.name||p.nombre||p.ref||'documento'}`)+'.pdf';
  await window.html2pdf().set({margin:[7,7,8,7],filename,image:{type:'jpeg',quality:.98},html2canvas:{scale:2,useCORS:true,backgroundColor:'#ffffff',logging:false,scrollX:0,scrollY:0},jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},pagebreak:{mode:['css','legacy']}}).from(sheet).save();
 }catch(err){console.error(err);alert(err.message||'No se pudo generar el PDF.')}
 finally{button.disabled=false;button.textContent=old}
}
function decorate(){clearTimeout(timer);timer=setTimeout(()=>{if(window.APP?.route!=='presupuestos'||!['client','supplier'].includes(window.APP?.budgetView))return;const actions=document.querySelector('#pp-print-actions');if(!actions||actions.querySelector('[data-direct-budget-pdf]'))return;const print=actions.querySelector('[data-pp-print]');if(print){print.textContent='Imprimir';print.classList.remove('primary')}const pdf=document.createElement('button');pdf.type='button';pdf.className='btn primary';pdf.dataset.directBudgetPdf='1';pdf.textContent='Descargar PDF';actions.prepend(pdf)},40)}
new MutationObserver(decorate).observe(document.body,{childList:true,subtree:true});window.addEventListener('load',decorate);window.addEventListener('hashchange',decorate);
document.addEventListener('click',e=>{const b=e.target.closest('[data-direct-budget-pdf]');if(!b)return;e.preventDefault();downloadPdf(b)},true);
})();

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
function prepareStage(sheet){
 const stage=document.createElement('div');stage.dataset.budgetPdfStage='1';stage.style.cssText='position:fixed;left:-100000px;top:0;width:190mm;background:#fff;z-index:-1;';
 const clone=sheet.cloneNode(true);clone.classList.add('pdf-ready');clone.style.cssText+=';width:190mm;max-width:190mm;margin:0;padding:0;border:0;box-shadow:none;overflow:visible;';
 clone.querySelectorAll('.pp-section').forEach(x=>{x.style.breakInside='auto';x.style.pageBreakInside='auto'});
 clone.querySelectorAll('.pp-table').forEach(x=>{x.style.breakInside='auto';x.style.pageBreakInside='auto'});
 clone.querySelectorAll('.pp-table thead').forEach(x=>{x.style.display='table-header-group'});
 clone.querySelectorAll('.pp-table tr,.pp-head,.pp-meta-grid,.pp-totals,.pp-footer').forEach(x=>{x.style.breakInside='avoid';x.style.pageBreakInside='avoid'});
 clone.querySelectorAll('.pp-section h3').forEach(x=>{x.style.breakAfter='avoid';x.style.pageBreakAfter='avoid'});
 stage.appendChild(clone);document.body.appendChild(stage);return stage
}
async function downloadPdf(button){
 const p=current(),sheet=document.querySelector('.pp-sheet');if(!p||!sheet)return;
 const supplier=window.APP?.budgetView==='supplier',pr=project(p),old=button.textContent;button.disabled=true;button.textContent='Generando PDF…';let stage;
 try{
  await ensureLibrary();stage=prepareStage(sheet);
  const filename=safe(`${supplier?'Solicitud de precios':'Presupuesto'} - ${pr?.nombre||p.name||p.nombre||p.ref||'documento'}`)+'.pdf';
  const worker=window.html2pdf().set({
    margin:[8,7,11,7],filename,
    image:{type:'jpeg',quality:.98},
    html2canvas:{scale:2,useCORS:true,backgroundColor:'#ffffff',logging:false,scrollX:0,scrollY:0,windowWidth:stage.scrollWidth},
    jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},
    pagebreak:{mode:['css','legacy'],avoid:['.pp-head','.pp-meta-grid','.pp-table tr','.pp-totals','.pp-footer']}
  }).from(stage.firstElementChild).toPdf();
  await worker.get('pdf').then(pdf=>{
    const pages=pdf.internal.getNumberOfPages();
    for(let i=1;i<=pages;i++){
      pdf.setPage(i);pdf.setFontSize(7);pdf.setTextColor(125,125,120);
      pdf.text(`Página ${i} de ${pages}`,203,292,{align:'right'});
    }
  });
  await worker.save();
 }catch(err){console.error(err);alert(err.message||'No se pudo generar el PDF.')}
 finally{if(stage)stage.remove();button.disabled=false;button.textContent=old}
}
function decorate(){clearTimeout(timer);timer=setTimeout(()=>{if(window.APP?.route!=='presupuestos'||!['client','supplier'].includes(window.APP?.budgetView))return;const actions=document.querySelector('#pp-print-actions');if(!actions||actions.querySelector('[data-direct-budget-pdf]'))return;const print=actions.querySelector('[data-pp-print]');if(print){print.textContent='Imprimir';print.classList.remove('primary')}const pdf=document.createElement('button');pdf.type='button';pdf.className='btn primary';pdf.dataset.directBudgetPdf='1';pdf.textContent='Descargar PDF';actions.prepend(pdf)},40)}
new MutationObserver(decorate).observe(document.body,{childList:true,subtree:true});window.addEventListener('load',decorate);window.addEventListener('hashchange',decorate);
document.addEventListener('click',e=>{const b=e.target.closest('[data-direct-budget-pdf]');if(!b)return;e.preventDefault();downloadPdf(b)},true);
})();

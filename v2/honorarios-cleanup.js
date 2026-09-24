// Iriarte ERP V2 · pequeños ajustes de convivencia entre vistas de Honorarios
(function(){
'use strict';
let timer;
function run(){clearTimeout(timer);timer=setTimeout(()=>{
  if(window.APP?.route!=='presupuestos'||window.APP?.budgetView!=='client')return;
  const doc=document.querySelector('#honorarios-doc-v2');if(!doc)return;
  const duplicate=document.querySelector('#pp-print-actions');if(duplicate)duplicate.remove();
  const brand=doc.querySelector('.pp-brand');
  if(brand&&window.IRIARTE_LOGO_DATA_URI&&!doc.querySelector('.iriarte-honor-logo')){
    const wrap=brand.parentElement;
    wrap.innerHTML=`<img class="iriarte-honor-logo" src="${window.IRIARTE_LOGO_DATA_URI}" alt="Sonsoles Pérez Iriarte" style="height:88px;width:auto;object-fit:contain;object-position:left top">`;
  }
},90)}
new MutationObserver(run).observe(document.body,{subtree:true,childList:true});window.addEventListener('hashchange',run);window.addEventListener('load',run);
})();

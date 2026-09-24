// Opens records created from budgets after the destination route has rendered.
(function(){
  'use strict';
  let invoiceTries=0,projectTries=0,timer;

  function openInvoice(){
    const id=localStorage.getItem('iriarte_open_invoice');if(!id)return false;
    if(window.APP?.route!=='facturas'){if(invoiceTries++<30)return true;localStorage.removeItem('iriarte_open_invoice');return false}
    const b=document.querySelector(`[data-action="edit-invoice:${CSS.escape(id)}"]`);
    if(!b){if(invoiceTries++<30)return true;localStorage.removeItem('iriarte_open_invoice');return false}
    localStorage.removeItem('iriarte_open_invoice');invoiceTries=0;b.click();return false;
  }

  function openProject(){
    const id=localStorage.getItem('iriarte_open_project');if(!id)return false;
    if(window.APP?.route!=='proyectos'){if(projectTries++<30)return true;localStorage.removeItem('iriarte_open_project');return false}
    const item=document.querySelector(`[data-select-project="${CSS.escape(id)}"]`);
    if(!item){if(projectTries++<30)return true;localStorage.removeItem('iriarte_open_project');return false}
    localStorage.removeItem('iriarte_open_project');projectTries=0;item.click();return false;
  }

  function run(){clearTimeout(timer);timer=setTimeout(()=>{const retryInvoice=openInvoice(),retryProject=openProject();if(retryInvoice||retryProject)run()},100)}
  new MutationObserver(run).observe(document.body,{childList:true,subtree:true});window.addEventListener('load',run);window.addEventListener('hashchange',run);
})();

// Opens exact records after the destination route has rendered.
(function(){
  'use strict';
  const tries={invoice:0,project:0,budget:0,purchase:0,document:0};let timer;

  function retry(key,storage,route,selector,onFound){
    const id=localStorage.getItem(storage);if(!id)return false;
    if(window.APP?.route!==route){if(tries[key]++<40)return true;localStorage.removeItem(storage);tries[key]=0;return false}
    const el=document.querySelector(selector(id));
    if(!el){if(tries[key]++<40)return true;localStorage.removeItem(storage);tries[key]=0;return false}
    localStorage.removeItem(storage);tries[key]=0;(onFound||((x)=>x.click()))(el,id);return false;
  }
  function openInvoice(){return retry('invoice','iriarte_open_invoice','facturas',id=>`[data-action="edit-invoice:${CSS.escape(id)}"]`)}
  function openProject(){return retry('project','iriarte_open_project','proyectos',id=>`[data-select-project="${CSS.escape(id)}"]`)}
  function openBudget(){return retry('budget','iriarte_open_budget','presupuestos',id=>`[data-budget-item="${CSS.escape(id)}"]`,(el,id)=>{if(window.APP){window.APP.sel.budget=id;window.APP.budgetView='edit'}el.click()})}
  function openPurchase(){return retry('purchase','iriarte_open_purchase','compras',id=>`[data-p-edit="${CSS.escape(id)}"]`)}
  function openDocument(){return retry('document','iriarte_open_document','documentos',id=>`[data-op-doc-open="${CSS.escape(id)}"]`)}

  function run(){clearTimeout(timer);timer=setTimeout(()=>{const again=[openInvoice(),openProject(),openBudget(),openPurchase(),openDocument()].some(Boolean);if(again)run()},100)}
  new MutationObserver(run).observe(document.body,{childList:true,subtree:true});window.addEventListener('load',run);window.addEventListener('hashchange',run);
})();

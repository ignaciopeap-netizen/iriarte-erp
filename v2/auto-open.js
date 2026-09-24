// Opens the invoice just created from a budget once the Facturas route has rendered.
(function(){
  'use strict';
  let tries=0,timer;
  function run(){
    const id=localStorage.getItem('iriarte_open_invoice');if(!id)return;
    clearTimeout(timer);timer=setTimeout(()=>{
      if(window.APP?.route!=='facturas'){if(tries++<30)run();return}
      const b=document.querySelector(`[data-action="edit-invoice:${CSS.escape(id)}"]`);
      if(!b){if(tries++<30)run();return}
      localStorage.removeItem('iriarte_open_invoice');b.click();
    },100);
  }
  new MutationObserver(run).observe(document.body,{childList:true,subtree:true});window.addEventListener('load',run);window.addEventListener('hashchange',run);
})();

// Iriarte ERP V2 · un único cliente Supabase para toda la aplicación.
(function(){
  'use strict';
  if(!window.supabase?.createClient || window.__iriarteDbBridgeInstalled)return;
  window.__iriarteDbBridgeInstalled=true;
  const original=window.supabase.createClient.bind(window.supabase);
  window.supabase.createClient=function(...args){
    if(window.__iriarteDb)return window.__iriarteDb;
    const client=original(...args);
    window.__iriarteDb=client;
    return client;
  };
})();

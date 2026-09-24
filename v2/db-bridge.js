// Capture the single Supabase client created by app.js so feature modules share one session/client.
(function(){
  'use strict';
  if(!window.supabase?.createClient || window.__iriarteDbBridgeInstalled)return;
  window.__iriarteDbBridgeInstalled=true;
  const original=window.supabase.createClient.bind(window.supabase);
  window.supabase.createClient=function(...args){
    const client=original(...args);
    if(!window.__iriarteDb)window.__iriarteDb=client;
    return client;
  };
})();

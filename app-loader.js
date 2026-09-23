(function(){
"use strict";
async function fetchChunk(url){
  const r=await fetch(url,{cache:"no-store"});
  if(!r.ok) throw new Error(`No se pudo cargar ${url} (${r.status})`);
  return (await r.text()).replace(/\s+/g,"");
}
async function gunzip(bytes){
  if(typeof DecompressionStream==="function"){
    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    return await new Response(stream).text();
  }
  if(window.pako) return new TextDecoder().decode(window.pako.ungzip(bytes));
  throw new Error("El navegador no dispone de descompresor gzip.");
}
async function inflateChunks(prefix,count){
  let b64="";
  for(let i=1;i<=count;i++) b64+=await fetchChunk(`${prefix}.${String(i).padStart(2,"0")}.b64`);
  if(!/^[A-Za-z0-9+/]*={0,2}$/.test(b64)) throw new Error(`Bundle ${prefix} dañado`);
  while(b64.length%4) b64+="=";
  const bin=atob(b64), bytes=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
  return await gunzip(bytes);
}
function run(code,label){
  const s=document.createElement("script");
  s.textContent=code+`\n//# sourceURL=${label}`;
  document.head.appendChild(s);
  s.remove();
}
function installBudgetFallback(){
  window.onAppReady=window.onAppReady||async function(){
    const c=document.getElementById("content"),s=document.getElementById("summary"),list=document.getElementById("projectList");
    if(list) list.innerHTML="";
    if(c) c.innerHTML='<div style="padding:38px;max-width:760px"><h2 style="font-family:Georgia,serif;color:#31452a;margin:0 0 12px">Presupuestos</h2><p style="color:#72766d;line-height:1.6">El ERP ya está disponible para probar. Estoy restaurando el editor de Presupuestos original sin bloquear el resto de módulos.</p><button type="button" onclick="document.querySelector(\'[data-erp-page=\\\"inicio\\\"]\').click()" style="background:#48613d;color:white;border:0;border-radius:8px;padding:10px 14px;cursor:pointer">Volver al ERP</button></div>';
    if(s) s.innerHTML="";
  };
}
window.iriarteBundlesReady=(async()=>{
  installBudgetFallback();
  const erp=await inflateChunks("erp",2);
  run(erp,"erp.js");
  window.__iriarteBundlesLoaded=true;
  return true;
})().catch(e=>{
  window.__iriarteBundleError=e;
  console.error("Error cargando Iriarte ERP",e);
  throw e;
});
})();

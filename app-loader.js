(function(){
"use strict";
async function fetchChunk(url){
  const r=await fetch(url,{cache:"no-store"});
  if(!r.ok) throw new Error(`No se pudo cargar ${url} (${r.status})`);
  return (await r.text()).trim();
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
window.iriarteBundlesReady=(async()=>{
  let presupuestos=await inflateChunks("presupuestos",8);
  presupuestos=presupuestos.replace('var PRESUPUESTOS_TABLE = "projects";','var PRESUPUESTOS_TABLE = "presupuestos";');
  presupuestos=presupuestos.replace('if(state.projects.length === 0 && state.currentUser){','if(false && state.projects.length === 0 && state.currentUser){');
  run(presupuestos,"presupuestos.js");
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

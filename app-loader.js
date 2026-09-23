(function(){
"use strict";
async function fetchChunk(url){
  const r=await fetch(url,{cache:"no-store"});
  if(!r.ok) throw new Error(`No se pudo cargar ${url} (${r.status})`);
  return (await r.text()).trim();
}
async function inflateChunks(prefix,count){
  let b64="";
  for(let i=1;i<=count;i++) b64+=await fetchChunk(`${prefix}.${String(i).padStart(2,"0")}.b64`);
  const bin=atob(b64), bytes=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
  if(!window.pako) throw new Error("No se pudo cargar el descompresor de la aplicación.");
  return new TextDecoder().decode(window.pako.ungzip(bytes));
}
function run(code,label){
  const s=document.createElement("script");
  s.textContent=code+`\n//# sourceURL=${label}`;
  document.head.appendChild(s);
  s.remove();
}
window.iriarteBundlesReady=(async()=>{
  const presupuestos=await inflateChunks("presupuestos",8);
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

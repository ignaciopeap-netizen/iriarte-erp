(function(){
"use strict";
async function inflateChunks(prefix,count){
  const parts=[];
  for(let i=1;i<=count;i++){
    const name=`${prefix}.${String(i).padStart(2,"0")}.b64`;
    const r=await fetch(name,{cache:"no-store"});
    if(!r.ok) throw new Error(`No se pudo cargar ${name} (${r.status})`);
    parts.push((await r.text()).trim());
  }
  const b64=parts.join("");
  const bin=atob(b64);
  const bytes=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
  if(typeof DecompressionStream!=="function") throw new Error("El navegador no soporta descompresión gzip.");
  const ds=new DecompressionStream("gzip");
  const stream=new Blob([bytes]).stream().pipeThrough(ds);
  return await new Response(stream).text();
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
  return true;
})();
})();
(function(){
"use strict";

async function fetchChunk(url){
  const r=await fetch(url,{cache:"no-store"});
  if(!r.ok) throw new Error(`No se pudo cargar ${url} (${r.status})`);
  return (await r.text()).trim();
}

async function inflateChunks(prefix,count){
  const parts=[];
  for(let i=1;i<=count;i++) parts.push(await fetchChunk(`${prefix}.${String(i).padStart(2,"0")}.b64`));
  const bin=atob(parts.join(""));
  const bytes=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
  if(typeof DecompressionStream!=="function") throw new Error("Este navegador no permite descomprimir los módulos de la aplicación.");
  const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return await new Response(stream).text();
}

function run(code,label){
  const s=document.createElement("script");
  s.textContent=code+`\n//# sourceURL=${label}`;
  document.head.appendChild(s);
  s.remove();
}

window.iriarteBundlesReady=(async()=>{
  try{
    const presupuestos=await inflateChunks("presupuestos",8);
    run(presupuestos,"presupuestos.js");
    const erp=await inflateChunks("erp",2);
    run(erp,"erp.js");
    window.__iriarteBundlesLoaded=true;
    return true;
  }catch(e){
    window.__iriarteBundleError=e;
    console.error("Error cargando Iriarte ERP",e);
    throw e;
  }
})();
})();

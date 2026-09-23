(function(){
"use strict";
function fetchTextSync(url){
  const x=new XMLHttpRequest();
  x.open("GET",url,false);
  x.send(null);
  if(x.status<200||x.status>=300) throw new Error(`No se pudo cargar ${url} (${x.status})`);
  return (x.responseText||"").trim();
}
function inflateChunks(prefix,count){
  let b64="";
  for(let i=1;i<=count;i++) b64+=fetchTextSync(`${prefix}.${String(i).padStart(2,"0")}.b64`);
  const bin=atob(b64), bytes=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
  if(!window.pako) throw new Error("No se pudo cargar el descompresor de la aplicación.");
  return new TextDecoder().decode(window.pako.ungzip(bytes));
}
function run(code,label){
  const s=document.createElement("script");
  s.text=code+`\n//# sourceURL=${label}`;
  document.head.appendChild(s);
  s.remove();
}
try{
  run(inflateChunks("presupuestos",8),"presupuestos.js");
  run(inflateChunks("erp",2),"erp.js");
  window.iriarteBundlesReady=Promise.resolve(true);
}catch(e){
  console.error(e);
  window.iriarteBundlesReady=Promise.reject(e);
  window.addEventListener("DOMContentLoaded",()=>{const el=document.getElementById("lockError");if(el)el.textContent="No se ha podido cargar la aplicación: "+e.message;});
}
})();

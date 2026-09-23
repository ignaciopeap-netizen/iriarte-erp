
(function(){
"use strict";
const SUPABASE_URL="https://kzmjeccivhkhtuokfkta.supabase.co";
const _q=new URLSearchParams(location.search);
const _k=_q.get("sb_key");
if(_k){localStorage.setItem("iriarte_sb_key",_k);_q.delete("sb_key");history.replaceState(null,"",location.pathname+(_q.toString()?"?"+_q.toString():"")+location.hash);}
const SUPABASE_KEY=localStorage.getItem("iriarte_sb_key")||"";
window.IRIARTE_CONFIG={SUPABASE_URL,SUPABASE_KEY};
function uuid(){return (crypto&&crypto.randomUUID)?crypto.randomUUID():"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,c=>{let r=Math.random()*16|0,v=c==="x"?r:(r&3|8);return v.toString(16)})}
window.uid=uuid;
window.fmtMoney=function(v){let n=Number(v||0);return new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR"}).format(n)};
window.escapeHtml=function(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))};
window.escapeAttr=window.escapeHtml;
window.formatSpanishDate=function(v){if(!v)return "";let d=new Date(String(v).length===10?v+"T12:00:00":v);if(isNaN(d))return v;return d.toLocaleDateString("es-ES",{day:"numeric",month:"long",year:"numeric"})};
window.setSyncStatus=function(t){let e=document.getElementById("syncStatus");if(e)e.textContent=t||""};
window.initModuleNav=function(){};
window.getIriarteSession=()=>window.__iriarteSession||null;
class LocalQuery{
  constructor(table,action="select",payload=null){this.table=table;this.action=action;this.payload=payload;this.filters=[];this.limitN=null;this.orderBy=null}
  select(){return this} insert(payload){this.action="insert";this.payload=payload;return this} upsert(payload){this.action="upsert";this.payload=payload;return this} update(payload){this.action="update";this.payload=payload;return this} delete(){this.action="delete";return this}
  eq(k,v){this.filters.push([k,v]);return this} order(k,opt){this.orderBy=[k,opt||{}];return this} limit(n){this.limitN=n;return this} single(){this.singleMode=true;return this} maybeSingle(){this.maybeSingleMode=true;return this}
  then(resolve,reject){return this.exec().then(resolve,reject)}
  async exec(){try{let db=JSON.parse(localStorage.getItem("iriarte_local_db_v2")||"{}"),arr=Array.isArray(db[this.table])?db[this.table]:[];const match=x=>this.filters.every(([k,v])=>String(x?.[k]??"")===String(v??""));
    if(this.action==="select"){let data=arr.filter(match);if(this.orderBy){let[k,o]=this.orderBy;data=data.slice().sort((a,b)=>String(a?.[k]??"").localeCompare(String(b?.[k]??""))*(o.ascending===false?-1:1))}if(this.limitN!=null)data=data.slice(0,this.limitN);if(this.singleMode)return data.length===1?{data:data[0],error:null}:{data:null,error:{message:"Expected single row"}};if(this.maybeSingleMode)return{data:data[0]||null,error:null};return{data,error:null}}
    if(this.action==="insert"){let rows=Array.isArray(this.payload)?this.payload:[this.payload],out=[];rows.forEach(r=>{let x={...r};if(!x.id)x.id=uuid();if(!x.created_at)x.created_at=new Date().toISOString();arr.push(x);out.push(x)});db[this.table]=arr;localStorage.setItem("iriarte_local_db_v2",JSON.stringify(db));return{data:out,error:null}}
    if(this.action==="upsert"){let rows=Array.isArray(this.payload)?this.payload:[this.payload],out=[];rows.forEach(r=>{let x={...r};if(!x.id)x.id=uuid();let ix=arr.findIndex(y=>String(y.id)===String(x.id));if(ix>=0)arr[ix]={...arr[ix],...x};else arr.push(x);out.push(ix>=0?arr[ix]:x)});db[this.table]=arr;localStorage.setItem("iriarte_local_db_v2",JSON.stringify(db));return{data:out,error:null}}
    if(this.action==="update"){arr=arr.map(x=>match(x)?{...x,...this.payload,updated_at:new Date().toISOString()}:x);db[this.table]=arr;localStorage.setItem("iriarte_local_db_v2",JSON.stringify(db));return{data:arr.filter(match),error:null}}
    if(this.action==="delete"){let removed=arr.filter(match);arr=arr.filter(x=>!match(x));db[this.table]=arr;localStorage.setItem("iriarte_local_db_v2",JSON.stringify(db));return{data:removed,error:null}}
    return{data:null,error:null};
  }catch(e){return{data:null,error:{message:e.message}}}}
}
const localClient={from:t=>new LocalQuery(t),auth:{async getSession(){return{data:{session:{user:{id:"local-demo",email:"modo-local@iriarte",user_metadata:{name:"Iriarte"}}}}}},async signInWithPassword(){return{data:{user:{id:"local-demo",email:"modo-local@iriarte"}},error:null}},async signOut(){return{error:null}},async resetPasswordForEmail(){return{error:{message:"Disponible únicamente con Supabase conectado."}}},async updateUser(){return{error:{message:"Disponible únicamente con Supabase conectado."}}}}};
let sb=null;try{if(window.supabase?.createClient)sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}})}catch(e){console.error(e)}
window.__iriarteSupabase=sb;window.getSupabase=()=>sb||localClient;
function showLock(show){let l=document.getElementById("lockScreen");if(l)l.style.display=show?"flex":"none"}
async function profileFor(user){let p={id:user.id,email:user.email||"",name:user.user_metadata?.name||user.email||"Usuario",role:"usuario"};if(!sb)return p;try{let{data}=await sb.from("profiles").select("*").eq("id",user.id).maybeSingle();if(data)p={...p,...data,name:data.name||p.name}}catch(e){}return p}
async function startForUser(user,offline=false){let p=await profileFor(user);window.__iriarteSession={user,p,offline};showLock(false);let nu=document.getElementById("navUser");if(nu)nu.innerHTML=`<span>${escapeHtml(p.name||p.email)}</span> <button type="button" id="logoutBtn" style="border:0;background:transparent;color:#72766d;cursor:pointer">Salir</button>`;let mini=document.getElementById("navLogoMini"),logo=document.querySelector("#sidebar img,.honLogo img,img[alt='Sonsoles Pérez Iriarte']");if(mini&&logo)mini.src=logo.src;if(typeof window.onAppReady==="function")await window.onAppReady(p);window.dispatchEvent(new CustomEvent("iriarte:ready",{detail:{profile:p,offline}}));let out=document.getElementById("logoutBtn");if(out)out.onclick=async()=>{if(sb)await sb.auth.signOut();localStorage.removeItem("iriarte_local_session");location.reload()}}
async function boot(){let btn=document.getElementById("lockBtn"),forgot=document.getElementById("forgotBtn"),back=document.getElementById("backToLoginBtn"),send=document.getElementById("sendResetBtn"),save=document.getElementById("savePasswordBtn");
  if(btn)btn.onclick=async()=>{let email=document.getElementById("loginEmail").value.trim(),password=document.getElementById("loginPassword").value,err=document.getElementById("lockError");err.textContent="";if(!sb){localStorage.setItem("iriarte_local_session","1");await startForUser({id:"local-demo",email:email||"modo-local@iriarte",user_metadata:{name:"Iriarte"}},true);return}btn.disabled=true;let r=await sb.auth.signInWithPassword({email,password});btn.disabled=false;if(r.error){err.textContent=r.error.message;return}await startForUser(r.data.user,false)};
  if(forgot)forgot.onclick=()=>{document.getElementById("loginFields").style.display="none";document.getElementById("resetFields").style.display="block"};if(back)back.onclick=()=>{document.getElementById("resetFields").style.display="none";document.getElementById("loginFields").style.display="block"};
  if(send)send.onclick=async()=>{let e=document.getElementById("resetEmail").value.trim(),m=document.getElementById("resetMsg");if(!sb){m.textContent="Necesitas conexión a Supabase.";return}let r=await sb.auth.resetPasswordForEmail(e,{redirectTo:location.href.split("#")[0]});m.textContent=r.error?r.error.message:"Enlace enviado."};
  if(save)save.onclick=async()=>{let a=document.getElementById("newPassword1").value,b=document.getElementById("newPassword2").value,m=document.getElementById("newPasswordMsg");if(a.length<8||a!==b){m.textContent="Las contraseñas no coinciden o son demasiado cortas.";return}let r=await sb.auth.updateUser({password:a});m.textContent=r.error?r.error.message:"Contraseña actualizada."};
  if(!sb){let err=document.getElementById("lockError");if(err)err.innerHTML='No se ha podido cargar la librería de Supabase. Puedes entrar en <b>modo local</b> para probar la aplicación; los datos se guardarán solo en este navegador.';if(localStorage.getItem("iriarte_local_session")==="1")await startForUser({id:"local-demo",email:"modo-local@iriarte",user_metadata:{name:"Iriarte"}},true);return}
  let{data:{session}}=await sb.auth.getSession();if(session?.user)await startForUser(session.user,false);else showLock(true);sb.auth.onAuthStateChange((event)=>{if(event==="PASSWORD_RECOVERY"){document.getElementById("loginFields").style.display="none";document.getElementById("newPasswordFields").style.display="block";showLock(true)}})
}
document.addEventListener("DOMContentLoaded",()=>setTimeout(boot,0));
})();

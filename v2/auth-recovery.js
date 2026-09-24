// Iriarte ERP V2 · recuperación de contraseña sin alterar el login principal
(function(){
'use strict';
const db=()=>window.__iriarteDb;
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

function recoveryModal(){
 const client=db(),root=$('#modal-root');if(!client||!root)return;
 root.innerHTML=`<div class="modal-backdrop"><div class="modal" style="width:min(520px,96vw)"><div class="modal-head"><h2>Nueva contraseña</h2></div><form id="recovery-password-form"><div class="modal-body"><p style="color:var(--muted);margin-top:0">Introduce una contraseña nueva para tu cuenta.</p><div class="form-grid"><label class="full">Nueva contraseña<input name="password" type="password" minlength="8" autocomplete="new-password" required></label><label class="full">Repetir contraseña<input name="password2" type="password" minlength="8" autocomplete="new-password" required></label></div><div id="recovery-error"></div></div><div class="modal-foot"><button class="btn primary" type="submit">Guardar contraseña</button></div></form></div></div>`;
 $('#recovery-password-form').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget),p=String(f.get('password')||''),p2=String(f.get('password2')||''),error=$('#recovery-error'),submit=e.submitter;if(p!==p2){error.innerHTML='<div class="notice" style="background:#f6dfd7;color:#8f4d3c">Las contraseñas no coinciden.</div>';return}submit.disabled=true;try{const {error:err}=await client.auth.updateUser({password:p});if(err)throw err;root.innerHTML='';history.replaceState(null,'',location.pathname+'#inicio');alert('Contraseña actualizada correctamente.')}catch(err){error.innerHTML=`<div class="notice" style="background:#f6dfd7;color:#8f4d3c">${esc(err.message||err)}</div>`;submit.disabled=false}};
}

function requestModal(){
 const client=db(),root=$('#modal-root');if(!client||!root)return;
 const current=String($('#login-email')?.value||'').trim();
 root.innerHTML=`<div class="modal-backdrop"><div class="modal" style="width:min(520px,96vw)"><div class="modal-head"><h2>Recuperar acceso</h2><div class="grow"></div><button class="btn" type="button" data-r-close>Cerrar</button></div><form id="recovery-request-form"><div class="modal-body"><p style="color:var(--muted);margin-top:0">Te enviaremos un enlace para crear una contraseña nueva.</p><label style="display:block;font-size:11px;color:var(--muted)">Email<input name="email" type="email" value="${esc(current)}" required style="display:block;width:100%;margin-top:5px;padding:10px;border:1px solid var(--line);border-radius:8px"></label><div id="recovery-request-error"></div></div><div class="modal-foot"><button class="btn" type="button" data-r-close>Cancelar</button><button class="btn primary" type="submit">Enviar enlace</button></div></form></div></div>`;
 const close=()=>root.innerHTML='';root.querySelectorAll('[data-r-close]').forEach(b=>b.onclick=close);
 $('#recovery-request-form').onsubmit=async e=>{e.preventDefault();const email=String(new FormData(e.currentTarget).get('email')||'').trim(),submit=e.submitter,error=$('#recovery-request-error');submit.disabled=true;try{const redirectTo=location.origin+location.pathname;const {error:err}=await client.auth.resetPasswordForEmail(email,{redirectTo});if(err)throw err;root.innerHTML=`<div class="modal-backdrop"><div class="modal" style="width:min(520px,96vw)"><div class="modal-body"><h2 style="font-family:Georgia,serif">Revisa tu correo</h2><p>Si la cuenta existe, recibirás un enlace para cambiar la contraseña.</p><button class="btn primary" data-r-done>Volver</button></div></div></div>`;root.querySelector('[data-r-done]').onclick=()=>root.innerHTML=''}catch(err){error.innerHTML=`<div class="notice" style="background:#f6dfd7;color:#8f4d3c">${esc(err.message||err)}</div>`;submit.disabled=false}};
}

function installButton(){const form=$('#login-form');if(!form||form.querySelector('[data-forgot-password]'))return;const b=document.createElement('button');b.type='button';b.className='link-button';b.dataset.forgotPassword='1';b.textContent='He olvidado mi contraseña';b.style.cssText='display:block;margin:12px auto 0';b.onclick=requestModal;form.appendChild(b)}

document.addEventListener('DOMContentLoaded',()=>{installButton();const client=db();client?.auth?.onAuthStateChange?.((event)=>{if(event==='PASSWORD_RECOVERY')setTimeout(recoveryModal,0)})});
})();

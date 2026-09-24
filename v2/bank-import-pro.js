// Iriarte ERP V2 · importación bancaria detallada desde Excel/CSV
(function(){
  'use strict';
  const URL='https://kzmjeccivhkhtuokfkta.supabase.co';
  const KEY='sb_publishable_YBf9vRaOlVQBHM4ionZLPw_TIIxZY9G';
  const db=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

  function norm(s){return String(s||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ')}
  function amount(v){let s=String(v??'').trim().replace(/\s/g,'').replace(/€/g,'');if(!s)return 0;if(s.includes(',')&&s.includes('.'))s=s.replace(/\./g,'').replace(',','.');else if(s.includes(','))s=s.replace(',','.');s=s.replace(/[^0-9.\-+]/g,'');const n=Number(s);return Number.isFinite(n)?n:0}
  function date(v){const s=String(v||'').trim();if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;let m=s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);if(m)return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;return new Date().toISOString().slice(0,10)}
  function splitLine(line,delimiter){return line.split(delimiter).map(x=>x.trim().replace(/^"|"$/g,''))}
  function detectDelimiter(text){const first=text.split(/\r?\n/).find(Boolean)||'';if(first.includes('\t'))return '\t';if(first.includes(';'))return ';';return ','}
  function indexOf(headers,names){for(const n of names){const i=headers.findIndex(h=>h===n||h.includes(n));if(i>=0)return i}return -1}
  function projectMatch(raw){const q=norm(raw);if(!q)return null;return (window.APP?.data?.proyectos||[]).find(p=>norm(p.nombre)===q||norm(p.codigo)===q)?.id||null}

  function parse(text){
    const delimiter=detectDelimiter(text),lines=text.split(/\r?\n/).filter(x=>x.trim());if(!lines.length)return [];
    const first=splitLine(lines[0],delimiter),headers=first.map(norm);
    const hasHeader=headers.some(h=>/fecha|concept|descripcion|importe|debe|haber|cuenta/.test(h));
    const body=hasHeader?lines.slice(1):lines;
    const ix=hasHeader?{
      fecha:indexOf(headers,['fecha operacion','fecha','fecha movimiento']),
      valor:indexOf(headers,['fecha valor','valor']),
      concepto:indexOf(headers,['concepto','descripcion','detalle','movimiento']),
      importe:indexOf(headers,['importe','cantidad']),
      debe:indexOf(headers,['debe','cargo']),
      haber:indexOf(headers,['haber','abono']),
      cuenta:indexOf(headers,['cuenta','iban']),
      ref:indexOf(headers,['referencia','ref']),
      cat:indexOf(headers,['categoria']),sub:indexOf(headers,['subcategoria']),proy:indexOf(headers,['proyecto'])
    }:{fecha:0,valor:-1,concepto:1,importe:2,debe:-1,haber:-1,cuenta:3,ref:4,cat:5,sub:6,proy:7};
    return body.map(line=>{
      const c=splitLine(line,delimiter);let val=ix.importe>=0?amount(c[ix.importe]):0;
      if(ix.importe<0){const d=ix.debe>=0?Math.abs(amount(c[ix.debe])):0,h=ix.haber>=0?Math.abs(amount(c[ix.haber])):0;val=h-d}
      const concepto=(ix.concepto>=0?c[ix.concepto]:'')||'Movimiento bancario';
      return {fecha:date(ix.fecha>=0?c[ix.fecha]:''),fecha_valor:ix.valor>=0&&c[ix.valor]?date(c[ix.valor]):null,tipo:val>=0?'cobro':'pago',concepto,total:Math.abs(val),cuenta:ix.cuenta>=0?c[ix.cuenta]||null:null,referencia:ix.ref>=0?c[ix.ref]||null:null,categoria:ix.cat>=0?c[ix.cat]||null:null,subcategoria:ix.sub>=0?c[ix.sub]||null:null,proyecto_id:ix.proy>=0?projectMatch(c[ix.proy]):null,conciliado:false,origen_importacion:'excel_csv'};
    }).filter(x=>x.total>0&&x.concepto);
  }
  function key(x){return [x.fecha,norm(x.concepto),Number(x.total).toFixed(2),norm(x.cuenta),norm(x.referencia)].join('|')}

  function open(){
    const root=$('#modal-root');
    root.innerHTML=`<div class="modal-backdrop"><div class="modal" style="width:min(980px,96vw)"><div class="modal-head"><h2>Importar movimientos bancarios</h2><div class="grow"></div><button class="btn" type="button" data-bank-close>Cerrar</button></div><form id="bank-import-form"><div class="modal-body"><div class="notice"><b>Pega directamente desde Excel o un CSV.</b><br>Reconozco Fecha operación, Fecha valor, Concepto/Descripción, Importe o Debe/Haber, Cuenta, Referencia, Categoría, Subcategoría y Proyecto. Las columnas que no existan se pueden conciliar después.</div><label style="display:block">Datos<textarea id="bank-raw" style="width:100%;min-height:280px" placeholder="Fecha operación\tFecha valor\tConcepto\tImporte\tCuenta\tReferencia\tCategoría\tSubcategoría\tProyecto"></textarea></label><div id="bank-preview" style="margin-top:14px"></div><div id="bank-error"></div></div><div class="modal-foot"><button class="btn" type="button" id="bank-analyze">Analizar</button><button class="btn primary" type="submit">Importar movimientos válidos</button></div></form></div></div>`;
    const close=()=>root.innerHTML='';root.querySelector('[data-bank-close]').onclick=close;
    let rows=[];
    const preview=()=>{rows=parse($('#bank-raw').value);$('#bank-preview').innerHTML=rows.length?`<div class="grid cols-4"><div class="info"><small>Filas válidas</small><b>${rows.length}</b></div><div class="info"><small>Entradas</small><b>${rows.filter(x=>x.tipo==='cobro').length}</b></div><div class="info"><small>Salidas</small><b>${rows.filter(x=>x.tipo==='pago').length}</b></div><div class="info"><small>Con proyecto reconocido</small><b>${rows.filter(x=>x.proyecto_id).length}</b></div></div><div class="table-wrap" style="margin-top:10px;max-height:260px"><table class="table"><tr><th>Fecha</th><th>Concepto</th><th>Tipo</th><th>Importe</th><th>Cuenta</th><th>Proyecto</th></tr>${rows.slice(0,30).map(x=>`<tr><td>${esc(x.fecha)}</td><td>${esc(x.concepto)}</td><td>${esc(x.tipo)}</td><td>${x.total.toLocaleString('es-ES',{style:'currency',currency:'EUR'})}</td><td>${esc(x.cuenta||'')}</td><td>${esc((window.APP?.data?.proyectos||[]).find(p=>p.id===x.proyecto_id)?.nombre||'')}</td></tr>`).join('')}</table></div>`:'<div class="empty">No he reconocido movimientos todavía.</div>'};
    $('#bank-analyze').onclick=preview;
    $('#bank-import-form').onsubmit=async e=>{e.preventDefault();e.submitter.disabled=true;try{if(!rows.length)rows=parse($('#bank-raw').value);if(!rows.length)throw new Error('No hay filas válidas para importar.');const {data:existing,error:e1}=await db.from('movimientos_financieros').select('fecha,concepto,total,cuenta,referencia');if(e1)throw e1;const keys=new Set((existing||[]).map(key)),fresh=rows.filter(x=>!keys.has(key(x)));if(!fresh.length)throw new Error('Todos los movimientos parecen estar ya importados.');const {error}=await db.from('movimientos_financieros').insert(fresh);if(error)throw error;alert(`${fresh.length} movimientos importados. ${rows.length-fresh.length} duplicados omitidos.`);close();location.reload()}catch(err){$('#bank-error').innerHTML=`<div class="notice" style="background:#f6dfd7;color:#8f4d3c">${esc(err.message||err)}</div>`;e.submitter.disabled=false}};
  }

  document.addEventListener('click',e=>{const b=e.target.closest('[data-action="import-bank"]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();open()},true);
})();

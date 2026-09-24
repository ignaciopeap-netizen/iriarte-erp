// Iriarte ERP V2 · gastos generales vinculados sin contaminar el margen directo
(function(){
'use strict';
let timer;
const $=s=>document.querySelector(s);
const num=v=>Number(v||0)||0;
const money=v=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(num(v));
function data(){const A=window.APP,D=A?.data||{},pid=A?.sel?.project;if(!pid)return null;const invoices=(D.facturas||[]).filter(x=>String(x.proyecto_id)===String(pid)&&String(x.estado)!=='anulada'),purchases=(D.compras||[]).filter(x=>String(x.proyecto_id)===String(pid)&&String(x.estado)!=='anulada'),hours=(D.horas||[]).filter(x=>String(x.proyecto_id)===String(pid)),overheads=(D.gastos||[]).filter(x=>String(x.proyecto_id||'')===String(pid));const margin=invoices.reduce((a,x)=>a+num(x.base),0)-purchases.reduce((a,x)=>a+num(x.base),0)-hours.reduce((a,x)=>a+num(x.horas)*num(x.coste_hora),0),overhead=overheads.reduce((a,x)=>a+num(x.base),0);return {margin,overhead,result:margin-overhead,count:overheads.length}}
function block(d){return `<div class="card panel" data-project-overhead style="margin-top:14px"><div class="page-head" style="margin-bottom:10px"><div><h3 style="margin:0">Rentabilidad ampliada</h3><small style="color:var(--muted)">Los gastos generales vinculados se muestran aparte y no modifican el margen directo.</small></div></div><div class="grid cols-3"><div class="info"><small>Margen directo</small><b class="${d.margin<0?'negative':'positive'}">${money(d.margin)}</b></div><div class="info"><small>Gastos generales vinculados (${d.count})</small><b>${money(d.overhead)}</b></div><div class="info"><small>Resultado tras gastos vinculados</small><b class="${d.result<0?'negative':'positive'}">${money(d.result)}</b></div></div></div>`}
function apply(){if(window.APP?.route!=='proyectos')return;const d=data();if(!d)return;const existing=$('[data-project-overhead]');if(existing)existing.remove();const hub=$('#project-hub-v2');const detail=$('.card.detail');const target=hub||detail;if(!target)return;target.insertAdjacentHTML('beforeend',block(d))}
function schedule(){clearTimeout(timer);timer=setTimeout(apply,100)}
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});window.addEventListener('hashchange',schedule);window.addEventListener('load',schedule);
})();

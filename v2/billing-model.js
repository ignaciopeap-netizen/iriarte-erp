// Shared calculations for budget billing. All amounts below are bases before tax.
(function(root){
'use strict';
const n=v=>Number(v)||0,round=v=>Math.round((v+Number.EPSILON)*100)/100,same=(a,b)=>String(a)===String(b);
const active=f=>String(f.estado||'borrador')!=='anulada',issued=f=>active(f)&&String(f.estado||'borrador')!=='borrador';
function base(p){return round(p.kind==='honorarios'?(p.fee_lines||[]).reduce((a,x)=>a+n(x.amount??x.importe),0):(p.items||[]).reduce((a,x)=>a+n(x.qty??x.cantidad)*n(x.price??x.precio),0))}
function clients(D,pid){const pr=(D.proyectos||[]).find(p=>same(p.id,pid)),rows=(D.proyectoClientes||[]).filter(x=>same(x.proyecto_id,pid)).map(x=>({...x}));if(pr?.cliente_id&&!rows.some(x=>same(x.cliente_id,pr.cliente_id)))rows.unshift({proyecto_id:pid,cliente_id:pr.cliente_id,porcentaje:null});return rows.map(x=>({...x,client:(D.clientes||[]).find(c=>same(c.id,x.cliente_id))})).filter(x=>x.client)}
function summary(D,p){
 const invoices=(D.facturas||[]).filter(f=>same(f.presupuesto_id,p.id)),activeInvoices=invoices.filter(active),emitted=activeInvoices.filter(issued),drafts=activeInvoices.filter(f=>!issued(f));
 const planned=(D.fases||[]).filter(f=>same(f.presupuesto_id,p.id)&&f.estado!=='anulada'&&!activeInvoices.some(i=>same(i.presupuesto_fase_id,f.id)));
 const sum=rows=>round(rows.reduce((a,x)=>a+n(x.base??x.importe),0)),total=base(p),billed=sum(emitted),draft=sum(drafts),reserved=sum(planned),used=round(billed+draft+reserved);
 const collected=rows=>round((D.cobros||[]).filter(c=>rows.some(f=>same(f.id,c.factura_id))).reduce((a,x)=>a+n(x.importe),0));
 const byClient=clients(D,p.proyecto_id).map(c=>{const own=emitted.filter(x=>same(x.cliente_id,c.cliente_id)),all=activeInvoices.filter(x=>same(x.cliente_id,c.cliente_id)),allocation=c.porcentaje==null?null:round(total*n(c.porcentaje)/100),usedClient=round(sum(all)+sum(planned.filter(x=>same(x.cliente_id||p.cliente_id,c.cliente_id)))),collectedClient=collected(own);return {...c,allocation,billed:sum(own),draft:sum(drafts.filter(x=>same(x.cliente_id,c.cliente_id))),used:usedClient,available:Math.max(0,round(Math.min(total-used,allocation==null?total-used:allocation-usedClient))),collected:collectedClient,toCollect:round(own.reduce((a,x)=>a+n(x.total),0)-collectedClient)}});
 return {total,invoices,emitted,drafts,planned,billed,draft,reserved,remaining:round(total-billed),available:Math.max(0,round(total-used)),collected:collected(emitted),toCollect:round(emitted.reduce((a,x)=>a+n(x.total),0)-collected(emitted)),byClient};
}
function quote(D,p,amount){
 const groups=new Map();const source=p.kind==='honorarios'?p.fee_lines||[]:p.items||[];
 source.forEach(x=>{const rate=n(x.vat??x.ivaPct??21),b=p.kind==='honorarios'?n(x.amount??x.importe):n(x.qty??x.cantidad)*n(x.price??x.precio);groups.set(rate,(groups.get(rate)||0)+b)});
 for(const [rate,b] of groups)groups.set(rate,round(b));
 const ids=new Set((D.facturas||[]).filter(f=>same(f.presupuesto_id,p.id)&&active(f)).map(x=>String(x.id)));
 (D.lineas||[]).filter(x=>ids.has(String(x.factura_id))).forEach(x=>{const rate=n(x.iva_pct),used=n(x.cantidad)*n(x.precio_unitario)*(1-n(x.descuento_pct)/100);groups.set(rate,(groups.get(rate)||0)-used)});
 const remaining=[...groups].sort((a,b)=>a[0]-b[0]).map(([rate,b])=>[rate,round(b)]),available=round(remaining.reduce((a,x)=>a+x[1],0));
 if(remaining.some(x=>x[1]<0)||available<=0||amount>available)return null;
 let cumulative=0,allocated=0;const taxes=remaining.map(([rate,b])=>{cumulative+=b;const portion=round(amount*cumulative/available)-allocated;allocated=round(allocated+portion);return {rate,base:round(portion),vat:round(portion*rate/100)}}).filter(x=>x.base>0);
 const vat=round(taxes.reduce((a,x)=>a+x.vat,0)),irpf=p.irpf_enabled?round(amount*n(p.irpf_pct)/100):0;
 return {base:round(amount),taxes,vat,irpf,total:round(amount+vat-irpf)};
}
const api={round,same,active,issued,base,clients,summary,quote};root.IriarteBilling=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);

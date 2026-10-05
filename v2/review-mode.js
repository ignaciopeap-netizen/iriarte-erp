// Iriarte ERP V2 · modo de revisión pública, solo lectura y con datos ficticios.
(function(){
'use strict';
window.IRIARTE_REVIEW_MODE=true;
const uid='00000000-0000-4000-8000-000000000001';
const ids={client:'10000000-0000-4000-8000-000000000001',client2:'10000000-0000-4000-8000-000000000002',project:'20000000-0000-4000-8000-000000000001',project2:'20000000-0000-4000-8000-000000000002',budget:'30000000-0000-4000-8000-000000000001',invoice:'40000000-0000-4000-8000-000000000001',supplier:'50000000-0000-4000-8000-000000000001',purchase:'60000000-0000-4000-8000-000000000001',task:'70000000-0000-4000-8000-000000000001',incident:'71000000-0000-4000-8000-000000000001',visit:'72000000-0000-4000-8000-000000000001'};
const now='2026-10-05T08:00:00.000Z';
const data={
 profiles:[{id:uid,name:'Usuario de revisión',nombre:'Usuario de revisión',email:'revision@demo.local',role:'admin'}],
 clientes:[{id:ids.client,nombre:'Cliente Demo',cif:'B12345678',email:'cliente@demo.local',telefono:'600 000 001',direccion:'Sevilla',activo:true,updated_at:now},{id:ids.client2,nombre:'Cliente Patio',cif:'B87654321',email:'patio@demo.local',telefono:'600 000 002',direccion:'Córdoba',activo:true,updated_at:now}],
 v_proyectos_operativos:[{id:ids.project,nombre:'Jardín Casa Demo',codigo:'DEM-001',cliente_id:ids.client,direccion:'Sevilla',estado:'en_obra',fecha_inicio:'2026-09-01',importe_contratado:18500,updated_at:now},{id:ids.project2,nombre:'Patio Mediterráneo',codigo:'DEM-002',cliente_id:ids.client2,direccion:'Córdoba',estado:'activo',fecha_inicio:'2026-10-01',importe_contratado:9400,updated_at:now}],
 proyectos:[{id:ids.project,nombre:'Jardín Casa Demo',codigo:'DEM-001',cliente_id:ids.client,direccion:'Sevilla',estado:'en_obra',fecha_inicio:'2026-09-01',importe_contratado:18500,updated_at:now},{id:ids.project2,nombre:'Patio Mediterráneo',codigo:'DEM-002',cliente_id:ids.client2,direccion:'Córdoba',estado:'activo',fecha_inicio:'2026-10-01',importe_contratado:9400,updated_at:now}],
 presupuestos:[{id:ids.budget,nombre:'Jardín Casa Demo',name:'Jardín Casa Demo',kind:'obra',cliente_id:ids.client,proyecto_id:ids.project,fecha:'2026-09-03',date:'2026-09-03',numero:'DEM-001-Pres.1',ref:'DEM-001-Pres.1',client:'Cliente Demo',address:'Sevilla',phase:'Aceptado',estado:'aceptado',status:'Aceptado',archived:false,irpf_enabled:false,irpf_pct:15,base:12000,total:14520,updated_at:now,items:[{code:'PL-01',section:'Plantación',description:'Suministro y plantación de arbolado',location:'Zona principal',unit:'ud',qty:3,price:850,vat:21},{code:'RI-01',section:'Riego',description:'Sistema de riego por goteo',location:'Jardín',unit:'ud',qty:1,price:2800,vat:21},{code:'PA-01',section:'Pavimentos',description:'Pavimento drenante',location:'Acceso',unit:'m²',qty:35,price:190,vat:21}]}],
 facturas:[{id:ids.invoice,numero:'F-2026-014',fecha:'2026-09-20',cliente_id:ids.client,proyecto_id:ids.project,presupuesto_id:ids.budget,concepto:'Primera certificación Jardín Casa Demo',base:6000,iva_pct:21,iva_importe:1260,total:7260,estado:'emitida',fecha_vencimiento:'2026-10-20',created_at:now}],
 factura_lineas:[{id:'41000000-0000-4000-8000-000000000001',factura_id:ids.invoice,orden:1,codigo:'CERT-01',seccion:'Certificación',descripcion:'Primera certificación de obra',unidad:'ud',cantidad:1,precio_unitario:6000,descuento_pct:0,iva_pct:21}],
 proveedores:[{id:ids.supplier,nombre:'Viveros Demo',cif:'B11223344',email:'proveedor@demo.local',telefono:'955 000 000',activo:true,updated_at:now}],
 compras:[{id:ids.purchase,fecha:'2026-09-12',numero_factura:'VD-984',proveedor_id:ids.supplier,proyecto_id:ids.project,concepto:'Arbolado y planta',base:2400,iva_pct:10,iva_importe:240,total:2640,estado:'parcialmente_pagada',fecha_vencimiento:'2026-10-12'}],
 cobros:[{id:'80000000-0000-4000-8000-000000000001',factura_id:ids.invoice,fecha:'2026-09-30',importe:3000,metodo:'Transferencia',referencia:'DEMO-C-01'}],
 pagos:[{id:'81000000-0000-4000-8000-000000000001',compra_id:ids.purchase,fecha:'2026-09-25',importe:1500,metodo:'Transferencia',referencia:'DEMO-P-01'}],
 horas_proyecto:[{id:'82000000-0000-4000-8000-000000000001',proyecto_id:ids.project,persona:'Equipo obra',fecha:'2026-09-24',horas:18,coste_hora:24,concepto:'Montaje y plantación'}],
 obra_visitas:[{id:ids.visit,project_id:ids.project,fecha:'2026-09-26',titulo:'Visita de seguimiento',descripcion:'Revisión de plantación y replanteo.',estado_obra:'en curso'}],
 obra_tareas:[{id:ids.task,project_id:ids.project,titulo:'Revisar programación de riego',descripcion:'Ajustar sectores tras plantación.',estado:'pendiente',prioridad:'normal',fecha_limite:'2026-10-10',created_at:now}],
 obra_incidencias:[{id:ids.incident,project_id:ids.project,titulo:'Ajuste de cota en acceso',descripcion:'Pendiente de validar con dirección.',tipo:'obra',estado:'abierta',prioridad:'normal',created_at:now}],
 documentos:[{id:'83000000-0000-4000-8000-000000000001',proyecto_id:ids.project,nombre:'Plano plantación demo.pdf',tipo:'Plano',descripcion:'Documento ficticio para revisión',archivo_nombre:'plano-demo.pdf',fecha_documento:'2026-09-05',created_at:now}],
 gastos_generales:[{id:'84000000-0000-4000-8000-000000000001',fecha:'2026-09-15',categoria:'Desplazamientos',concepto:'Desplazamiento obra',proyecto_id:ids.project,base:120,iva_pct:21,iva_importe:25.2,total:145.2,pagado:true}],
 movimientos_financieros:[{id:'85000000-0000-4000-8000-000000000001',fecha:'2026-09-30',tipo:'cobro',concepto:'Transferencia cliente DEMO',total:3000,cuenta:'Banco demo',conciliado:true,proyecto_id:ids.project,cliente_id:ids.client,factura_id:ids.invoice},{id:'85000000-0000-4000-8000-000000000002',fecha:'2026-10-02',tipo:'pago',concepto:'Factura pendiente de conciliar',total:950,cuenta:'Banco demo',conciliado:false}],
 v_proyectos_resumen:[{proyecto_id:ids.project,proyecto:'Jardín Casa Demo',cliente:'Cliente Demo',ingresos_facturados:6000,cobrado:3000,costes_compras:2400,horas:18,coste_horas:432,margen_directo:3168},{proyecto_id:ids.project2,proyecto:'Patio Mediterráneo',cliente:'Cliente Patio',ingresos_facturados:0,cobrado:0,costes_compras:0,horas:0,coste_horas:0,margen_directo:0}],
 v_finanzas_mensual:[{mes:'2026-09-01',facturado_base:6000,cobrado:3000,compras_base:2400,pagado_proveedores:1500,gastos_generales_base:120,resultado_antes_coste_personal:3480}],
 v_control_integridad_erp:[{facturas_sin_proyecto:0,compras_sin_proyecto:0,horas_sin_proyecto:0,documentos_sin_proyecto:0,movimientos_sin_proyecto:0,visitas_sin_proyecto:0,tareas_sin_proyecto:0,incidencias_sin_proyecto:0,facturas_total_cero_con_lineas:0,facturas_cobradas_incoherentes:0,compras_pagadas_incoherentes:0,facturas_borrador_con_cobros:0,facturas_sobrecobradas:0,compras_sobrepagadas:0,documentos_factura_proyecto_incoherente:0,documentos_compra_proyecto_incoherente:0,movimientos_factura_proyecto_incoherente:0,movimientos_compra_proyecto_incoherente:0,cobros_conciliados_sin_cobro:0,pagos_conciliados_sin_pago:0,fases_facturadas_sin_factura:0,fases_pendientes_con_factura_emitida:0,fases_con_factura_estado_incoherente:0,presupuestos_proyecto_sin_vinculo:0}]
};
function tableRows(name){return structuredClone(data[name]||[])}
function applyFilters(rows,filters){return rows.filter(row=>filters.every(f=>{const v=row[f.key];if(f.op==='eq')return String(v??'')===String(f.value??'');if(f.op==='neq')return String(v??'')!==String(f.value??'');if(f.op==='is')return f.value===null?v==null:String(v)===String(f.value);if(f.op==='in')return (f.value||[]).map(String).includes(String(v));return true}))}
class Query{
 constructor(name){this.name=name;this.filters=[];this.limitN=null;this.singleMode=false;this.mutation=null;}
 select(){return this} order(){return this} limit(n){this.limitN=n;return this} eq(key,value){this.filters.push({op:'eq',key,value});return this} neq(key,value){this.filters.push({op:'neq',key,value});return this} is(key,value){this.filters.push({op:'is',key,value});return this} in(key,value){this.filters.push({op:'in',key,value});return this} gte(){return this} lte(){return this} contains(){return this}
 maybeSingle(){const rows=applyFilters(tableRows(this.name),this.filters);return Promise.resolve({data:rows[0]||null,error:null})}
 single(){const rows=applyFilters(tableRows(this.name),this.filters);return Promise.resolve({data:rows[0]||null,error:rows.length?null:{message:'Registro demo no encontrado'}})}
 insert(){this.mutation='insert';return this} update(){this.mutation='update';return this} delete(){this.mutation='delete';return this} upsert(){this.mutation='upsert';return this}
 result(){if(this.mutation)return {data:null,error:{message:'Modo revisión: los cambios están desactivados.'}};let rows=applyFilters(tableRows(this.name),this.filters);if(Number.isFinite(this.limitN))rows=rows.slice(0,this.limitN);return {data:rows,error:null}}
 then(resolve,reject){return Promise.resolve(this.result()).then(resolve,reject)}
}
const fakeClient={
 from(name){return new Query(name)},
 rpc(){return Promise.resolve({data:null,error:{message:'Modo revisión: las operaciones de escritura están desactivadas.'}})},
 auth:{
  getSession(){return Promise.resolve({data:{session:{user:{id:uid,email:'revision@demo.local'}}},error:null})},
  signInWithPassword(){return Promise.resolve({data:{user:{id:uid,email:'revision@demo.local'},session:{user:{id:uid,email:'revision@demo.local'}}},error:null})},
  signOut(){return Promise.resolve({error:null})},
  resetPasswordForEmail(){return Promise.resolve({data:{},error:null})},
  updateUser(){return Promise.resolve({data:{user:{id:uid,email:'revision@demo.local'}},error:null})},
  onAuthStateChange(cb){setTimeout(()=>cb('SIGNED_IN',{user:{id:uid,email:'revision@demo.local'}}),0);return {data:{subscription:{unsubscribe(){}}}}}
 },
 storage:{from(){return {createSignedUrl(){return Promise.resolve({data:null,error:{message:'Modo revisión: los archivos reales no están disponibles.'}})},upload(){return Promise.resolve({data:null,error:{message:'Modo revisión: solo lectura.'}})},remove(){return Promise.resolve({data:[],error:null})}}}}
};
if(window.supabase&&typeof window.supabase.createClient==='function')window.supabase.createClient=()=>fakeClient;
function badge(){
 if(document.querySelector('#iriarte-review-banner'))return;
 const el=document.createElement('div');el.id='iriarte-review-banner';el.textContent='MODO REVISIÓN · DATOS FICTICIOS · SOLO LECTURA';el.style.cssText='position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:99999;background:#253120;color:#fff;padding:8px 14px;border-radius:999px;font:700 11px Arial;letter-spacing:.7px;box-shadow:0 5px 18px rgba(0,0,0,.18)';document.body.appendChild(el)
}
window.addEventListener('DOMContentLoaded',badge);setTimeout(badge,500);
})();

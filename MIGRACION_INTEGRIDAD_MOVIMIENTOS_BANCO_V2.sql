-- Iriarte ERP V2
-- Alinea el control global con la clasificación bancaria V2.
-- general_estudio, coste_personal y no_estudio son válidos sin proyecto.
-- Solo movimientos de proyecto o ligados a documentos financieros deben tenerlo.

create or replace view public.v_control_integridad_erp
with (security_invoker=true)
as
with inv as (
  select f.id,
         lower(coalesce(f.estado,'borrador')) as estado,
         f.total,
         f.proyecto_id,
         f.cliente_id,
         coalesce((select sum(c.importe) from public.cobros c where c.factura_id=f.id),0::numeric) as cobrado,
         (select count(*) from public.factura_lineas l where l.factura_id=f.id) as lineas
  from public.facturas f
), pur as (
  select c.id,
         lower(coalesce(c.estado,'pendiente')) as estado,
         c.total,
         c.proyecto_id,
         c.proveedor_id,
         coalesce((select sum(p.importe) from public.pagos p where p.compra_id=c.id),0::numeric) as pagado
  from public.compras c
)
select
  (select count(*) from public.facturas where proyecto_id is null)::integer as facturas_sin_proyecto,
  (select count(*) from public.compras where proyecto_id is null)::integer as compras_sin_proyecto,
  (select count(*) from public.horas_proyecto where proyecto_id is null)::integer as horas_sin_proyecto,
  (select count(*) from public.documentos
    where proyecto_id is null
      and (factura_id is not null or compra_id is not null or tarea_id is not null or incidencia_id is not null))::integer as documentos_sin_proyecto,
  (select count(*) from public.movimientos_financieros
    where conciliado=true
      and proyecto_id is null
      and (factura_id is not null or compra_id is not null or categoria in ('gasto_directo','movimiento_proyecto')))::integer as movimientos_sin_proyecto,
  (select count(*) from inv where total=0 and lineas>0)::integer as facturas_total_cero_con_lineas,
  (select count(*) from inv where estado='cobrada' and cobrado+0.01<total)::integer as facturas_cobradas_incoherentes,
  (select count(*) from pur where estado='pagada' and pagado+0.01<total)::integer as compras_pagadas_incoherentes,
  (select count(*) from public.presupuesto_fases_facturacion where estado='facturada' and factura_id is null)::integer as fases_facturadas_sin_factura,
  (select count(*) from public.presupuesto_fases_facturacion where factura_id is not null and estado <> all(array['pendiente','facturada','cobrada','anulada']))::integer as fases_con_factura_estado_incoherente,
  (select count(*) from public.presupuestos where proyecto_id is null and coalesce(archived,false)=false)::integer as presupuestos_proyecto_sin_vinculo,
  (select count(*) from public.obra_visitas where project_id is null)::integer as visitas_sin_proyecto,
  (select count(*) from public.obra_tareas where project_id is null)::integer as tareas_sin_proyecto,
  (select count(*) from public.obra_incidencias where project_id is null)::integer as incidencias_sin_proyecto,
  (select count(*) from public.documentos d join public.facturas f on f.id=d.factura_id where d.proyecto_id is distinct from f.proyecto_id)::integer as documentos_factura_proyecto_incoherente,
  (select count(*) from public.documentos d join public.compras c on c.id=d.compra_id where d.proyecto_id is distinct from c.proyecto_id)::integer as documentos_compra_proyecto_incoherente,
  (select count(*) from public.movimientos_financieros m join public.facturas f on f.id=m.factura_id where m.proyecto_id is distinct from f.proyecto_id)::integer as movimientos_factura_proyecto_incoherente,
  (select count(*) from public.movimientos_financieros m join public.compras c on c.id=m.compra_id where m.proyecto_id is distinct from c.proyecto_id)::integer as movimientos_compra_proyecto_incoherente,
  (select count(*) from public.movimientos_financieros where conciliado=true and tipo='cobro' and factura_id is not null and cobro_id is null)::integer as cobros_conciliados_sin_cobro,
  (select count(*) from public.movimientos_financieros where conciliado=true and tipo='pago' and compra_id is not null and pago_id is null)::integer as pagos_conciliados_sin_pago,
  (select count(*) from inv where estado='borrador' and cobrado>0.01)::integer as facturas_borrador_con_cobros,
  (select count(*) from inv where cobrado>total+0.01)::integer as facturas_sobrecobradas,
  (select count(*) from pur where pagado>total+0.01)::integer as compras_sobrepagadas,
  (select count(*) from public.presupuesto_fases_facturacion pf join public.facturas f on f.id=pf.factura_id where pf.estado='pendiente' and lower(coalesce(f.estado,'borrador'))<>'borrador')::integer as fases_pendientes_con_factura_emitida,
  (select count(*) from public.proyectos where cliente_id is null)::integer as proyectos_sin_cliente,
  (select count(*) from public.proyectos where nullif(trim(coalesce(codigo,'')),'') is null)::integer as proyectos_sin_codigo,
  (select count(*) from public.horas_proyecto where coalesce(horas,0)>0 and coalesce(coste_hora,0)<=0)::integer as horas_coste_cero,
  (select count(*) from inv where estado<>'anulada' and (
     (cobrado>0.01 and estado is distinct from case when total>0 and cobrado+0.01>=total then 'cobrada' else 'parcialmente_cobrada' end)
     or (cobrado<=0.01 and estado=any(array['cobrada','parcialmente_cobrada']))
  ))::integer as facturas_estado_cobro_incoherente,
  (select count(*) from pur where estado<>'anulada' and estado is distinct from case
     when total>0 and pagado+0.01>=total then 'pagada'
     when pagado>0.01 then 'parcialmente_pagada'
     else 'pendiente'
  end)::integer as compras_estado_pago_incoherente;

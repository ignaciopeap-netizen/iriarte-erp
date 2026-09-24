-- IRIARTE ERP V2 · ampliación del control de integridad
-- Añade incoherencias relacionales de obra, documentos y conciliación bancaria.

create or replace view public.v_control_integridad_erp as
with inv as (
  select f.id,f.estado,f.total,f.proyecto_id,f.cliente_id,
         coalesce((select sum(c.importe) from public.cobros c where c.factura_id=f.id),0) as cobrado,
         (select count(*) from public.factura_lineas l where l.factura_id=f.id) as lineas
  from public.facturas f
), pur as (
  select c.id,c.estado,c.total,c.proyecto_id,c.proveedor_id,
         coalesce((select sum(p.importe) from public.pagos p where p.compra_id=c.id),0) as pagado
  from public.compras c
)
select
  (select count(*) from public.facturas where proyecto_id is null)::integer as facturas_sin_proyecto,
  (select count(*) from public.compras where proyecto_id is null)::integer as compras_sin_proyecto,
  (select count(*) from public.horas_proyecto where proyecto_id is null)::integer as horas_sin_proyecto,
  (select count(*) from public.documentos where proyecto_id is null)::integer as documentos_sin_proyecto,
  (select count(*) from public.movimientos_financieros where proyecto_id is null)::integer as movimientos_sin_proyecto,

  (select count(*) from public.obra_visitas where project_id is null)::integer as visitas_sin_proyecto,
  (select count(*) from public.obra_tareas where project_id is null)::integer as tareas_sin_proyecto,
  (select count(*) from public.obra_incidencias where project_id is null)::integer as incidencias_sin_proyecto,

  (select count(*) from inv where total=0 and lineas>0)::integer as facturas_total_cero_con_lineas,
  (select count(*) from inv where estado='cobrada' and cobrado+0.01<total)::integer as facturas_cobradas_incoherentes,
  (select count(*) from pur where estado='pagada' and pagado+0.01<total)::integer as compras_pagadas_incoherentes,

  (select count(*)
   from public.documentos d join public.facturas f on f.id=d.factura_id
   where d.proyecto_id is distinct from f.proyecto_id)::integer as documentos_factura_proyecto_incoherente,
  (select count(*)
   from public.documentos d join public.compras c on c.id=d.compra_id
   where d.proyecto_id is distinct from c.proyecto_id)::integer as documentos_compra_proyecto_incoherente,

  (select count(*)
   from public.movimientos_financieros m join public.facturas f on f.id=m.factura_id
   where m.proyecto_id is distinct from f.proyecto_id)::integer as movimientos_factura_proyecto_incoherente,
  (select count(*)
   from public.movimientos_financieros m join public.compras c on c.id=m.compra_id
   where m.proyecto_id is distinct from c.proyecto_id)::integer as movimientos_compra_proyecto_incoherente,

  (select count(*) from public.movimientos_financieros
   where conciliado=true and tipo='cobro' and factura_id is not null and cobro_id is null)::integer as cobros_conciliados_sin_cobro,
  (select count(*) from public.movimientos_financieros
   where conciliado=true and tipo='pago' and compra_id is not null and pago_id is null)::integer as pagos_conciliados_sin_pago,

  (select count(*) from public.presupuesto_fases_facturacion
   where estado='facturada' and factura_id is null)::integer as fases_facturadas_sin_factura,
  (select count(*) from public.presupuesto_fases_facturacion
   where factura_id is not null and estado not in ('facturada','cobrada','anulada'))::integer as fases_con_factura_estado_incoherente,
  (select count(*) from public.presupuestos
   where lower(coalesce(status,''))='proyecto' and proyecto_id is null)::integer as presupuestos_proyecto_sin_vinculo;

grant select on public.v_control_integridad_erp to authenticated;

-- IRIARTE ERP V2 · semántica financiera de facturas
-- Un borrador todavía no es facturación emitida: no entra en ingresos,
-- margen, pendiente de cobro ni evolución mensual hasta salir de borrador.

create or replace view public.v_proyectos_resumen as
select
  p.id as proyecto_id,
  p.nombre as proyecto,
  c.nombre as cliente,
  p.cliente_id,
  coalesce((
    select sum(f.base)
    from public.facturas f
    where f.proyecto_id=p.id
      and lower(coalesce(f.estado,'borrador')) not in ('anulada','borrador')
  ),0::numeric) as ingresos_facturados,
  coalesce((
    select sum(cb.importe)
    from public.cobros cb
    join public.facturas f on f.id=cb.factura_id
    where f.proyecto_id=p.id
      and lower(coalesce(f.estado,'borrador')) not in ('anulada','borrador')
  ),0::numeric) as cobrado,
  coalesce((
    select sum(co.base)
    from public.compras co
    where co.proyecto_id=p.id
      and lower(coalesce(co.estado,'')) <> 'anulada'
  ),0::numeric) as costes_compras,
  coalesce((
    select sum(pa.importe)
    from public.pagos pa
    join public.compras co on co.id=pa.compra_id
    where co.proyecto_id=p.id
      and lower(coalesce(co.estado,'')) <> 'anulada'
  ),0::numeric) as pagado,
  coalesce((select sum(h.horas) from public.horas_proyecto h where h.proyecto_id=p.id),0::numeric) as horas,
  coalesce((select sum(h.horas*h.coste_hora) from public.horas_proyecto h where h.proyecto_id=p.id),0::numeric) as coste_horas,
  coalesce((
    select sum(f.base)
    from public.facturas f
    where f.proyecto_id=p.id
      and lower(coalesce(f.estado,'borrador')) not in ('anulada','borrador')
  ),0::numeric)
  - coalesce((
    select sum(co.base)
    from public.compras co
    where co.proyecto_id=p.id
      and lower(coalesce(co.estado,'')) <> 'anulada'
  ),0::numeric)
  - coalesce((select sum(h.horas*h.coste_hora) from public.horas_proyecto h where h.proyecto_id=p.id),0::numeric)
  as margen_directo
from public.proyectos p
left join public.clientes c on c.id=p.cliente_id;

grant select on public.v_proyectos_resumen to authenticated;

create or replace view public.v_finanzas_mensual as
with meses as (
  select date_trunc('month',f.fecha::timestamptz)::date as mes
  from public.facturas f
  where lower(coalesce(f.estado,'borrador')) not in ('anulada','borrador')
  union
  select date_trunc('month',c.fecha::timestamptz)::date from public.cobros c
  union
  select date_trunc('month',co.fecha::timestamptz)::date from public.compras co
  where lower(coalesce(co.estado,'')) <> 'anulada'
  union
  select date_trunc('month',p.fecha::timestamptz)::date from public.pagos p
  union
  select date_trunc('month',g.fecha::timestamptz)::date from public.gastos_generales g
)
select
  m.mes,
  coalesce((select sum(f.base) from public.facturas f
    where date_trunc('month',f.fecha::timestamptz)::date=m.mes
      and lower(coalesce(f.estado,'borrador')) not in ('anulada','borrador')),0::numeric) as facturado_base,
  coalesce((select sum(c.importe) from public.cobros c
    join public.facturas f on f.id=c.factura_id
    where date_trunc('month',c.fecha::timestamptz)::date=m.mes
      and lower(coalesce(f.estado,'borrador')) not in ('anulada','borrador')),0::numeric) as cobrado,
  coalesce((select sum(co.base) from public.compras co
    where date_trunc('month',co.fecha::timestamptz)::date=m.mes
      and lower(coalesce(co.estado,'')) <> 'anulada'),0::numeric) as compras_base,
  coalesce((select sum(p.importe) from public.pagos p
    join public.compras co on co.id=p.compra_id
    where date_trunc('month',p.fecha::timestamptz)::date=m.mes
      and lower(coalesce(co.estado,'')) <> 'anulada'),0::numeric) as pagado_proveedores,
  coalesce((select sum(g.base) from public.gastos_generales g
    where date_trunc('month',g.fecha::timestamptz)::date=m.mes),0::numeric) as gastos_generales_base,
  coalesce((select sum(f.base) from public.facturas f
    where date_trunc('month',f.fecha::timestamptz)::date=m.mes
      and lower(coalesce(f.estado,'borrador')) not in ('anulada','borrador')),0::numeric)
  - coalesce((select sum(co.base) from public.compras co
    where date_trunc('month',co.fecha::timestamptz)::date=m.mes
      and lower(coalesce(co.estado,'')) <> 'anulada'),0::numeric)
  - coalesce((select sum(g.base) from public.gastos_generales g
    where date_trunc('month',g.fecha::timestamptz)::date=m.mes),0::numeric)
  as resultado_antes_coste_personal
from meses m
where m.mes is not null
order by m.mes;

grant select on public.v_finanzas_mensual to authenticated;

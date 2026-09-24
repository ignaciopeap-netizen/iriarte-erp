-- IRIARTE ERP V2 · conciliación bancaria que registra cobros/pagos reales
-- Aplicada al proyecto Supabase kzmjeccivhkhtuokfkta el 24-09-2026.

create or replace function public.conciliar_movimiento_v2(
  p_movimiento_id uuid,
  p_proyecto_id text default null,
  p_cliente_id uuid default null,
  p_proveedor_id uuid default null,
  p_factura_id uuid default null,
  p_compra_id uuid default null,
  p_categoria text default null,
  p_subcategoria text default null,
  p_notas text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  m public.movimientos_financieros%rowtype;
  v_cobro_id uuid;
  v_pago_id uuid;
  v_cliente uuid;
  v_proveedor uuid;
  v_proyecto text;
begin
  select * into m
  from public.movimientos_financieros
  where id=p_movimiento_id
  for update;

  if not found then
    raise exception 'Movimiento no encontrado';
  end if;

  v_proyecto := p_proyecto_id;
  v_cliente := p_cliente_id;
  v_proveedor := p_proveedor_id;

  if p_factura_id is not null then
    select coalesce(v_proyecto,f.proyecto_id),coalesce(v_cliente,f.cliente_id)
      into v_proyecto,v_cliente
    from public.facturas f
    where f.id=p_factura_id;
  end if;

  if p_compra_id is not null then
    select coalesce(v_proyecto,c.proyecto_id),coalesce(v_proveedor,c.proveedor_id)
      into v_proyecto,v_proveedor
    from public.compras c
    where c.id=p_compra_id;
  end if;

  update public.movimientos_financieros
  set proyecto_id=v_proyecto,
      cliente_id=v_cliente,
      proveedor_id=v_proveedor,
      factura_id=p_factura_id,
      compra_id=p_compra_id,
      categoria=p_categoria,
      subcategoria=p_subcategoria,
      notas=p_notas,
      conciliado=true
  where id=p_movimiento_id;

  if m.tipo='cobro' and p_factura_id is not null and m.cobro_id is null then
    insert into public.cobros(
      factura_id,fecha,importe,metodo,referencia,cuenta,notas,created_by
    ) values (
      p_factura_id,m.fecha,m.total,'Banco',m.referencia,m.cuenta,
      coalesce(p_notas,'Conciliado desde movimiento bancario'),m.created_by
    ) returning id into v_cobro_id;

    -- El trigger estándar crea un movimiento financiero. Conservamos el movimiento
    -- bancario importado como registro canónico y eliminamos únicamente ese duplicado.
    delete from public.movimientos_financieros
    where cobro_id=v_cobro_id and id<>p_movimiento_id;

    update public.movimientos_financieros
    set cobro_id=v_cobro_id
    where id=p_movimiento_id;

  elsif m.tipo='pago' and p_compra_id is not null and m.pago_id is null then
    insert into public.pagos(
      compra_id,fecha,importe,metodo,referencia,cuenta,notas,created_by
    ) values (
      p_compra_id,m.fecha,m.total,'Banco',m.referencia,m.cuenta,
      coalesce(p_notas,'Conciliado desde movimiento bancario'),m.created_by
    ) returning id into v_pago_id;

    delete from public.movimientos_financieros
    where pago_id=v_pago_id and id<>p_movimiento_id;

    update public.movimientos_financieros
    set pago_id=v_pago_id
    where id=p_movimiento_id;
  end if;

  return jsonb_build_object(
    'movimiento_id',p_movimiento_id,
    'cobro_id',v_cobro_id,
    'pago_id',v_pago_id,
    'conciliado',true
  );
end;
$$;

grant execute on function public.conciliar_movimiento_v2(
  uuid,text,uuid,uuid,uuid,uuid,text,text,text
) to authenticated;

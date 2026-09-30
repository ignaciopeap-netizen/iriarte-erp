-- Iriarte ERP V2
-- Desconciliación segura de movimientos bancarios importados.
-- Conserva el movimiento bancario original y revierte únicamente el cobro/pago
-- materializado por su conciliación.

create or replace function public.desconciliar_movimiento_v2(p_movimiento_id uuid)
returns jsonb
language plpgsql
set search_path to 'public'
as $function$
declare
  m public.movimientos_financieros%rowtype;
  v_cobro_id uuid;
  v_pago_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Autenticación requerida';
  end if;

  select * into m
  from public.movimientos_financieros
  where id = p_movimiento_id
  for update;

  if not found then
    raise exception 'Movimiento no encontrado';
  end if;

  if m.origen_importacion is null then
    raise exception 'Solo se pueden desconciliar movimientos bancarios importados. Los cobros/pagos manuales se corrigen desde su documento de origen.';
  end if;

  if not coalesce(m.conciliado,false) then
    return jsonb_build_object(
      'movimiento_id', m.id,
      'conciliado', false,
      'already_unreconciled', true
    );
  end if;

  v_cobro_id := m.cobro_id;
  v_pago_id := m.pago_id;

  -- Desenganchar primero los registros materializados para que los triggers de
  -- DELETE en cobros/pagos no eliminen el movimiento bancario importado.
  update public.movimientos_financieros
  set conciliado = false,
      factura_id = null,
      compra_id = null,
      cobro_id = null,
      pago_id = null
  where id = m.id;

  if v_cobro_id is not null then
    delete from public.cobros where id = v_cobro_id;
  end if;

  if v_pago_id is not null then
    delete from public.pagos where id = v_pago_id;
  end if;

  return jsonb_build_object(
    'movimiento_id', m.id,
    'conciliado', false,
    'cobro_eliminado', v_cobro_id,
    'pago_eliminado', v_pago_id,
    'already_unreconciled', false
  );
end;
$function$;

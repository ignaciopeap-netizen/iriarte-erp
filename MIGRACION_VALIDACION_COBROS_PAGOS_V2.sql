-- IRIARTE ERP V2 · validación de cobros y pagos
-- Impide cobrar borradores/anuladas, pagar compras anuladas y sobrepasar
-- el total pendiente. También evita reducir un documento por debajo de lo ya cobrado/pagado.

create or replace function public.validar_cobro_v2()
returns trigger
language plpgsql
set search_path=public
as $$
declare
  v_total numeric;
  v_estado text;
  v_otros numeric;
begin
  if coalesce(new.importe,0) <= 0 then
    raise exception 'El importe del cobro debe ser mayor que cero';
  end if;

  select f.total, lower(coalesce(f.estado,'borrador'))
    into v_total,v_estado
  from public.facturas f
  where f.id=new.factura_id;

  if not found then raise exception 'Factura no encontrada'; end if;
  if v_estado='borrador' then raise exception 'No se puede cobrar una factura en borrador. Emítela primero.'; end if;
  if v_estado='anulada' then raise exception 'No se puede cobrar una factura anulada.'; end if;

  select coalesce(sum(c.importe),0) into v_otros
  from public.cobros c
  where c.factura_id=new.factura_id
    and (tg_op='INSERT' or c.id<>new.id);

  if v_otros + new.importe > coalesce(v_total,0) + 0.01 then
    raise exception 'El cobro supera el saldo pendiente de la factura';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validar_cobro_v2 on public.cobros;
create trigger trg_validar_cobro_v2
before insert or update of factura_id,importe on public.cobros
for each row execute function public.validar_cobro_v2();

create or replace function public.validar_pago_v2()
returns trigger
language plpgsql
set search_path=public
as $$
declare
  v_total numeric;
  v_estado text;
  v_otros numeric;
begin
  if coalesce(new.importe,0) <= 0 then
    raise exception 'El importe del pago debe ser mayor que cero';
  end if;

  select c.total, lower(coalesce(c.estado,'pendiente'))
    into v_total,v_estado
  from public.compras c
  where c.id=new.compra_id;

  if not found then raise exception 'Compra no encontrada'; end if;
  if v_estado='anulada' then raise exception 'No se puede pagar una compra anulada.'; end if;

  select coalesce(sum(p.importe),0) into v_otros
  from public.pagos p
  where p.compra_id=new.compra_id
    and (tg_op='INSERT' or p.id<>new.id);

  if v_otros + new.importe > coalesce(v_total,0) + 0.01 then
    raise exception 'El pago supera el saldo pendiente de la compra';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validar_pago_v2 on public.pagos;
create trigger trg_validar_pago_v2
before insert or update of compra_id,importe on public.pagos
for each row execute function public.validar_pago_v2();

create or replace function public.validar_total_factura_frente_cobros_v2()
returns trigger
language plpgsql
set search_path=public
as $$
declare v_cobrado numeric;
begin
  select coalesce(sum(c.importe),0) into v_cobrado
  from public.cobros c where c.factura_id=new.id;

  if lower(coalesce(new.estado,'borrador'))='anulada' and v_cobrado>0.01 then
    raise exception 'No se puede anular una factura que ya tiene cobros. Registra primero la corrección correspondiente.';
  end if;
  if coalesce(new.total,0)+0.01 < v_cobrado then
    raise exception 'El total de la factura no puede quedar por debajo de lo ya cobrado';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validar_total_factura_frente_cobros_v2 on public.facturas;
create trigger trg_validar_total_factura_frente_cobros_v2
before update of total,estado on public.facturas
for each row execute function public.validar_total_factura_frente_cobros_v2();

create or replace function public.validar_total_compra_frente_pagos_v2()
returns trigger
language plpgsql
set search_path=public
as $$
declare v_pagado numeric;
begin
  select coalesce(sum(p.importe),0) into v_pagado
  from public.pagos p where p.compra_id=new.id;

  if lower(coalesce(new.estado,'pendiente'))='anulada' and v_pagado>0.01 then
    raise exception 'No se puede anular una compra que ya tiene pagos.';
  end if;
  if coalesce(new.total,0)+0.01 < v_pagado then
    raise exception 'El total de la compra no puede quedar por debajo de lo ya pagado';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validar_total_compra_frente_pagos_v2 on public.compras;
create trigger trg_validar_total_compra_frente_pagos_v2
before update of total,estado on public.compras
for each row execute function public.validar_total_compra_frente_pagos_v2();

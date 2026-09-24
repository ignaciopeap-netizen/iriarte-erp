-- IRIARTE ERP V2 · coherencia de estados al editar importes
-- Si cambia el total de una factura/compra ya cobrada/pagada parcialmente,
-- recalcula el estado con los cobros/pagos reales existentes.

create or replace function public.recalcular_estado_factura_por_total_v2()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_cobrado numeric := 0;
  v_estado text;
begin
  if new.estado='anulada' then return new; end if;
  select coalesce(sum(importe),0) into v_cobrado from public.cobros where factura_id=new.id;
  if v_cobrado<=0 then return new; end if;
  v_estado := case
    when new.total>0 and v_cobrado>=new.total then 'cobrada'
    else 'parcialmente_cobrada'
  end;
  if new.estado is distinct from v_estado then
    update public.facturas set estado=v_estado,updated_at=now() where id=new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_recalcular_estado_factura_por_total_v2 on public.facturas;
create trigger trg_recalcular_estado_factura_por_total_v2
after update of total on public.facturas
for each row when (old.total is distinct from new.total)
execute function public.recalcular_estado_factura_por_total_v2();

create or replace function public.recalcular_estado_compra_por_total_v2()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_pagado numeric := 0;
  v_estado text;
begin
  if new.estado='anulada' then return new; end if;
  select coalesce(sum(importe),0) into v_pagado from public.pagos where compra_id=new.id;
  v_estado := case
    when v_pagado>=new.total and new.total>0 then 'pagada'
    when v_pagado>0 then 'parcialmente_pagada'
    else 'pendiente'
  end;
  if new.estado is distinct from v_estado then
    update public.compras set estado=v_estado,updated_at=now() where id=new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_recalcular_estado_compra_por_total_v2 on public.compras;
create trigger trg_recalcular_estado_compra_por_total_v2
after update of total on public.compras
for each row when (old.total is distinct from new.total)
execute function public.recalcular_estado_compra_por_total_v2();

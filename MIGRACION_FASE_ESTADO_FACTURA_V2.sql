-- IRIARTE ERP V2 · estado de fase derivado de su factura
-- Una factura en borrador mantiene la fase como "pendiente" hasta su emisión.
-- Así respetamos los estados canónicos de presupuesto_fases_facturacion.

create or replace function public.sync_presupuesto_fase_from_factura()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if new.presupuesto_fase_id is not null then
    update public.presupuesto_fases_facturacion
    set factura_id=new.id,
        estado=case lower(coalesce(new.estado,'borrador'))
          when 'borrador' then 'pendiente'
          when 'cobrada' then 'cobrada'
          when 'anulada' then 'anulada'
          else 'facturada'
        end
    where id=new.presupuesto_fase_id;
  end if;
  return new;
end;
$$;

create or replace function public.normalizar_estado_fase_factura_v2()
returns trigger
language plpgsql
set search_path=public
as $$
declare v_estado_factura text;
begin
  if new.factura_id is null then
    return new;
  end if;

  select lower(coalesce(f.estado,'borrador')) into v_estado_factura
  from public.facturas f where f.id=new.factura_id;

  if found then
    new.estado := case v_estado_factura
      when 'borrador' then 'pendiente'
      when 'cobrada' then 'cobrada'
      when 'anulada' then 'anulada'
      else 'facturada'
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_normalizar_estado_fase_factura_v2 on public.presupuesto_fases_facturacion;
create trigger trg_normalizar_estado_fase_factura_v2
before insert or update of factura_id,estado on public.presupuesto_fases_facturacion
for each row execute function public.normalizar_estado_fase_factura_v2();

update public.presupuesto_fases_facturacion pf
set estado=case lower(coalesce(f.estado,'borrador'))
  when 'borrador' then 'pendiente'
  when 'cobrada' then 'cobrada'
  when 'anulada' then 'anulada'
  else 'facturada'
end
from public.facturas f
where pf.factura_id=f.id;

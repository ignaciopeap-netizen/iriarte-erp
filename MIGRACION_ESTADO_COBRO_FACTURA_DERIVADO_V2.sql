-- Iriarte ERP V2
-- Los estados de cobro de una factura son derivados exclusivamente de cobros reales.
-- Ninguna escritura directa puede marcar una factura como cobrada/parcialmente_cobrada
-- si los movimientos vinculados no justifican ese estado.

create or replace function public.validar_estado_cobro_factura_v2()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
declare
  v_cobrado numeric := 0;
  v_estado text := lower(coalesce(new.estado,'borrador'));
begin
  if v_estado not in ('cobrada','parcialmente_cobrada') then
    return new;
  end if;

  if new.id is not null then
    select coalesce(sum(c.importe),0)
      into v_cobrado
    from public.cobros c
    where c.factura_id = new.id;
  end if;

  if v_estado = 'cobrada' then
    if v_cobrado <= 0.01
       or coalesce(new.total,0) <= 0
       or v_cobrado + 0.01 < coalesce(new.total,0) then
      raise exception 'El estado cobrada se calcula a partir de los cobros reales y no puede asignarse manualmente.';
    end if;
  elsif v_estado = 'parcialmente_cobrada' then
    if v_cobrado <= 0.01
       or (coalesce(new.total,0) > 0 and v_cobrado + 0.01 >= coalesce(new.total,0)) then
      raise exception 'El estado parcialmente_cobrada se calcula a partir de los cobros reales y no puede asignarse manualmente.';
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_validar_estado_cobro_factura_v2 on public.facturas;
create trigger trg_validar_estado_cobro_factura_v2
before insert or update of estado on public.facturas
for each row execute function public.validar_estado_cobro_factura_v2();

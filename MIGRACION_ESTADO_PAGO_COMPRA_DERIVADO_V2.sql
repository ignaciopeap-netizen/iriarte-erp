-- Iriarte ERP V2
-- El estado de pago de una compra se deriva exclusivamente de los pagos reales.
-- También normaliza de forma segura los estados históricos actuales.

create or replace function public.validar_estado_pago_compra_v2()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
declare
  v_pagado numeric := 0;
  v_estado text := lower(coalesce(new.estado,'pendiente'));
begin
  if v_estado not in ('pendiente','parcialmente_pagada','pagada') then
    return new;
  end if;

  if new.id is not null then
    select coalesce(sum(p.importe),0)
      into v_pagado
    from public.pagos p
    where p.compra_id = new.id;
  end if;

  if v_estado = 'pagada' then
    if coalesce(new.total,0) <= 0
       or v_pagado + 0.01 < coalesce(new.total,0) then
      raise exception 'El estado pagada se calcula a partir de los pagos reales y no puede asignarse manualmente.';
    end if;
  elsif v_estado = 'parcialmente_pagada' then
    if v_pagado <= 0.01
       or (coalesce(new.total,0) > 0 and v_pagado + 0.01 >= coalesce(new.total,0)) then
      raise exception 'El estado parcialmente_pagada se calcula a partir de los pagos reales y no puede asignarse manualmente.';
    end if;
  elsif v_estado = 'pendiente' then
    if v_pagado > 0.01 then
      raise exception 'Una compra con pagos registrados no puede permanecer pendiente. Su estado se calcula automáticamente.';
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_validar_estado_pago_compra_v2 on public.compras;
create trigger trg_validar_estado_pago_compra_v2
before insert or update of estado on public.compras
for each row execute function public.validar_estado_pago_compra_v2();

-- Normalización derivada, sin tocar ningún dato económico.
update public.compras c
set estado = case
  when coalesce(c.estado,'') = 'anulada' then 'anulada'
  when coalesce((select sum(p.importe) from public.pagos p where p.compra_id=c.id),0) >= c.total and c.total > 0 then 'pagada'
  when coalesce((select sum(p.importe) from public.pagos p where p.compra_id=c.id),0) > 0 then 'parcialmente_pagada'
  else 'pendiente'
end,
updated_at = now()
where coalesce(c.estado,'') <> 'anulada'
  and c.estado is distinct from case
    when coalesce((select sum(p.importe) from public.pagos p where p.compra_id=c.id),0) >= c.total and c.total > 0 then 'pagada'
    when coalesce((select sum(p.importe) from public.pagos p where p.compra_id=c.id),0) > 0 then 'parcialmente_pagada'
    else 'pendiente'
  end;

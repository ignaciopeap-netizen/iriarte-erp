-- IRIARTE ERP V2 · PAGOS PARCIALES DE COMPRAS
-- Aplicado al proyecto Supabase Presupuestos.

alter table public.compras drop constraint if exists compras_estado_check;
alter table public.compras add constraint compras_estado_check
check (estado = any (array[
  'pendiente'::text,
  'parcialmente_pagada'::text,
  'pagada'::text,
  'anulada'::text
]));

create or replace function public.actualizar_estado_compra()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_compra_id uuid;
  v_total_compra numeric(12,2);
  v_total_pagado numeric(12,2);
  v_estado_actual text;
begin
  v_compra_id := case when tg_op='DELETE' then old.compra_id else new.compra_id end;
  select total,estado into v_total_compra,v_estado_actual
  from public.compras where id=v_compra_id;

  if v_estado_actual='anulada' then
    return case when tg_op='DELETE' then old else new end;
  end if;

  select coalesce(sum(importe),0) into v_total_pagado
  from public.pagos where compra_id=v_compra_id;

  update public.compras
  set estado=case
      when v_total_pagado>=v_total_compra and v_total_compra>0 then 'pagada'
      when v_total_pagado>0 then 'parcialmente_pagada'
      else 'pendiente'
    end,
    updated_at=now()
  where id=v_compra_id;

  return case when tg_op='DELETE' then old else new end;
end;
$$;

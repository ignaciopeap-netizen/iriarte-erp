-- Iriarte ERP V2
-- Valida en servidor los campos numericos embebidos en presupuestos antes de
-- que sync_presupuesto_fields calcule base, IVA, IRPF y total.
-- El trigger solo actua en altas o cambios de los campos numericos/JSON, por
-- lo que los historicos ya existentes permanecen intactos hasta ser revisados.

create or replace function public.validar_numericos_presupuesto_v2()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  x jsonb;
  raw text;
  v numeric;
  i integer := 0;
begin
  if coalesce(new.irpf_pct,0) < 0 or coalesce(new.irpf_pct,0) > 100 then
    raise exception 'El IRPF del presupuesto debe estar entre 0%% y 100%%';
  end if;

  if coalesce(new.kind,'obra') = 'honorarios' then
    if jsonb_typeof(coalesce(new.fee_lines,'[]'::jsonb)) <> 'array' then
      raise exception 'Las lineas de honorarios deben tener formato de lista';
    end if;
    for x in select value from jsonb_array_elements(coalesce(new.fee_lines,'[]'::jsonb)) loop
      i := i + 1;
      raw := coalesce(nullif(x->>'amount',''),nullif(x->>'importe',''),'0');
      begin v := raw::numeric; exception when others then raise exception 'Honorario %: importe no numerico', i; end;
      if v < 0 then raise exception 'Honorario %: el importe no puede ser negativo', i; end if;

      raw := coalesce(nullif(x->>'vat',''),nullif(x->>'ivaPct',''),'21');
      begin v := raw::numeric; exception when others then raise exception 'Honorario %: IVA no numerico', i; end;
      if v < 0 or v > 100 then raise exception 'Honorario %: el IVA debe estar entre 0%% y 100%%', i; end if;
    end loop;
  else
    if jsonb_typeof(coalesce(new.items,'[]'::jsonb)) <> 'array' then
      raise exception 'Las lineas del presupuesto deben tener formato de lista';
    end if;
    for x in select value from jsonb_array_elements(coalesce(new.items,'[]'::jsonb)) loop
      i := i + 1;
      raw := coalesce(nullif(x->>'qty',''),nullif(x->>'cantidad',''),'0');
      begin v := raw::numeric; exception when others then raise exception 'Linea %: cantidad no numerica', i; end;
      if v < 0 then raise exception 'Linea %: la cantidad no puede ser negativa', i; end if;

      raw := coalesce(nullif(x->>'price',''),nullif(x->>'precio',''),'0');
      begin v := raw::numeric; exception when others then raise exception 'Linea %: precio no numerico', i; end;
      if v < 0 then raise exception 'Linea %: el precio no puede ser negativo', i; end if;

      raw := coalesce(nullif(x->>'vat',''),nullif(x->>'ivaPct',''),'21');
      begin v := raw::numeric; exception when others then raise exception 'Linea %: IVA no numerico', i; end;
      if v < 0 or v > 100 then raise exception 'Linea %: el IVA debe estar entre 0%% y 100%%', i; end if;
    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_presupuesto_numericos_v2 on public.presupuestos;
create trigger guard_presupuesto_numericos_v2
before insert or update of items, fee_lines, kind, irpf_enabled, irpf_pct
on public.presupuestos
for each row
execute function public.validar_numericos_presupuesto_v2();

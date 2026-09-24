-- IRIARTE ERP V2 · el estado visible del presupuesto sigue la fase elegida
-- Aplicada al proyecto Supabase kzmjeccivhkhtuokfkta el 24-09-2026.
-- Mantiene status para distinguir presupuestos convertidos en proyecto, pero phase
-- tiene prioridad al calcular estado (borrador/enviado/aceptado/rechazado/anulado).

create or replace function public.sync_presupuesto_fields()
returns trigger language plpgsql as $$
declare
  calc_base numeric := 0;
  calc_iva numeric := 0;
  calc_irpf numeric := 0;
  mapped_estado text;
begin
  if nullif(new.name,'') is not null then new.nombre := new.name; end if;
  if new.nombre is null or new.nombre='' then new.nombre := 'Presupuesto'; end if;
  if new.numero is null and nullif(new.ref,'') is not null then new.numero := new.ref; end if;
  if new.date ~ '^\d{4}-\d{2}-\d{2}$' then new.fecha := new.date::date; end if;
  if new.fecha is null then new.fecha := current_date; end if;

  mapped_estado := case lower(coalesce(nullif(new.phase,''),nullif(new.status,''),new.estado,''))
    when 'enviado' then 'enviado'
    when 'aceptado' then 'aceptado'
    when 'proyecto' then 'aceptado'
    when 'facturado' then 'aceptado'
    when 'rechazado' then 'rechazado'
    when 'anulado' then 'anulado'
    else 'borrador'
  end;
  new.estado := mapped_estado;

  if coalesce(new.kind,'obra')='honorarios' then
    select
      coalesce(sum(coalesce(nullif(x->>'amount','')::numeric,nullif(x->>'importe','')::numeric,0)),0),
      coalesce(sum(coalesce(nullif(x->>'amount','')::numeric,nullif(x->>'importe','')::numeric,0)
        * coalesce(nullif(x->>'vat','')::numeric,nullif(x->>'ivaPct','')::numeric,21)/100),0)
    into calc_base,calc_iva
    from jsonb_array_elements(coalesce(new.fee_lines,'[]'::jsonb)) x;
  else
    select
      coalesce(sum(coalesce(nullif(x->>'qty','')::numeric,nullif(x->>'cantidad','')::numeric,0)
        * coalesce(nullif(x->>'price','')::numeric,nullif(x->>'precio','')::numeric,0)),0),
      coalesce(sum(coalesce(nullif(x->>'qty','')::numeric,nullif(x->>'cantidad','')::numeric,0)
        * coalesce(nullif(x->>'price','')::numeric,nullif(x->>'precio','')::numeric,0)
        * coalesce(nullif(x->>'vat','')::numeric,nullif(x->>'ivaPct','')::numeric,21)/100),0)
    into calc_base,calc_iva
    from jsonb_array_elements(coalesce(new.items,'[]'::jsonb)) x;
  end if;

  calc_irpf := case when coalesce(new.irpf_enabled,false)
    then calc_base*coalesce(new.irpf_pct,0)/100 else 0 end;
  new.base := calc_base;
  new.iva_pct := 21;
  new.irpf_pct := case when coalesce(new.irpf_enabled,false) then coalesce(new.irpf_pct,0) else 0 end;
  new.total := calc_base+calc_iva-calc_irpf;
  new.updated_at := now();
  return new;
end $$;

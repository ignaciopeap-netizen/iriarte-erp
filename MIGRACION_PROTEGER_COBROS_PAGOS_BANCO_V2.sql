-- Iriarte ERP V2
-- Un cobro/pago creado por conciliación de un movimiento bancario importado
-- no debe editarse ni borrarse directamente. Primero se desconcilia el movimiento.

create or replace function public.proteger_cobro_pago_bancario_v2()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
declare
  v_id uuid;
  v_linked boolean := false;
begin
  v_id := case when tg_op='DELETE' then old.id else new.id end;

  if tg_table_name='cobros' then
    select exists(
      select 1
      from public.movimientos_financieros m
      where m.cobro_id=v_id
        and m.conciliado=true
        and m.origen_importacion is not null
    ) into v_linked;
  elsif tg_table_name='pagos' then
    select exists(
      select 1
      from public.movimientos_financieros m
      where m.pago_id=v_id
        and m.conciliado=true
        and m.origen_importacion is not null
    ) into v_linked;
  end if;

  if v_linked then
    raise exception 'Este % procede de una conciliación bancaria. Desconcilia primero el movimiento desde Banco.',
      case when tg_table_name='cobros' then 'cobro' else 'pago' end;
  end if;

  return case when tg_op='DELETE' then old else new end;
end;
$function$;

drop trigger if exists trg_proteger_cobro_bancario_v2 on public.cobros;
create trigger trg_proteger_cobro_bancario_v2
before update or delete on public.cobros
for each row execute function public.proteger_cobro_pago_bancario_v2();

drop trigger if exists trg_proteger_pago_bancario_v2 on public.pagos;
create trigger trg_proteger_pago_bancario_v2
before update or delete on public.pagos
for each row execute function public.proteger_cobro_pago_bancario_v2();

-- IRIARTE ERP V2 · FASES DE FACTURACIÓN
-- Sincroniza cada fase con la factura generada desde ella.

create or replace function public.sync_presupuesto_fase_from_factura()
returns trigger
language plpgsql
as $$
begin
  if new.presupuesto_fase_id is not null then
    update public.presupuesto_fases_facturacion
    set factura_id=new.id,
        estado=case
          when new.estado='cobrada' then 'cobrada'
          when new.estado='anulada' then 'anulada'
          else 'facturada'
        end
    where id=new.presupuesto_fase_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_presupuesto_fase_from_factura on public.facturas;
create trigger trg_sync_presupuesto_fase_from_factura
after insert or update of estado,presupuesto_fase_id on public.facturas
for each row execute function public.sync_presupuesto_fase_from_factura();

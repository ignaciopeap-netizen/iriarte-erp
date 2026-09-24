-- IRIARTE ERP V2 · importaciones bancarias ya conciliadas
-- Si una fila importada desde banco llega marcada como conciliada y vinculada
-- a una factura/compra, crea automáticamente el cobro/pago real y mantiene
-- el movimiento bancario importado como registro canónico.

create or replace function public.materializar_importacion_bancaria_conciliada_v2()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_cobro_id uuid;
  v_pago_id uuid;
begin
  -- Solo actúa sobre movimientos importados que ya vienen conciliados.
  if new.origen_importacion is null or coalesce(new.conciliado,false)=false then
    return new;
  end if;

  if new.tipo='cobro' and new.factura_id is not null and new.cobro_id is null then
    insert into public.cobros(
      factura_id,fecha,importe,metodo,referencia,cuenta,notas,created_by
    ) values (
      new.factura_id,new.fecha,new.total,'Banco',new.referencia,new.cuenta,
      coalesce(new.notas,'Importado y conciliado desde banco'),new.created_by
    ) returning id into v_cobro_id;

    -- El trigger estándar de cobros crea su propio movimiento. Eliminamos solo
    -- ese duplicado y dejamos el movimiento bancario original como canónico.
    delete from public.movimientos_financieros
    where cobro_id=v_cobro_id and id<>new.id;

    update public.movimientos_financieros
    set cobro_id=v_cobro_id
    where id=new.id;

  elsif new.tipo='pago' and new.compra_id is not null and new.pago_id is null then
    insert into public.pagos(
      compra_id,fecha,importe,metodo,referencia,cuenta,notas,created_by
    ) values (
      new.compra_id,new.fecha,new.total,'Banco',new.referencia,new.cuenta,
      coalesce(new.notas,'Importado y conciliado desde banco'),new.created_by
    ) returning id into v_pago_id;

    delete from public.movimientos_financieros
    where pago_id=v_pago_id and id<>new.id;

    update public.movimientos_financieros
    set pago_id=v_pago_id
    where id=new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_materializar_importacion_bancaria_conciliada_v2
on public.movimientos_financieros;

create trigger trg_materializar_importacion_bancaria_conciliada_v2
after insert on public.movimientos_financieros
for each row
execute function public.materializar_importacion_bancaria_conciliada_v2();

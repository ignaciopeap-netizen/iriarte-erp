-- Iriarte ERP V2
-- Evita nuevas compras sin proveedor sin alterar el único registro histórico incompleto.
-- También impide vaciar el proveedor de una compra ya válida.

create or replace function public.validar_proveedor_compra_v2()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.proveedor_id is null then
    raise exception 'Toda compra debe pertenecer a un proveedor';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validar_proveedor_compra_v2 on public.compras;
create trigger trg_validar_proveedor_compra_v2
before insert or update of proveedor_id on public.compras
for each row
execute function public.validar_proveedor_compra_v2();

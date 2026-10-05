-- Iriarte ERP V2
-- Impide crear nuevos presupuestos huérfanos sin alterar los históricos existentes.

create or replace function public.validar_nuevo_presupuesto_con_proyecto_v2()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_cliente uuid;
begin
  if new.proyecto_id is null then
    raise exception 'Todo presupuesto nuevo debe pertenecer a un proyecto';
  end if;

  select p.cliente_id
    into v_cliente
    from public.proyectos p
   where p.id = new.proyecto_id;

  if not found then
    raise exception 'Proyecto no encontrado';
  end if;

  if v_cliente is null then
    raise exception 'El proyecto del presupuesto debe tener un cliente asignado';
  end if;

  if new.cliente_id is distinct from v_cliente then
    raise exception 'El cliente del presupuesto debe coincidir con el cliente del proyecto';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_nuevo_presupuesto_requiere_proyecto_v2 on public.presupuestos;
create trigger trg_nuevo_presupuesto_requiere_proyecto_v2
before insert on public.presupuestos
for each row
execute function public.validar_nuevo_presupuesto_con_proyecto_v2();

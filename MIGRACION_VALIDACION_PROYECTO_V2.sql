-- Iriarte ERP V2
-- Todo proyecto operativo debe tener cliente y código.
-- El trigger no reescribe históricos: solo valida INSERT/UPDATE futuros.

create or replace function public.validar_proyecto_v2()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  if new.cliente_id is null then
    raise exception 'Todo proyecto debe estar vinculado a un cliente.';
  end if;

  if nullif(trim(coalesce(new.codigo,'')),'') is null then
    raise exception 'Todo proyecto debe tener un código.';
  end if;

  new.codigo := trim(new.codigo);
  return new;
end;
$function$;

drop trigger if exists trg_validar_proyecto_v2 on public.proyectos;
create trigger trg_validar_proyecto_v2
before insert or update on public.proyectos
for each row execute function public.validar_proyecto_v2();

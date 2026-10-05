-- Iriarte ERP V2 · clasificación analítica de movimientos bancarios importados
create or replace function public.clasificar_movimiento_bancario_v2(p_movimiento_id uuid,p_clasificacion text,p_proyecto_id text default null,p_subcategoria text default null)
returns jsonb
language plpgsql
security invoker
set search_path to 'public'
as $function$
declare
  m public.movimientos_financieros%rowtype;
  v_categoria text;
  v_proyecto text;
begin
  if auth.uid() is null then raise exception 'Autenticación requerida'; end if;
  select * into m from public.movimientos_financieros where id=p_movimiento_id for update;
  if not found then raise exception 'Movimiento no encontrado'; end if;
  if m.origen_importacion is null then raise exception 'Solo se clasifican aquí movimientos bancarios importados'; end if;
  if m.factura_id is not null or m.compra_id is not null or m.cobro_id is not null or m.pago_id is not null then raise exception 'Este movimiento ya tiene un documento financiero asociado. Usa la conciliación documental.'; end if;
  if p_clasificacion not in ('proyecto','general','coste_personal','no_estudio') then raise exception 'Clasificación no válida'; end if;
  if p_clasificacion='proyecto' then
    if nullif(p_proyecto_id,'') is null then raise exception 'Selecciona un proyecto'; end if;
    if not exists(select 1 from public.proyectos p where p.id=p_proyecto_id) then raise exception 'Proyecto no encontrado'; end if;
    v_proyecto:=p_proyecto_id;
    v_categoria:=case when lower(coalesce(m.tipo,'')) in ('pago','gasto') then 'gasto_directo' else 'movimiento_proyecto' end;
  elsif p_clasificacion='general' then
    v_proyecto:=null;v_categoria:='general_estudio';
  elsif p_clasificacion='coste_personal' then
    v_proyecto:=null;v_categoria:='coste_personal';
  else
    v_proyecto:=null;v_categoria:='no_estudio';
  end if;
  update public.movimientos_financieros
  set proyecto_id=v_proyecto,
      categoria=v_categoria,
      subcategoria=case when p_clasificacion='no_estudio' then 'N' when p_clasificacion='coste_personal' then coalesce(nullif(p_subcategoria,''),'pendiente_reparto') else nullif(p_subcategoria,'') end,
      conciliado=true
  where id=m.id;
  return jsonb_build_object('movimiento_id',m.id,'clasificacion',p_clasificacion,'categoria',v_categoria,'proyecto_id',v_proyecto,'conciliado',true);
end;
$function$;
revoke all on function public.clasificar_movimiento_bancario_v2(uuid,text,text,text) from public,anon;
grant execute on function public.clasificar_movimiento_bancario_v2(uuid,text,text,text) to authenticated;

create or replace view public.v_control_clasificacion_banco_v2 with (security_invoker=true) as
select
  (select count(*) from public.movimientos_financieros where categoria='no_estudio' and proyecto_id is not null)::integer as no_estudio_con_proyecto,
  (select count(*) from public.movimientos_financieros where categoria='gasto_directo' and proyecto_id is null)::integer as gastos_directos_sin_proyecto,
  (select count(*) from public.movimientos_financieros where origen_importacion is not null and categoria in ('no_estudio','general_estudio','coste_personal','gasto_directo','movimiento_proyecto') and conciliado=false)::integer as clasificados_pendientes;
grant select on public.v_control_clasificacion_banco_v2 to authenticated;
revoke all on public.v_control_clasificacion_banco_v2 from anon;

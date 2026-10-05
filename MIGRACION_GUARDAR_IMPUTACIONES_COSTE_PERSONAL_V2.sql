-- Iriarte ERP V2 · guardado atómico del reparto de costes de personal
create or replace function public.guardar_imputaciones_coste_personal_v2(p_coste_id uuid,p_imputaciones jsonb)
returns jsonb
language plpgsql
security invoker
set search_path to 'public'
as $function$
declare
  c public.costes_personal_mensuales%rowtype;
  x jsonb;
  v_clasificacion text;
  v_proyecto text;
  v_importe numeric;
  v_horas numeric;
  v_total numeric := 0;
  v_count integer := 0;
begin
  if auth.uid() is null then raise exception 'Autenticación requerida'; end if;
  select * into c from public.costes_personal_mensuales where id=p_coste_id for update;
  if not found then raise exception 'Coste mensual no encontrado'; end if;
  if c.estado='cerrado' then raise exception 'Reabre el coste mensual antes de modificar el reparto'; end if;
  if jsonb_typeof(coalesce(p_imputaciones,'[]'::jsonb))<>'array' then raise exception 'El reparto debe ser una lista'; end if;
  for x in select value from jsonb_array_elements(coalesce(p_imputaciones,'[]'::jsonb)) loop
    v_clasificacion:=coalesce(nullif(x->>'clasificacion',''),'proyecto');
    v_proyecto:=nullif(x->>'proyecto_id','');
    v_importe:=coalesce(nullif(x->>'importe','')::numeric,0);
    v_horas:=coalesce(nullif(x->>'horas_base','')::numeric,0);
    if v_clasificacion not in ('proyecto','general','no_estudio') then raise exception 'Clasificación de imputación no válida'; end if;
    if v_importe<0 or v_horas<0 then raise exception 'Importes y horas no pueden ser negativos'; end if;
    if v_clasificacion='proyecto' and v_proyecto is null then raise exception 'Toda imputación de proyecto necesita un proyecto'; end if;
    if v_clasificacion<>'proyecto' then v_proyecto:=null; end if;
    if v_proyecto is not null and not exists(select 1 from public.proyectos p where p.id=v_proyecto) then raise exception 'Proyecto de imputación no encontrado'; end if;
    v_total:=v_total+v_importe;v_count:=v_count+1;
  end loop;
  if v_count=0 then raise exception 'Añade al menos una imputación'; end if;
  if abs(v_total-c.importe)>0.01 then raise exception 'El reparto debe cuadrar con el coste origen. Asignado: %, origen: %',v_total,c.importe; end if;
  delete from public.costes_personal_imputaciones where coste_personal_id=c.id;
  for x in select value from jsonb_array_elements(p_imputaciones) loop
    v_clasificacion:=coalesce(nullif(x->>'clasificacion',''),'proyecto');
    v_proyecto:=case when v_clasificacion='proyecto' then nullif(x->>'proyecto_id','') else null end;
    v_importe:=coalesce(nullif(x->>'importe','')::numeric,0);
    v_horas:=coalesce(nullif(x->>'horas_base','')::numeric,0);
    insert into public.costes_personal_imputaciones(coste_personal_id,proyecto_id,clasificacion,horas_base,porcentaje,importe,metodo,ajuste_manual,notas)
    values(c.id,v_proyecto,v_clasificacion,v_horas,case when c.importe>0 then round(v_importe/c.importe*100,6) else 0 end,v_importe,'manual',true,nullif(x->>'notas',''));
  end loop;
  update public.costes_personal_mensuales set estado='revisado' where id=c.id;
  return jsonb_build_object('coste_id',c.id,'estado','revisado','importe',c.importe,'asignado',v_total,'imputaciones',v_count);
end;
$function$;
revoke all on function public.guardar_imputaciones_coste_personal_v2(uuid,jsonb) from public,anon;
grant execute on function public.guardar_imputaciones_coste_personal_v2(uuid,jsonb) to authenticated;

create or replace view public.v_control_integridad_costes_personal_v2 with (security_invoker=true) as
select
  (select count(*) from public.costes_personal_mensuales c where not exists(select 1 from public.costes_personal_imputaciones i where i.coste_personal_id=c.id))::integer as costes_sin_imputaciones,
  (select count(*) from public.costes_personal_mensuales c where abs(c.importe-coalesce((select sum(i.importe) from public.costes_personal_imputaciones i where i.coste_personal_id=c.id),0))>0.01)::integer as costes_descuadrados,
  (select count(*) from public.costes_personal_mensuales c where c.estado='cerrado' and abs(c.importe-coalesce((select sum(i.importe) from public.costes_personal_imputaciones i where i.coste_personal_id=c.id),0))>0.01)::integer as costes_cerrados_descuadrados,
  (select count(*) from public.costes_personal_imputaciones i where i.clasificacion='proyecto' and i.proyecto_id is null)::integer as imputaciones_proyecto_sin_proyecto,
  (select count(*) from public.costes_personal_imputaciones i where i.clasificacion='no_estudio' and i.proyecto_id is not null)::integer as no_estudio_con_proyecto;
grant select on public.v_control_integridad_costes_personal_v2 to authenticated;
revoke all on public.v_control_integridad_costes_personal_v2 from anon;

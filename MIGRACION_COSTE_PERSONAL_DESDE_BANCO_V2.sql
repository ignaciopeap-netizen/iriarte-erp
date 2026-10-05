-- Iriarte ERP V2 · crear y repartir un coste mensual directamente desde Banco
create unique index if not exists costes_personal_movimiento_unico_idx on public.costes_personal_mensuales(movimiento_financiero_id) where movimiento_financiero_id is not null;

create or replace function public.crear_coste_personal_desde_movimiento_v2(p_movimiento_id uuid,p_persona text,p_tipo text default 'autonomos')
returns jsonb
language plpgsql
security invoker
set search_path to 'public'
as $function$
declare
  m public.movimientos_financieros%rowtype;
  v_coste uuid;
  v_importe numeric;
  v_periodo date;
  v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Autenticación requerida'; end if;
  if nullif(trim(coalesce(p_persona,'')),'') is null then raise exception 'Indica la persona del coste'; end if;
  if p_tipo not in ('autonomos','seguridad_social','salario_fijo','seguro_personal','otro') then raise exception 'Tipo de coste de personal no válido'; end if;
  select * into m from public.movimientos_financieros where id=p_movimiento_id for update;
  if not found then raise exception 'Movimiento no encontrado'; end if;
  if m.origen_importacion is null then raise exception 'El movimiento debe proceder de una importación bancaria'; end if;
  if lower(coalesce(m.tipo,'')) not in ('pago','gasto') then raise exception 'Un coste de personal debe proceder de una salida bancaria'; end if;
  if m.factura_id is not null or m.compra_id is not null or m.cobro_id is not null or m.pago_id is not null then raise exception 'Este movimiento ya está vinculado a un documento financiero'; end if;
  if exists(select 1 from public.costes_personal_mensuales c where c.movimiento_financiero_id=m.id) then raise exception 'Este movimiento ya tiene un coste mensual de personal asociado'; end if;
  v_importe:=abs(coalesce(m.total,0));
  if v_importe<=0 then raise exception 'El movimiento no tiene un importe válido'; end if;
  v_periodo:=date_trunc('month',m.fecha)::date;
  insert into public.costes_personal_mensuales(periodo,persona,tipo,concepto,importe,movimiento_financiero_id,metodo_reparto,estado)
  values(v_periodo,trim(p_persona),p_tipo,coalesce(nullif(trim(m.concepto),''),'Coste mensual de personal'),v_importe,m.id,'horas_mes','borrador')
  returning id into v_coste;
  update public.movimientos_financieros set proyecto_id=null,categoria='coste_personal',subcategoria=p_tipo,conciliado=true where id=m.id;
  v_result:=public.recalcular_imputaciones_coste_personal_v2(v_coste);
  return jsonb_build_object('movimiento_id',m.id,'coste_id',v_coste,'periodo',v_periodo,'persona',trim(p_persona),'tipo',p_tipo,'importe',v_importe,'reparto',v_result);
end;
$function$;
revoke all on function public.crear_coste_personal_desde_movimiento_v2(uuid,text,text) from public,anon;
grant execute on function public.crear_coste_personal_desde_movimiento_v2(uuid,text,text) to authenticated;

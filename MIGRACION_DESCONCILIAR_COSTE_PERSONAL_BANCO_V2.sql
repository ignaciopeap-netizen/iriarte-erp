-- Iriarte ERP V2 · reversión segura de movimientos que originaron costes mensuales de personal
create or replace function public.desconciliar_movimiento_v2(p_movimiento_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path to 'public'
as $function$
declare
  m public.movimientos_financieros%rowtype;
  v_cobro_id uuid;
  v_pago_id uuid;
  v_coste_id uuid;
  v_coste_estado text;
begin
  if auth.uid() is null then raise exception 'Autenticación requerida'; end if;
  select * into m from public.movimientos_financieros where id=p_movimiento_id for update;
  if not found then raise exception 'Movimiento no encontrado'; end if;
  if m.origen_importacion is null then raise exception 'Solo se pueden desconciliar movimientos bancarios importados. Los cobros/pagos manuales se corrigen desde su documento de origen.'; end if;
  if not coalesce(m.conciliado,false) then return jsonb_build_object('movimiento_id',m.id,'conciliado',false,'already_unreconciled',true); end if;
  select c.id,c.estado into v_coste_id,v_coste_estado from public.costes_personal_mensuales c where c.movimiento_financiero_id=m.id limit 1 for update;
  if v_coste_id is not null and v_coste_estado='cerrado' then raise exception 'Este movimiento sostiene un coste mensual de personal cerrado. Reabre primero ese coste desde Horas antes de reabrir el movimiento bancario.'; end if;
  v_cobro_id:=m.cobro_id;v_pago_id:=m.pago_id;
  update public.movimientos_financieros
  set conciliado=false,factura_id=null,compra_id=null,cobro_id=null,pago_id=null,
      categoria=case when v_coste_id is not null then null else categoria end,
      subcategoria=case when v_coste_id is not null then null else subcategoria end,
      proyecto_id=case when v_coste_id is not null then null else proyecto_id end
  where id=m.id;
  if v_cobro_id is not null then delete from public.cobros where id=v_cobro_id; end if;
  if v_pago_id is not null then delete from public.pagos where id=v_pago_id; end if;
  if v_coste_id is not null then delete from public.costes_personal_mensuales where id=v_coste_id; end if;
  return jsonb_build_object('movimiento_id',m.id,'conciliado',false,'cobro_eliminado',v_cobro_id,'pago_eliminado',v_pago_id,'coste_personal_eliminado',v_coste_id,'already_unreconciled',false);
end;
$function$;
revoke all on function public.desconciliar_movimiento_v2(uuid) from public,anon;
grant execute on function public.desconciliar_movimiento_v2(uuid) to authenticated;

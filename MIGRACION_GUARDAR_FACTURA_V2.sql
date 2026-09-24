-- IRIARTE ERP V2 · guardado atómico del editor de facturas
-- Cabecera + líneas + totales se guardan en una sola transacción de PostgreSQL.

create or replace function public.guardar_factura_v2(
  p_factura_id uuid,
  p_cabecera jsonb,
  p_lineas jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_id uuid;
  v_line jsonb;
  v_order integer := 0;
  v_requested_state text := coalesce(nullif(p_cabecera->>'estado',''),'borrador');
  v_total numeric := 0;
  v_cobrado numeric := 0;
begin
  if p_factura_id is null then
    insert into public.facturas(
      numero,fecha,fecha_vencimiento,cliente_id,proyecto_id,concepto,estado,
      forma_pago,irpf_pct,observaciones,notas
    ) values (
      nullif(p_cabecera->>'numero',''),
      coalesce(nullif(p_cabecera->>'fecha','')::date,current_date),
      nullif(p_cabecera->>'fecha_vencimiento','')::date,
      nullif(p_cabecera->>'cliente_id','')::uuid,
      nullif(p_cabecera->>'proyecto_id',''),
      nullif(p_cabecera->>'concepto',''),
      v_requested_state,
      nullif(p_cabecera->>'forma_pago',''),
      coalesce(nullif(p_cabecera->>'irpf_pct','')::numeric,0),
      nullif(p_cabecera->>'observaciones',''),
      nullif(p_cabecera->>'observaciones','')
    ) returning id into v_id;
  else
    v_id := p_factura_id;
    if not exists(select 1 from public.facturas where id=v_id for update) then
      raise exception 'Factura no encontrada';
    end if;

    update public.facturas
    set numero=nullif(p_cabecera->>'numero',''),
        fecha=coalesce(nullif(p_cabecera->>'fecha','')::date,current_date),
        fecha_vencimiento=nullif(p_cabecera->>'fecha_vencimiento','')::date,
        cliente_id=nullif(p_cabecera->>'cliente_id','')::uuid,
        proyecto_id=nullif(p_cabecera->>'proyecto_id',''),
        concepto=nullif(p_cabecera->>'concepto',''),
        estado=v_requested_state,
        forma_pago=nullif(p_cabecera->>'forma_pago',''),
        irpf_pct=coalesce(nullif(p_cabecera->>'irpf_pct','')::numeric,0),
        observaciones=nullif(p_cabecera->>'observaciones',''),
        notas=nullif(p_cabecera->>'observaciones',''),
        updated_at=now()
    where id=v_id;

    delete from public.factura_lineas where factura_id=v_id;
  end if;

  for v_line in select value from jsonb_array_elements(coalesce(p_lineas,'[]'::jsonb)) loop
    v_order := v_order + 1;
    insert into public.factura_lineas(
      factura_id,orden,codigo,seccion,descripcion,ubicacion,unidad,
      cantidad,precio_unitario,descuento_pct,iva_pct
    ) values (
      v_id,v_order,
      nullif(v_line->>'codigo',''),
      nullif(v_line->>'seccion',''),
      coalesce(v_line->>'descripcion',''),
      nullif(v_line->>'ubicacion',''),
      coalesce(nullif(v_line->>'unidad',''),'ud'),
      coalesce(nullif(v_line->>'cantidad','')::numeric,0),
      coalesce(nullif(v_line->>'precio_unitario','')::numeric,0),
      coalesce(nullif(v_line->>'descuento_pct','')::numeric,0),
      coalesce(nullif(v_line->>'iva_pct','')::numeric,21)
    );
  end loop;

  perform public.recalc_factura_totals(v_id);

  select total into v_total from public.facturas where id=v_id;
  select coalesce(sum(importe),0) into v_cobrado from public.cobros where factura_id=v_id;

  if v_requested_state <> 'anulada' and v_cobrado > 0 then
    update public.facturas
    set estado=case
      when v_total>0 and v_cobrado>=v_total then 'cobrada'
      else 'parcialmente_cobrada'
    end,
    updated_at=now()
    where id=v_id;
  end if;

  return jsonb_build_object('factura_id',v_id,'total',v_total,'cobrado',v_cobrado);
end;
$$;

grant execute on function public.guardar_factura_v2(uuid,jsonb,jsonb) to authenticated;

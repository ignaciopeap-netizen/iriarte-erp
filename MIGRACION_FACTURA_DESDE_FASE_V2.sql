-- IRIARTE ERP V2 · creación atómica de factura desde una fase de facturación

create or replace function public.crear_factura_desde_fase_v2(p_fase_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  f public.presupuesto_fases_facturacion%rowtype;
  p public.presupuestos%rowtype;
  v_project_id text;
  v_invoice_id uuid;
  v_amount numeric := 0;
  v_iva_pct numeric := 21;
  v_irpf_pct numeric := 0;
begin
  select * into f
  from public.presupuesto_fases_facturacion
  where id=p_fase_id
  for update;
  if not found then raise exception 'Fase de facturación no encontrada'; end if;

  if f.factura_id is not null then
    return jsonb_build_object('invoice_id',f.factura_id,'phase_id',f.id,'already_existed',true);
  end if;

  select * into p
  from public.presupuestos
  where id=f.presupuesto_id
  for update;
  if not found then raise exception 'Presupuesto de la fase no encontrado'; end if;

  v_project_id := p.proyecto_id;
  if v_project_id is null or not exists(select 1 from public.proyectos where id=v_project_id) then
    insert into public.proyectos(
      nombre,cliente_id,codigo,direccion,estado,fecha_inicio,expediente,importe_contratado,descripcion
    ) values (
      coalesce(nullif(p.name,''),nullif(p.nombre,''),'Proyecto'),p.cliente_id,
      coalesce(nullif(p.ref,''),nullif(p.numero,'')),nullif(p.address,''),'activo',
      coalesce(p.fecha,current_date),p.expte,coalesce(p.base,0),
      'Creado desde presupuesto '||coalesce(nullif(p.ref,''),p.id::text)
    ) returning id into v_project_id;

    update public.presupuestos
    set proyecto_id=v_project_id,estado='aceptado',status='proyecto',phase='Aceptado'
    where id=p.id;
  end if;

  v_amount := coalesce(f.importe,0);
  if v_amount <= 0 and coalesce(f.porcentaje,0) > 0 then
    v_amount := coalesce(p.base,0) * f.porcentaje / 100;
  end if;
  if v_amount <= 0 then raise exception 'La fase necesita un importe o porcentaje válido'; end if;

  v_iva_pct := coalesce(p.iva_pct,21);
  v_irpf_pct := case when coalesce(p.irpf_enabled,false) then coalesce(p.irpf_pct,0) else 0 end;

  insert into public.facturas(
    numero,fecha,cliente_id,proyecto_id,presupuesto_id,presupuesto_fase_id,
    concepto,estado,irpf_pct,notas
  ) values (
    null,current_date,p.cliente_id,v_project_id,p.id,f.id,
    coalesce(nullif(f.nombre,''),'Fase de facturación'),'borrador',v_irpf_pct,
    'Factura creada desde fase de facturación del presupuesto. Editable independientemente del presupuesto.'
  ) returning id into v_invoice_id;

  insert into public.factura_lineas(
    factura_id,orden,codigo,seccion,descripcion,ubicacion,unidad,cantidad,
    precio_unitario,descuento_pct,iva_pct
  ) values (
    v_invoice_id,1,null,'Fase de facturación',coalesce(nullif(f.nombre,''),'Fase'),
    null,'ud',1,v_amount,0,v_iva_pct
  );

  perform public.recalc_factura_totals(v_invoice_id);

  update public.presupuesto_fases_facturacion
  set factura_id=v_invoice_id,estado='facturada'
  where id=f.id;

  return jsonb_build_object(
    'invoice_id',v_invoice_id,
    'phase_id',f.id,
    'project_id',v_project_id,
    'presupuesto_id',p.id,
    'already_existed',false
  );
end;
$$;

grant execute on function public.crear_factura_desde_fase_v2(uuid) to authenticated;

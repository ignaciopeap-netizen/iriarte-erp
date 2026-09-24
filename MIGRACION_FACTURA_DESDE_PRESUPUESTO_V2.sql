-- IRIARTE ERP V2 · creación atómica de factura desde presupuesto
-- Aplicada al proyecto Supabase kzmjeccivhkhtuokfkta el 24-09-2026.

create or replace function public.crear_factura_desde_presupuesto_v2(p_presupuesto_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  p public.presupuestos%rowtype;
  v_project_id text;
  v_invoice_id uuid;
  v_line jsonb;
  v_order integer := 0;
  v_irpf numeric := 0;
begin
  select * into p from public.presupuestos where id=p_presupuesto_id for update;
  if not found then raise exception 'Presupuesto no encontrado'; end if;

  v_project_id := p.proyecto_id;
  v_irpf := case when coalesce(p.irpf_enabled,false) then coalesce(p.irpf_pct,0) else 0 end;

  if v_project_id is null or not exists(select 1 from public.proyectos where id=v_project_id) then
    insert into public.proyectos(
      nombre,cliente_id,codigo,direccion,estado,fecha_inicio,expediente,importe_contratado,descripcion
    ) values (
      coalesce(nullif(p.name,''),nullif(p.nombre,''),'Proyecto'),p.cliente_id,
      coalesce(nullif(p.ref,''),nullif(p.numero,'')),nullif(p.address,''),'activo',
      coalesce(p.fecha,current_date),p.expte,coalesce(p.base,0),
      'Creado desde presupuesto '||coalesce(nullif(p.ref,''),p.id::text)
    ) returning id into v_project_id;
  else
    update public.proyectos
    set nombre=coalesce(nullif(p.name,''),nullif(p.nombre,''),nombre),
        cliente_id=coalesce(p.cliente_id,cliente_id),
        codigo=coalesce(nullif(p.ref,''),nullif(p.numero,''),codigo),
        direccion=coalesce(nullif(p.address,''),direccion),
        expediente=coalesce(nullif(p.expte,''),expediente),
        importe_contratado=coalesce(p.base,importe_contratado),
        updated_at=now()
    where id=v_project_id;
  end if;

  update public.presupuestos
  set proyecto_id=v_project_id,estado='aceptado',status='proyecto',phase='Aceptado'
  where id=p.id;

  insert into public.facturas(
    numero,fecha,cliente_id,proyecto_id,presupuesto_id,concepto,estado,irpf_pct,notas
  ) values (
    null,current_date,p.cliente_id,v_project_id,p.id,
    coalesce(nullif(p.name,''),nullif(p.nombre,''),'Presupuesto'),
    'borrador',v_irpf,
    'Factura creada desde presupuesto. Editable independientemente del presupuesto.'
  ) returning id into v_invoice_id;

  if coalesce(p.kind,'obra')='honorarios' then
    for v_line in select value from jsonb_array_elements(coalesce(p.fee_lines,'[]'::jsonb)) loop
      v_order := v_order + 1;
      insert into public.factura_lineas(
        factura_id,orden,codigo,seccion,descripcion,ubicacion,unidad,cantidad,precio_unitario,descuento_pct,iva_pct
      ) values (
        v_invoice_id,v_order,null,'Honorarios',coalesce(v_line->>'description',v_line->>'concepto',''),
        null,'ud',1,
        coalesce(nullif(v_line->>'amount','')::numeric,nullif(v_line->>'importe','')::numeric,0),0,
        coalesce(nullif(v_line->>'vat','')::numeric,nullif(v_line->>'ivaPct','')::numeric,21)
      );
    end loop;
  else
    for v_line in select value from jsonb_array_elements(coalesce(p.items,'[]'::jsonb)) loop
      v_order := v_order + 1;
      insert into public.factura_lineas(
        factura_id,orden,codigo,seccion,descripcion,ubicacion,unidad,cantidad,precio_unitario,descuento_pct,iva_pct
      ) values (
        v_invoice_id,v_order,
        coalesce(v_line->>'code',v_line->>'codigo'),
        coalesce(v_line->>'section',v_line->>'seccion'),
        coalesce(v_line->>'description',v_line->>'desc',v_line->>'descripcion',''),
        coalesce(v_line->>'location',v_line->>'ubicacion'),
        coalesce(v_line->>'unit',v_line->>'unidad','ud'),
        coalesce(nullif(v_line->>'qty','')::numeric,nullif(v_line->>'cantidad','')::numeric,0),
        coalesce(nullif(v_line->>'price','')::numeric,nullif(v_line->>'precio','')::numeric,0),0,
        coalesce(nullif(v_line->>'vat','')::numeric,nullif(v_line->>'ivaPct','')::numeric,21)
      );
    end loop;
  end if;

  perform public.recalc_factura_totals(v_invoice_id);
  return jsonb_build_object('invoice_id',v_invoice_id,'project_id',v_project_id,'presupuesto_id',p.id);
end;
$$;

grant execute on function public.crear_factura_desde_presupuesto_v2(uuid) to authenticated;

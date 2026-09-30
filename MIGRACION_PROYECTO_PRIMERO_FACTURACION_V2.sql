-- Iriarte ERP V2
-- Proyecto -> Presupuesto -> Factura
-- La creación de facturas copia el presupuesto, pero no crea/actualiza proyectos
-- ni cambia el estado del presupuesto de forma implícita.

create or replace function public.crear_factura_desde_presupuesto_v2(p_presupuesto_id uuid)
returns jsonb
language plpgsql
set search_path to 'public'
as $function$
declare
  p public.presupuestos%rowtype;
  pr public.proyectos%rowtype;
  v_invoice_id uuid;
  v_line jsonb;
  v_order integer := 0;
  v_irpf numeric := 0;
begin
  if auth.uid() is null then
    raise exception 'Autenticación requerida';
  end if;

  select * into p
  from public.presupuestos
  where id = p_presupuesto_id
  for update;

  if not found then
    raise exception 'Presupuesto no encontrado';
  end if;

  if exists (
    select 1
    from public.facturas f
    where f.presupuesto_id = p.id
      and f.presupuesto_fase_id is not null
      and lower(coalesce(f.estado,'')) <> 'anulada'
  ) then
    raise exception 'Este presupuesto ya tiene facturación por fases. No se puede crear una factura completa.';
  end if;

  select f.id into v_invoice_id
  from public.facturas f
  where f.presupuesto_id = p.id
    and f.presupuesto_fase_id is null
    and lower(coalesce(f.estado,'')) <> 'anulada'
  order by f.created_at desc nulls last, f.fecha desc
  limit 1;

  if v_invoice_id is not null then
    return jsonb_build_object(
      'invoice_id', v_invoice_id,
      'project_id', p.proyecto_id,
      'presupuesto_id', p.id,
      'already_existed', true
    );
  end if;

  if p.proyecto_id is null then
    raise exception 'Antes de facturar, vincula el presupuesto a un proyecto.';
  end if;

  select * into pr
  from public.proyectos
  where id = p.proyecto_id;

  if not found then
    raise exception 'El proyecto vinculado al presupuesto no existe.';
  end if;

  if p.cliente_id is null then
    raise exception 'Antes de facturar, el presupuesto necesita un cliente.';
  end if;

  if pr.cliente_id is distinct from p.cliente_id then
    raise exception 'El cliente del presupuesto no coincide con el cliente del proyecto.';
  end if;

  v_irpf := case
    when coalesce(p.irpf_enabled,false) then coalesce(p.irpf_pct,0)
    else 0
  end;

  insert into public.facturas(
    numero, fecha, cliente_id, proyecto_id, presupuesto_id,
    concepto, estado, irpf_pct, notas
  ) values (
    null, current_date, p.cliente_id, p.proyecto_id, p.id,
    coalesce(nullif(p.name,''),nullif(p.nombre,''),'Presupuesto'),
    'borrador', v_irpf,
    'Factura creada desde presupuesto. Editable independientemente del presupuesto.'
  ) returning id into v_invoice_id;

  if coalesce(p.kind,'obra') = 'honorarios' then
    for v_line in
      select value from jsonb_array_elements(coalesce(p.fee_lines,'[]'::jsonb))
    loop
      v_order := v_order + 1;
      insert into public.factura_lineas(
        factura_id, orden, codigo, seccion, descripcion, ubicacion,
        unidad, cantidad, precio_unitario, descuento_pct, iva_pct
      ) values (
        v_invoice_id, v_order, null, 'Honorarios',
        coalesce(v_line->>'description',v_line->>'concepto',''),
        null, 'ud', 1,
        coalesce(nullif(v_line->>'amount','')::numeric,nullif(v_line->>'importe','')::numeric,0),
        0,
        coalesce(nullif(v_line->>'vat','')::numeric,nullif(v_line->>'ivaPct','')::numeric,21)
      );
    end loop;
  else
    for v_line in
      select value from jsonb_array_elements(coalesce(p.items,'[]'::jsonb))
    loop
      v_order := v_order + 1;
      insert into public.factura_lineas(
        factura_id, orden, codigo, seccion, descripcion, ubicacion,
        unidad, cantidad, precio_unitario, descuento_pct, iva_pct
      ) values (
        v_invoice_id, v_order,
        coalesce(v_line->>'code',v_line->>'codigo'),
        coalesce(v_line->>'section',v_line->>'seccion'),
        coalesce(v_line->>'description',v_line->>'desc',v_line->>'descripcion',''),
        coalesce(v_line->>'location',v_line->>'ubicacion'),
        coalesce(v_line->>'unit',v_line->>'unidad','ud'),
        coalesce(nullif(v_line->>'qty','')::numeric,nullif(v_line->>'cantidad','')::numeric,0),
        coalesce(nullif(v_line->>'price','')::numeric,nullif(v_line->>'precio','')::numeric,0),
        0,
        coalesce(nullif(v_line->>'vat','')::numeric,nullif(v_line->>'ivaPct','')::numeric,21)
      );
    end loop;
  end if;

  perform public.recalc_factura_totals(v_invoice_id);

  return jsonb_build_object(
    'invoice_id', v_invoice_id,
    'project_id', p.proyecto_id,
    'presupuesto_id', p.id,
    'already_existed', false
  );
end;
$function$;

create or replace function public.crear_factura_desde_fase_v2(p_fase_id uuid)
returns jsonb
language plpgsql
set search_path to 'public'
as $function$
declare
  f public.presupuesto_fases_facturacion%rowtype;
  p public.presupuestos%rowtype;
  pr public.proyectos%rowtype;
  v_invoice_id uuid;
  v_amount numeric := 0;
  v_iva_pct numeric := 21;
  v_irpf_pct numeric := 0;
begin
  if auth.uid() is null then
    raise exception 'Autenticación requerida';
  end if;

  select * into f
  from public.presupuesto_fases_facturacion
  where id = p_fase_id
  for update;

  if not found then
    raise exception 'Fase de facturación no encontrada';
  end if;

  if f.factura_id is not null then
    return jsonb_build_object(
      'invoice_id', f.factura_id,
      'phase_id', f.id,
      'already_existed', true
    );
  end if;

  select * into p
  from public.presupuestos
  where id = f.presupuesto_id
  for update;

  if not found then
    raise exception 'Presupuesto de la fase no encontrado';
  end if;

  if exists (
    select 1
    from public.facturas inv
    where inv.presupuesto_id = p.id
      and inv.presupuesto_fase_id is null
      and lower(coalesce(inv.estado,'')) <> 'anulada'
  ) then
    raise exception 'Este presupuesto ya tiene una factura completa activa. No se puede facturar una fase.';
  end if;

  if p.proyecto_id is null then
    raise exception 'Antes de facturar una fase, vincula el presupuesto a un proyecto.';
  end if;

  select * into pr
  from public.proyectos
  where id = p.proyecto_id;

  if not found then
    raise exception 'El proyecto vinculado al presupuesto no existe.';
  end if;

  if p.cliente_id is null then
    raise exception 'Antes de facturar una fase, el presupuesto necesita un cliente.';
  end if;

  if pr.cliente_id is distinct from p.cliente_id then
    raise exception 'El cliente del presupuesto no coincide con el cliente del proyecto.';
  end if;

  v_amount := coalesce(f.importe,0);
  if v_amount <= 0 and coalesce(f.porcentaje,0) > 0 then
    v_amount := coalesce(p.base,0) * f.porcentaje / 100;
  end if;
  if v_amount <= 0 then
    raise exception 'La fase necesita un importe o porcentaje válido';
  end if;

  v_iva_pct := coalesce(p.iva_pct,21);
  v_irpf_pct := case
    when coalesce(p.irpf_enabled,false) then coalesce(p.irpf_pct,0)
    else 0
  end;

  insert into public.facturas(
    numero, fecha, cliente_id, proyecto_id, presupuesto_id,
    presupuesto_fase_id, concepto, estado, irpf_pct, notas
  ) values (
    null, current_date, p.cliente_id, p.proyecto_id, p.id,
    f.id, coalesce(nullif(f.nombre,''),'Fase de facturación'),
    'borrador', v_irpf_pct,
    'Factura creada desde fase de facturación del presupuesto. Editable independientemente del presupuesto.'
  ) returning id into v_invoice_id;

  insert into public.factura_lineas(
    factura_id, orden, codigo, seccion, descripcion, ubicacion,
    unidad, cantidad, precio_unitario, descuento_pct, iva_pct
  ) values (
    v_invoice_id, 1, null, 'Fase de facturación',
    coalesce(nullif(f.nombre,''),'Fase'), null, 'ud', 1,
    v_amount, 0, v_iva_pct
  );

  perform public.recalc_factura_totals(v_invoice_id);

  update public.presupuesto_fases_facturacion
  set factura_id = v_invoice_id,
      estado = 'facturada'
  where id = f.id;

  return jsonb_build_object(
    'invoice_id', v_invoice_id,
    'phase_id', f.id,
    'project_id', p.proyecto_id,
    'presupuesto_id', p.id,
    'already_existed', false
  );
end;
$function$;

-- ============================================================
-- IRIARTE ERP V2 · ESQUEMA CANÓNICO
-- Verificado contra el proyecto Supabase Presupuestos.
-- Repetible: usa IF NOT EXISTS siempre que es posible.
-- ============================================================

create extension if not exists pgcrypto;

-- 1. Proyecto operativo separado del presupuesto legacy.
create table if not exists public.proyectos (
  id text primary key default (gen_random_uuid()::text),
  nombre text not null,
  cliente_id uuid references public.clientes(id) on delete set null,
  codigo text,
  direccion text,
  estado text not null default 'activo',
  fecha_inicio date,
  fecha_fin date,
  expediente text,
  importe_contratado numeric(14,2) not null default 0,
  descripcion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

alter table public.proyectos enable row level security;
drop policy if exists authenticated_proyectos_all on public.proyectos;
create policy authenticated_proyectos_all on public.proyectos
for all to authenticated using (true) with check (true);

create index if not exists proyectos_cliente_idx on public.proyectos(cliente_id);
create index if not exists proyectos_estado_idx on public.proyectos(estado);
create index if not exists proyectos_updated_idx on public.proyectos(updated_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at=now();
  return new;
end $$;

drop trigger if exists set_proyectos_updated_at on public.proyectos;
create trigger set_proyectos_updated_at
before update on public.proyectos
for each row execute function public.set_updated_at();

-- 2. Facturas editables por líneas.
alter table public.facturas add column if not exists presupuesto_id uuid;
alter table public.facturas add column if not exists forma_pago text;
alter table public.facturas add column if not exists observaciones text;
alter table public.facturas add column if not exists descuento_pct numeric(7,2) default 0;
alter table public.facturas alter column numero drop not null;

create table if not exists public.factura_lineas (
  id uuid primary key default gen_random_uuid(),
  factura_id uuid not null references public.facturas(id) on delete cascade,
  orden integer not null default 0,
  codigo text,
  seccion text,
  descripcion text not null default '',
  ubicacion text,
  unidad text,
  cantidad numeric(14,3) not null default 1,
  precio_unitario numeric(14,4) not null default 0,
  descuento_pct numeric(7,2) not null default 0,
  iva_pct numeric(7,2) not null default 21,
  created_at timestamptz not null default now()
);

alter table public.factura_lineas enable row level security;
drop policy if exists auth_all_factura_lineas on public.factura_lineas;
create policy auth_all_factura_lineas on public.factura_lineas
for all to authenticated using (true) with check (true);
create index if not exists factura_lineas_factura_idx on public.factura_lineas(factura_id,orden);

create or replace function public.recalc_factura_totals(p_factura_id uuid)
returns void language plpgsql as $$
declare
  v_base numeric := 0;
  v_iva numeric := 0;
  v_irpf_pct numeric := 0;
begin
  select
    coalesce(sum(cantidad*precio_unitario*(1-descuento_pct/100)),0),
    coalesce(sum(cantidad*precio_unitario*(1-descuento_pct/100)*iva_pct/100),0)
  into v_base,v_iva
  from public.factura_lineas
  where factura_id=p_factura_id;

  select coalesce(irpf_pct,0)
  into v_irpf_pct
  from public.facturas
  where id=p_factura_id;

  update public.facturas
  set base=v_base,
      iva_importe=v_iva,
      irpf_importe=v_base*v_irpf_pct/100,
      total=v_base+v_iva-(v_base*v_irpf_pct/100),
      updated_at=now()
  where id=p_factura_id;
end $$;

create or replace function public.factura_lineas_recalc_trigger()
returns trigger language plpgsql as $$
begin
  if tg_op='DELETE' then
    perform public.recalc_factura_totals(old.factura_id);
    return old;
  elsif tg_op='UPDATE' then
    if old.factura_id is distinct from new.factura_id then
      perform public.recalc_factura_totals(old.factura_id);
    end if;
    perform public.recalc_factura_totals(new.factura_id);
    return new;
  else
    perform public.recalc_factura_totals(new.factura_id);
    return new;
  end if;
end $$;

drop trigger if exists factura_lineas_recalc_trg on public.factura_lineas;
create trigger factura_lineas_recalc_trg
after insert or update or delete on public.factura_lineas
for each row execute function public.factura_lineas_recalc_trigger();

-- 3. Conciliación bancaria detallada.
alter table public.movimientos_financieros add column if not exists fecha_valor date;
alter table public.movimientos_financieros add column if not exists categoria text;
alter table public.movimientos_financieros add column if not exists subcategoria text;
alter table public.movimientos_financieros add column if not exists origen_importacion text;

-- 4. Gastos generales: imputación opcional a proyecto.
alter table public.gastos_generales add column if not exists criterio_reparto text default 'sin_repartir';
alter table public.gastos_generales add column if not exists proyecto_id text;

-- 5. Sincronización de los campos legacy/normalizados de Presupuestos.
create or replace function public.sync_presupuesto_fields()
returns trigger language plpgsql as $$
declare
  calc_base numeric := 0;
  calc_iva numeric := 0;
  calc_irpf numeric := 0;
  mapped_estado text;
begin
  if nullif(new.name,'') is not null then new.nombre := new.name; end if;
  if new.nombre is null or new.nombre='' then new.nombre := 'Presupuesto'; end if;
  if new.numero is null and nullif(new.ref,'') is not null then new.numero := new.ref; end if;
  if new.date ~ '^\d{4}-\d{2}-\d{2}$' then new.fecha := new.date::date; end if;
  if new.fecha is null then new.fecha := current_date; end if;

  mapped_estado := case lower(coalesce(nullif(new.status,''),nullif(new.phase,''),new.estado,''))
    when 'enviado' then 'enviado'
    when 'aceptado' then 'aceptado'
    when 'proyecto' then 'aceptado'
    when 'facturado' then 'aceptado'
    when 'rechazado' then 'rechazado'
    when 'anulado' then 'anulado'
    else 'borrador'
  end;
  new.estado := mapped_estado;

  if coalesce(new.kind,'obra')='honorarios' then
    select
      coalesce(sum(coalesce(nullif(x->>'amount','')::numeric,nullif(x->>'importe','')::numeric,0)),0),
      coalesce(sum(coalesce(nullif(x->>'amount','')::numeric,nullif(x->>'importe','')::numeric,0)
        * coalesce(nullif(x->>'vat','')::numeric,nullif(x->>'ivaPct','')::numeric,21)/100),0)
    into calc_base,calc_iva
    from jsonb_array_elements(coalesce(new.fee_lines,'[]'::jsonb)) x;
  else
    select
      coalesce(sum(coalesce(nullif(x->>'qty','')::numeric,nullif(x->>'cantidad','')::numeric,0)
        * coalesce(nullif(x->>'price','')::numeric,nullif(x->>'precio','')::numeric,0)),0),
      coalesce(sum(coalesce(nullif(x->>'qty','')::numeric,nullif(x->>'cantidad','')::numeric,0)
        * coalesce(nullif(x->>'price','')::numeric,nullif(x->>'precio','')::numeric,0)
        * coalesce(nullif(x->>'vat','')::numeric,nullif(x->>'ivaPct','')::numeric,21)/100),0)
    into calc_base,calc_iva
    from jsonb_array_elements(coalesce(new.items,'[]'::jsonb)) x;
  end if;

  calc_irpf := case when coalesce(new.irpf_enabled,false)
    then calc_base*coalesce(new.irpf_pct,0)/100 else 0 end;
  new.base := calc_base;
  new.iva_pct := 21;
  new.irpf_pct := case when coalesce(new.irpf_enabled,false) then coalesce(new.irpf_pct,0) else 0 end;
  new.total := calc_base+calc_iva-calc_irpf;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists sync_presupuesto_fields_trg on public.presupuestos;
create trigger sync_presupuesto_fields_trg
before insert or update on public.presupuestos
for each row execute function public.sync_presupuesto_fields();

-- 6. Relaciones de todas las operaciones con la entidad proyecto V2.
alter table public.presupuestos drop constraint if exists presupuestos_proyecto_id_fkey;
alter table public.presupuestos add constraint presupuestos_proyecto_id_fkey foreign key (proyecto_id) references public.proyectos(id) on delete set null;

alter table public.facturas drop constraint if exists facturas_proyecto_id_fkey;
alter table public.facturas add constraint facturas_proyecto_id_fkey foreign key (proyecto_id) references public.proyectos(id) on delete set null;

alter table public.compras drop constraint if exists compras_proyecto_id_fkey;
alter table public.compras add constraint compras_proyecto_id_fkey foreign key (proyecto_id) references public.proyectos(id) on delete set null;

alter table public.documentos drop constraint if exists documentos_proyecto_id_fkey;
alter table public.documentos add constraint documentos_proyecto_id_fkey foreign key (proyecto_id) references public.proyectos(id) on delete cascade;

alter table public.horas_proyecto drop constraint if exists horas_proyecto_proyecto_id_fkey;
alter table public.horas_proyecto add constraint horas_proyecto_proyecto_id_fkey foreign key (proyecto_id) references public.proyectos(id) on delete cascade;

alter table public.movimientos_financieros drop constraint if exists movimientos_financieros_proyecto_id_fkey;
alter table public.movimientos_financieros add constraint movimientos_financieros_proyecto_id_fkey foreign key (proyecto_id) references public.proyectos(id) on delete set null;

alter table public.obra_visitas drop constraint if exists obra_visitas_project_id_fkey;
alter table public.obra_visitas add constraint obra_visitas_project_id_fkey foreign key (project_id) references public.proyectos(id) on delete cascade;

alter table public.obra_tareas drop constraint if exists obra_tareas_project_id_fkey;
alter table public.obra_tareas add constraint obra_tareas_project_id_fkey foreign key (project_id) references public.proyectos(id) on delete cascade;

alter table public.obra_incidencias drop constraint if exists obra_incidencias_project_id_fkey;
alter table public.obra_incidencias add constraint obra_incidencias_project_id_fkey foreign key (project_id) references public.proyectos(id) on delete cascade;

alter table public.gastos_generales drop constraint if exists gastos_generales_proyecto_id_fkey;
alter table public.gastos_generales add constraint gastos_generales_proyecto_id_fkey foreign key (proyecto_id) references public.proyectos(id) on delete set null;

-- 7. Vista de rentabilidad por proyecto.
create or replace view public.v_proyectos_resumen as
select
  p.id as proyecto_id,
  p.nombre as proyecto,
  c.nombre as cliente,
  p.cliente_id,
  coalesce((select sum(f.base) from public.facturas f where f.proyecto_id=p.id and f.estado<>'anulada'),0) as ingresos_facturados,
  coalesce((select sum(cb.importe) from public.cobros cb join public.facturas f on f.id=cb.factura_id where f.proyecto_id=p.id and f.estado<>'anulada'),0) as cobrado,
  coalesce((select sum(co.base) from public.compras co where co.proyecto_id=p.id and co.estado<>'anulada'),0) as costes_compras,
  coalesce((select sum(pa.importe) from public.pagos pa join public.compras co on co.id=pa.compra_id where co.proyecto_id=p.id and co.estado<>'anulada'),0) as pagado,
  coalesce((select sum(h.horas) from public.horas_proyecto h where h.proyecto_id=p.id),0) as horas,
  coalesce((select sum(h.horas*h.coste_hora) from public.horas_proyecto h where h.proyecto_id=p.id),0) as coste_horas,
  coalesce((select sum(f.base) from public.facturas f where f.proyecto_id=p.id and f.estado<>'anulada'),0)
  - coalesce((select sum(co.base) from public.compras co where co.proyecto_id=p.id and co.estado<>'anulada'),0)
  - coalesce((select sum(h.horas*h.coste_hora) from public.horas_proyecto h where h.proyecto_id=p.id),0) as margen_directo
from public.proyectos p
left join public.clientes c on c.id=p.cliente_id;

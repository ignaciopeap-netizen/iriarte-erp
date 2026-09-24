-- IRIARTE ERP V2 · MIGRACIÓN NO DESTRUCTIVA
-- Añade estructura para facturas por líneas y conciliación bancaria.
-- No borra ni modifica los datos existentes.

create extension if not exists pgcrypto;

-- Facturas: vínculo con presupuesto y metadatos editables.
do $$
begin
  if to_regclass('public.facturas') is not null then
    alter table public.facturas add column if not exists presupuesto_id uuid;
    alter table public.facturas add column if not exists forma_pago text;
    alter table public.facturas add column if not exists observaciones text;
    alter table public.facturas add column if not exists descuento_pct numeric(7,2) default 0;
  end if;
end $$;

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
drop policy if exists "auth_all_factura_lineas" on public.factura_lineas;
create policy "auth_all_factura_lineas" on public.factura_lineas
for all to authenticated using (true) with check (true);

create index if not exists factura_lineas_factura_idx on public.factura_lineas(factura_id, orden);

-- Finanzas: importación y conciliación bancaria más detallada.
do $$
begin
  if to_regclass('public.movimientos_financieros') is not null then
    alter table public.movimientos_financieros add column if not exists fecha_valor date;
    alter table public.movimientos_financieros add column if not exists categoria text;
    alter table public.movimientos_financieros add column if not exists subcategoria text;
    alter table public.movimientos_financieros add column if not exists cliente_id uuid;
    alter table public.movimientos_financieros add column if not exists proveedor_id uuid;
    alter table public.movimientos_financieros add column if not exists factura_id uuid;
    alter table public.movimientos_financieros add column if not exists compra_id uuid;
    alter table public.movimientos_financieros add column if not exists conciliado boolean not null default false;
    alter table public.movimientos_financieros add column if not exists notas text;
    alter table public.movimientos_financieros add column if not exists origen_importacion text;
  end if;
end $$;

-- Gastos generales: preparado para imputación opcional sin contaminar margen directo.
do $$
begin
  if to_regclass('public.gastos_generales') is not null then
    alter table public.gastos_generales add column if not exists criterio_reparto text default 'sin_repartir';
    alter table public.gastos_generales add column if not exists proyecto_id uuid;
  end if;
end $$;

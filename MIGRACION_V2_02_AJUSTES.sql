-- ============================================================
-- IRIARTE ERP V2 · AJUSTES 02
-- Aplicado en Supabase Presupuestos el 24/09/2026.
-- No destructivo respecto a los datos.
-- ============================================================

-- Las facturas en borrador pueden existir sin número hasta su emisión.
alter table public.facturas alter column numero drop not null;

-- Incluye el estado vencida usado por la interfaz.
alter table public.facturas drop constraint if exists facturas_estado_check;
alter table public.facturas add constraint facturas_estado_check
check (estado = any (array[
  'borrador'::text,
  'emitida'::text,
  'parcialmente_cobrada'::text,
  'cobrada'::text,
  'vencida'::text,
  'anulada'::text
]));

-- La entidad operativa canónica es public.proyectos.
-- Esta vista mantiene una interfaz estable de lectura para el frontend V2.
create or replace view public.v_proyectos_operativos as
select
  id,nombre,cliente_id,codigo,direccion,estado,
  fecha_inicio,fecha_fin,expediente,importe_contratado,
  descripcion,created_at,updated_at,created_by
from public.proyectos;

grant select on public.v_proyectos_operativos to authenticated;

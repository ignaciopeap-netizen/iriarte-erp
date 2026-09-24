-- IRIARTE ERP V2 · estados válidos de factura
-- Aplicada al proyecto Supabase kzmjeccivhkhtuokfkta el 24-09-2026.
-- Añade 'vencida' al conjunto ya soportado por el editor V2.

alter table public.facturas
  drop constraint if exists facturas_estado_check;

alter table public.facturas
  add constraint facturas_estado_check
  check (estado = any (array[
    'borrador'::text,
    'emitida'::text,
    'parcialmente_cobrada'::text,
    'cobrada'::text,
    'vencida'::text,
    'anulada'::text
  ]));

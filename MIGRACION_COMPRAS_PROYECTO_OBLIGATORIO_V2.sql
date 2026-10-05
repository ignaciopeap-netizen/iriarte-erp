-- Iriarte ERP V2
-- Todas las compras son costes de proyecto. Actualmente no existen compras huérfanas.

alter table public.compras
  alter column proyecto_id set not null;

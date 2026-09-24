-- IRIARTE ERP V2 · integridad referencial de vínculos añadidos en migraciones anteriores
-- Todos los conteos de huérfanos fueron 0 antes de aplicar estas restricciones.

do $$ begin
  if not exists(select 1 from pg_constraint where conname='documentos_factura_id_fkey') then
    alter table public.documentos
      add constraint documentos_factura_id_fkey foreign key (factura_id)
      references public.facturas(id) on delete set null;
  end if;
  if not exists(select 1 from pg_constraint where conname='documentos_compra_id_fkey') then
    alter table public.documentos
      add constraint documentos_compra_id_fkey foreign key (compra_id)
      references public.compras(id) on delete set null;
  end if;
  if not exists(select 1 from pg_constraint where conname='documentos_tarea_id_fkey') then
    alter table public.documentos
      add constraint documentos_tarea_id_fkey foreign key (tarea_id)
      references public.obra_tareas(id) on delete set null;
  end if;
  if not exists(select 1 from pg_constraint where conname='documentos_incidencia_id_fkey') then
    alter table public.documentos
      add constraint documentos_incidencia_id_fkey foreign key (incidencia_id)
      references public.obra_incidencias(id) on delete set null;
  end if;
  if not exists(select 1 from pg_constraint where conname='facturas_presupuesto_id_fkey') then
    alter table public.facturas
      add constraint facturas_presupuesto_id_fkey foreign key (presupuesto_id)
      references public.presupuestos(id) on delete set null;
  end if;
  if not exists(select 1 from pg_constraint where conname='facturas_presupuesto_fase_id_fkey') then
    alter table public.facturas
      add constraint facturas_presupuesto_fase_id_fkey foreign key (presupuesto_fase_id)
      references public.presupuesto_fases_facturacion(id) on delete set null;
  end if;
  if not exists(select 1 from pg_constraint where conname='presupuestos_proyecto_id_fkey') then
    alter table public.presupuestos
      add constraint presupuestos_proyecto_id_fkey foreign key (proyecto_id)
      references public.proyectos(id) on delete set null;
  end if;
end $$;

-- Iriarte ERP V2
-- Conserva el histórico incoherente ya existente, pero obliga a que toda
-- alta o edición futura mantenga el estado Pagado alineado con fecha_pago.

alter table public.gastos_generales
  add constraint gastos_estado_fecha_pago_coherente_v2
  check (
    (pagado = true and fecha_pago is not null)
    or
    (coalesce(pagado,false) = false and fecha_pago is null)
  ) not valid;

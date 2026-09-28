-- IRIARTE ERP V2 · evita registrar dos veces la misma factura de proveedor
-- Se considera duplicada cuando coinciden proveedor + ejercicio + número normalizado.
-- Las compras anuladas quedan fuera para permitir corregir y volver a registrar.

create unique index if not exists compras_proveedor_ejercicio_numero_unique
on public.compras (
  proveedor_id,
  extract(year from fecha),
  lower(btrim(numero_factura))
)
where proveedor_id is not null
  and numero_factura is not null
  and btrim(numero_factura) <> ''
  and lower(coalesce(estado,'')) <> 'anulada';

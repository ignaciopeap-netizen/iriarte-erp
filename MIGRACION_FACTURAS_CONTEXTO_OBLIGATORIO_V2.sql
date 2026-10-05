-- Iriarte ERP V2
-- Toda factura, incluso en borrador, nace dentro de un proyecto y hereda su cliente.
-- La tabla no contiene actualmente facturas sin proyecto ni cliente.

alter table public.facturas
  alter column proyecto_id set not null,
  alter column cliente_id set not null;

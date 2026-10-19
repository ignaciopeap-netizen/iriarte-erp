-- Shared internal ERP: membership follows the existing project RLS policies.
create table public.proyecto_clientes (
  proyecto_id text not null references public.proyectos(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id),
  porcentaje numeric(7,4) check (porcentaje > 0 and porcentaje <= 100),
  primary key (proyecto_id, cliente_id)
);
create index proyecto_clientes_cliente_idx on public.proyecto_clientes(cliente_id);
alter table public.proyecto_clientes enable row level security;
create policy proyecto_clientes_visible on public.proyecto_clientes for all to authenticated
using (exists(select 1 from public.proyectos p where p.id=proyecto_id))
with check (exists(select 1 from public.proyectos p where p.id=proyecto_id));
grant select,insert,update,delete on public.proyecto_clientes to authenticated;
insert into public.proyecto_clientes(proyecto_id,cliente_id)
select id,cliente_id from public.proyectos where cliente_id is not null;
alter table public.presupuesto_fases_facturacion add column cliente_id uuid references public.clientes(id);
create index fases_cliente_idx on public.presupuesto_fases_facturacion(cliente_id);
update public.presupuesto_fases_facturacion f set cliente_id=coalesce(
 (select i.cliente_id from public.facturas i where i.id=f.factura_id),
 (select p.cliente_id from public.presupuestos p where p.id=f.presupuesto_id));

create or replace function public.cliente_pertenece_proyecto_v3(p_proyecto text,p_cliente uuid)
returns boolean language sql stable security invoker set search_path=public as $$
 select exists(select 1 from public.proyectos where id=p_proyecto and cliente_id=p_cliente)
 or exists(select 1 from public.proyecto_clientes where proyecto_id=p_proyecto and cliente_id=p_cliente);
$$;
create or replace function public.sync_cliente_principal_v3() returns trigger
language plpgsql security invoker set search_path=public as $$
begin
 if new.cliente_id is not null then
  insert into public.proyecto_clientes(proyecto_id,cliente_id) values(new.id,new.cliente_id) on conflict do nothing;
 end if;
 return new;
end; $$;
create trigger sync_cliente_principal_v3 after insert or update of cliente_id on public.proyectos
for each row execute function public.sync_cliente_principal_v3();

create or replace function public.validar_cliente_documento_proyecto_v2() returns trigger
language plpgsql security invoker set search_path=public as $$
begin
 if new.proyecto_id is null then return new; end if;
 if not public.cliente_pertenece_proyecto_v3(new.proyecto_id,new.cliente_id) then
  raise exception 'El cliente debe estar asociado al proyecto antes de crear el documento';
 end if;
 return new;
end; $$;
create or replace function public.validar_contexto_factura_presupuesto_v2() returns trigger
language plpgsql security invoker set search_path=public as $$
declare p public.presupuestos%rowtype; f public.presupuesto_fases_facturacion%rowtype;
begin
 if new.presupuesto_id is null then
  if new.presupuesto_fase_id is not null then raise exception 'Una fase necesita su presupuesto'; end if;
  return new;
 end if;
 select * into p from public.presupuestos where id=new.presupuesto_id;
 if not found then raise exception 'Presupuesto vinculado no encontrado'; end if;
 if new.proyecto_id is distinct from p.proyecto_id then raise exception 'La factura debe permanecer en el proyecto de su presupuesto'; end if;
 if not public.cliente_pertenece_proyecto_v3(p.proyecto_id,new.cliente_id) then raise exception 'El destinatario no está asociado al proyecto'; end if;
 if new.presupuesto_fase_id is not null then
  select * into f from public.presupuesto_fases_facturacion where id=new.presupuesto_fase_id;
  if not found or f.presupuesto_id<>p.id then raise exception 'La fase no pertenece al presupuesto'; end if;
  if new.cliente_id is distinct from coalesce(f.cliente_id,p.cliente_id) then raise exception 'La factura debe conservar el destinatario elegido en la fase'; end if;
 end if;
 return new;
end; $$;

-- One row per reservation: issued invoices, drafts, or planned phases without an active invoice.
create or replace function public.reservas_presupuesto_v3(p_id uuid)
returns table(cliente_id uuid, importe numeric) language sql stable security invoker set search_path=public as $$
 select i.cliente_id,coalesce(i.base,0) from public.facturas i where i.presupuesto_id=p_id and i.estado<>'anulada'
 union all
 select coalesce(f.cliente_id,p.cliente_id),coalesce(f.importe,0) from public.presupuesto_fases_facturacion f
 join public.presupuestos p on p.id=f.presupuesto_id
 where f.presupuesto_id=p_id and f.estado<>'anulada'
 and not exists(select 1 from public.facturas i where i.presupuesto_fase_id=f.id and i.estado<>'anulada');
$$;
create or replace function public.comprobar_saldo_presupuesto_v3(p_id uuid) returns void
language plpgsql security invoker set search_path=public as $$
declare p public.presupuestos%rowtype; used numeric; r record;
begin
 select * into p from public.presupuestos where id=p_id for update;
 if not found then return; end if;
 select coalesce(sum(importe),0) into used from public.reservas_presupuesto_v3(p_id);
 if round(used,2)>round(coalesce(p.base,0),2) then raise exception 'Se supera el presupuesto: reservado % €, presupuesto % €',round(used,2),round(p.base,2); end if;
 for r in select u.cliente_id,sum(u.importe) amount,pc.porcentaje from public.reservas_presupuesto_v3(p_id) u
 left join public.proyecto_clientes pc on pc.proyecto_id=p.proyecto_id and pc.cliente_id=u.cliente_id group by u.cliente_id,pc.porcentaje loop
  if not public.cliente_pertenece_proyecto_v3(p.proyecto_id,r.cliente_id) then raise exception 'Hay facturación de un cliente no asociado al proyecto'; end if;
  if r.porcentaje is not null and round(r.amount,2)>round(p.base*r.porcentaje/100,2) then raise exception 'Se supera el importe asignado a este cliente (% %%)',r.porcentaje; end if;
 end loop;
end; $$;
create or replace function public.validar_fase_facturacion_v2() returns trigger
language plpgsql security invoker set search_path=public as $$
declare p public.presupuestos%rowtype;
begin
 select * into p from public.presupuestos where id=new.presupuesto_id for update;
 if not found then raise exception 'Presupuesto no encontrado'; end if;
 new.cliente_id:=coalesce(new.cliente_id,p.cliente_id);
 if not public.cliente_pertenece_proyecto_v3(p.proyecto_id,new.cliente_id) then raise exception 'Selecciona un cliente asociado al proyecto'; end if;
 if tg_op='UPDATE' and old.factura_id is not null and
 (new.cliente_id is distinct from old.cliente_id or new.importe is distinct from old.importe or new.presupuesto_id is distinct from old.presupuesto_id) then
  raise exception 'Una fase facturada conserva destinatario, presupuesto e importe';
 end if;
 if new.estado='anulada' then return new; end if;
 if coalesce(p.base,0)<=0 then raise exception 'Guarda un presupuesto con importe positivo'; end if;
 if new.importe is null and new.porcentaje>0 then new.importe:=round(p.base*new.porcentaje/100,2); end if;
 if coalesce(new.importe,0)<=0 or new.importe>p.base then raise exception 'Importe de fase fuera de rango'; end if;
 new.importe:=round(new.importe,2);new.porcentaje:=round(new.importe/p.base*100,4);
 return new;
end; $$;
drop trigger trg_validar_fase_facturacion_v2 on public.presupuesto_fases_facturacion;
create trigger trg_validar_fase_facturacion_v2 before insert or update on public.presupuesto_fases_facturacion
for each row execute function public.validar_fase_facturacion_v2();
create or replace function public.validar_saldo_presupuesto_trigger_v3() returns trigger
language plpgsql security invoker set search_path=public as $$
begin
 if tg_table_name='presupuestos' then perform public.comprobar_saldo_presupuesto_v3(new.id);
 else
  if tg_op<>'DELETE' then perform public.comprobar_saldo_presupuesto_v3(new.presupuesto_id); end if;
  if tg_op<>'INSERT' and (tg_op='DELETE' or old.presupuesto_id is distinct from new.presupuesto_id) then perform public.comprobar_saldo_presupuesto_v3(old.presupuesto_id); end if;
 end if;
 return null;
end; $$;
create constraint trigger validar_saldo_factura_v3 after insert or update or delete on public.facturas
 deferrable initially deferred for each row execute function public.validar_saldo_presupuesto_trigger_v3();
create constraint trigger validar_saldo_fase_v3 after insert or update or delete on public.presupuesto_fases_facturacion
 deferrable initially deferred for each row execute function public.validar_saldo_presupuesto_trigger_v3();
create constraint trigger validar_saldo_presupuesto_v3 after update on public.presupuestos
 deferrable initially deferred for each row execute function public.validar_saldo_presupuesto_trigger_v3();

create or replace function public.guardar_clientes_proyecto_v3(p_proyecto text,p_clientes jsonb) returns void
language plpgsql security invoker set search_path=public as $$
declare pr public.proyectos%rowtype; r record; count_pct int; total_pct numeric; budget record;
begin
 if auth.uid() is null then raise exception 'Autenticación requerida'; end if;
 select * into pr from public.proyectos where id=p_proyecto for update;
 if not found then raise exception 'Proyecto no encontrado'; end if;
 if jsonb_typeof(p_clientes)<>'array' or jsonb_array_length(p_clientes)=0 then raise exception 'Asocia al menos un cliente'; end if;
 if not exists(select 1 from jsonb_to_recordset(p_clientes) as x(cliente_id uuid) where x.cliente_id=pr.cliente_id) then raise exception 'Conserva el cliente principal del proyecto'; end if;
 if (select count(*)<>count(distinct cliente_id) from jsonb_to_recordset(p_clientes) as x(cliente_id uuid)) then raise exception 'No repitas clientes'; end if;
 select count(porcentaje),coalesce(sum(porcentaje),0) into count_pct,total_pct from jsonb_to_recordset(p_clientes) as x(porcentaje numeric);
 if count_pct>0 and (count_pct<>jsonb_array_length(p_clientes) or abs(total_pct-100)>0.0001) then raise exception 'El reparto debe sumar el 100%%, o quedar vacío para todos'; end if;
 for r in select pc.cliente_id from public.proyecto_clientes pc where pc.proyecto_id=p_proyecto
 and not exists(select 1 from jsonb_to_recordset(p_clientes) as x(cliente_id uuid) where x.cliente_id=pc.cliente_id) loop
  if exists(select 1 from public.facturas where proyecto_id=p_proyecto and cliente_id=r.cliente_id)
   or exists(select 1 from public.presupuestos where proyecto_id=p_proyecto and cliente_id=r.cliente_id)
   or exists(select 1 from public.presupuesto_fases_facturacion f join public.presupuestos p on p.id=f.presupuesto_id where p.proyecto_id=p_proyecto and f.cliente_id=r.cliente_id) then
    raise exception 'No se puede quitar un cliente con documentos o fases vinculados';
  end if;
 end loop;
 delete from public.proyecto_clientes pc where pc.proyecto_id=p_proyecto and not exists(select 1 from jsonb_to_recordset(p_clientes) as x(cliente_id uuid) where x.cliente_id=pc.cliente_id);
 insert into public.proyecto_clientes(proyecto_id,cliente_id,porcentaje)
 select p_proyecto,x.cliente_id,x.porcentaje from jsonb_to_recordset(p_clientes) as x(cliente_id uuid,porcentaje numeric)
 on conflict(proyecto_id,cliente_id) do update set porcentaje=excluded.porcentaje;
 for budget in select id from public.presupuestos where proyecto_id=p_proyecto loop perform public.comprobar_saldo_presupuesto_v3(budget.id); end loop;
end; $$;

-- Tax groups are prorated independently. The last invoice consumes the exact remaining cents.
create or replace function public.crear_factura_desde_fase_v2(p_fase_id uuid) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare f public.presupuesto_fases_facturacion%rowtype; p public.presupuestos%rowtype;
 invoice_id uuid; r record; available numeric; allocated numeric:=0; cumulative numeric:=0; amount numeric; n int:=0; groups jsonb; concept text;
begin
 if auth.uid() is null then raise exception 'Autenticación requerida'; end if;
 select p0.* into p from public.presupuestos p0 join public.presupuesto_fases_facturacion f0 on f0.presupuesto_id=p0.id where f0.id=p_fase_id for update of p0;
 if not found then raise exception 'Fase no encontrada'; end if;
 select * into f from public.presupuesto_fases_facturacion where id=p_fase_id for update;
 if f.factura_id is not null then return jsonb_build_object('invoice_id',f.factura_id,'already_existed',true); end if;
 if f.estado='anulada' then raise exception 'La fase está anulada'; end if;
 perform public.comprobar_saldo_presupuesto_v3(p.id);
 with source as (
  select coalesce((x->>'vat')::numeric,(x->>'ivaPct')::numeric,21) rate,
  case when p.kind='honorarios' then coalesce((x->>'amount')::numeric,(x->>'importe')::numeric,0)
  else coalesce((x->>'qty')::numeric,(x->>'cantidad')::numeric,0)*coalesce((x->>'price')::numeric,(x->>'precio')::numeric,0) end base
  from jsonb_array_elements(case when p.kind='honorarios' then coalesce(p.fee_lines,'[]') else coalesce(p.items,'[]') end) x
 ), source_groups as (select rate,round(sum(base),2) base from source group by rate),
 used as (select l.iva_pct rate,round(sum(l.cantidad*l.precio_unitario*(1-coalesce(l.descuento_pct,0)/100)),2) base
 from public.factura_lineas l join public.facturas i on i.id=l.factura_id where i.presupuesto_id=p.id and i.estado<>'anulada' group by l.iva_pct),
 remaining as (select coalesce(s.rate,u.rate) rate,coalesce(s.base,0)-coalesce(u.base,0) base from source_groups s full join used u using(rate))
 select jsonb_agg(jsonb_build_object('rate',rate,'base',base) order by rate),sum(base) into groups,available from remaining;
 if groups is null then raise exception 'El presupuesto necesita líneas para calcular los impuestos'; end if;
 if exists(select 1 from jsonb_array_elements(groups) x where (x->>'base')::numeric<0) then raise exception 'Los IVA de las facturas anteriores no coinciden con el presupuesto. Revisa el desglose antes de continuar'; end if;
 if round(f.importe,2)>round(available,2) or available<=0 then raise exception 'El importe supera el pendiente disponible'; end if;
 concept:=coalesce(nullif(f.descripcion,''),nullif(f.nombre,''),'Facturación parcial')||' · Presupuesto '||coalesce(p.ref,p.numero,p.name,p.id::text);
 insert into public.facturas(fecha,cliente_id,proyecto_id,presupuesto_id,presupuesto_fase_id,concepto,estado,irpf_pct,notas)
 values(current_date,coalesce(f.cliente_id,p.cliente_id),p.proyecto_id,p.id,f.id,concept,'borrador',case when p.irpf_enabled then coalesce(p.irpf_pct,0) else 0 end,'Generada desde presupuesto; importe parcial, sin duplicar anticipos.') returning id into invoice_id;
 for r in select (x->>'rate')::numeric rate,(x->>'base')::numeric base from jsonb_array_elements(groups) x loop
  cumulative:=cumulative+r.base;
  amount:=round(f.importe*cumulative/available,2)-allocated;
  allocated:=allocated+amount;
  if amount>0 then
   n:=n+1;
   insert into public.factura_lineas(factura_id,orden,seccion,descripcion,unidad,cantidad,precio_unitario,descuento_pct,iva_pct)
   values(invoice_id,n,'Facturación parcial',concept,'ud',1,amount,0,r.rate);
  end if;
 end loop;
 perform public.recalc_factura_totals(invoice_id);
 update public.presupuesto_fases_facturacion set factura_id=invoice_id where id=f.id;
 perform public.comprobar_saldo_presupuesto_v3(p.id);
 return jsonb_build_object('invoice_id',invoice_id,'phase_id',f.id,'project_id',p.proyecto_id);
end; $$;

create or replace function public.facturar_presupuesto_parcial_v3(p_presupuesto uuid,p_cliente uuid,p_importe numeric,p_concepto text,p_peticion uuid) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare p public.presupuestos%rowtype; f public.presupuesto_fases_facturacion%rowtype;
begin
 if auth.uid() is null then raise exception 'Autenticación requerida'; end if;
 select * into p from public.presupuestos where id=p_presupuesto for update;
 if not found then raise exception 'Presupuesto no encontrado'; end if;
 select * into f from public.presupuesto_fases_facturacion where id=p_peticion;
 if found then
  if f.presupuesto_id<>p.id or f.cliente_id<>p_cliente or f.importe<>round(p_importe,2) then raise exception 'La solicitud ya existe con otros datos'; end if;
  return public.crear_factura_desde_fase_v2(f.id);
 end if;
 if p.estado in ('anulado','rechazado') then raise exception 'Este presupuesto no se puede facturar'; end if;
 if not public.cliente_pertenece_proyecto_v3(p.proyecto_id,p_cliente) then raise exception 'Asocia el cliente al proyecto antes de facturar'; end if;
 insert into public.presupuesto_fases_facturacion(id,presupuesto_id,cliente_id,nombre,descripcion,importe,estado)
 values(p_peticion,p.id,p_cliente,coalesce(nullif(trim(p_concepto),''),'Facturación parcial'),p_concepto,round(p_importe,2),'pendiente');
 return public.crear_factura_desde_fase_v2(p_peticion);
end; $$;

create or replace function public.vincular_factura_presupuesto_v3(p_presupuesto uuid,p_factura uuid) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare p public.presupuestos%rowtype; i public.facturas%rowtype; fid uuid;
begin
 if auth.uid() is null then raise exception 'Autenticación requerida'; end if;
 select * into p from public.presupuestos where id=p_presupuesto for update;
 select * into i from public.facturas where id=p_factura for update;
 if p.id is null or i.id is null then raise exception 'Documento no encontrado'; end if;
 if i.presupuesto_id=p.id then return jsonb_build_object('invoice_id',i.id,'already_existed',true); end if;
 if i.presupuesto_id is not null then raise exception 'La factura pertenece a otro presupuesto'; end if;
 if i.proyecto_id is distinct from p.proyecto_id or not public.cliente_pertenece_proyecto_v3(p.proyecto_id,i.cliente_id) then raise exception 'La factura debe pertenecer al mismo proyecto y a un cliente asociado'; end if;
 if i.estado='anulada' or coalesce(i.base,0)<=0 then raise exception 'La factura debe estar activa y tener importe'; end if;
 insert into public.presupuesto_fases_facturacion(presupuesto_id,cliente_id,nombre,importe,estado)
 values(p.id,i.cliente_id,'Factura anterior '||coalesce(i.numero,'borrador'),i.base,'pendiente') returning id into fid;
 update public.facturas set presupuesto_id=p.id,presupuesto_fase_id=fid where id=i.id;
 update public.presupuesto_fases_facturacion set factura_id=i.id where id=fid;
 perform public.comprobar_saldo_presupuesto_v3(p.id);
 return jsonb_build_object('invoice_id',i.id,'phase_id',fid);
end; $$;

-- New RPCs are authenticated and security-invoker; no public or anonymous execution.
revoke all on function public.cliente_pertenece_proyecto_v3(text,uuid),public.reservas_presupuesto_v3(uuid),public.comprobar_saldo_presupuesto_v3(uuid),public.guardar_clientes_proyecto_v3(text,jsonb),public.facturar_presupuesto_parcial_v3(uuid,uuid,numeric,text,uuid),public.vincular_factura_presupuesto_v3(uuid,uuid) from public,anon;
grant execute on function public.cliente_pertenece_proyecto_v3(text,uuid),public.reservas_presupuesto_v3(uuid),public.comprobar_saldo_presupuesto_v3(uuid),public.guardar_clientes_proyecto_v3(text,jsonb),public.facturar_presupuesto_parcial_v3(uuid,uuid,numeric,text,uuid),public.vincular_factura_presupuesto_v3(uuid,uuid) to authenticated;

-- Enforce membership invariants even when a caller writes the relationship table directly.
create or replace function public.validar_clientes_proyecto_v3() returns trigger
language plpgsql security invoker set search_path=public as $$
declare pid text; pr public.proyectos%rowtype; cnt int; shares int; total numeric; b record;
begin
 pid:=case when tg_op='DELETE' then old.proyecto_id else new.proyecto_id end;
 select * into pr from public.proyectos where id=pid for update;
 if not found then return null; end if;
 if not exists(select 1 from public.proyecto_clientes where proyecto_id=pid and cliente_id=pr.cliente_id) then raise exception 'Conserva el cliente principal'; end if;
 select count(*),count(porcentaje),sum(porcentaje) into cnt,shares,total from public.proyecto_clientes where proyecto_id=pid;
 if shares>0 and (shares<>cnt or abs(total-100)>0.0001) then raise exception 'El reparto debe sumar el 100%%, o quedar libre para todos'; end if;
 if exists(select 1 from public.facturas i where i.proyecto_id=pid and not public.cliente_pertenece_proyecto_v3(pid,i.cliente_id))
 or exists(select 1 from public.presupuestos p where p.proyecto_id=pid and not public.cliente_pertenece_proyecto_v3(pid,p.cliente_id)) then raise exception 'Conserva los clientes con documentos vinculados'; end if;
 for b in select id from public.presupuestos where proyecto_id=pid loop perform public.comprobar_saldo_presupuesto_v3(b.id); end loop;
 return null;
end; $$;
create constraint trigger validar_clientes_proyecto_v3 after insert or update or delete on public.proyecto_clientes
 deferrable initially deferred for each row execute function public.validar_clientes_proyecto_v3();
revoke all on function public.sync_cliente_principal_v3(),public.validar_saldo_presupuesto_trigger_v3(),public.validar_clientes_proyecto_v3() from public,anon;
grant execute on function public.sync_cliente_principal_v3(),public.validar_saldo_presupuesto_trigger_v3(),public.validar_clientes_proyecto_v3() to authenticated;

-- Round tax groups consistently with the generated documents and preview.
create or replace function public.recalc_factura_totals(p_factura_id uuid) returns void
language plpgsql security invoker set search_path=public as $$
declare b numeric; v numeric; rp numeric; retention numeric;
begin
 select coalesce(sum(round(g.base,2)),0),coalesce(sum(round(g.base*g.iva_pct/100,2)),0) into b,v
 from (select iva_pct,sum(cantidad*precio_unitario*(1-descuento_pct/100)) base
       from public.factura_lineas where factura_id=p_factura_id group by iva_pct) g;
 select coalesce(irpf_pct,0) into rp from public.facturas where id=p_factura_id;
 retention:=round(b*rp/100,2);
 update public.facturas set base=b,iva_importe=v,irpf_importe=retention,total=b+v-retention,updated_at=now() where id=p_factura_id;
end; $$;

-- Iriarte ERP V2 · motor de costes mensuales de personal e imputaciones analíticas
-- Un coste real existe una vez. Sus imputaciones distribuyen analíticamente ese coste entre proyectos.

create table if not exists public.costes_personal_mensuales (
  id uuid primary key default gen_random_uuid(),
  periodo date not null,
  persona text not null,
  usuario_id uuid null references public.profiles(id) on delete set null,
  tipo text not null default 'otro',
  concepto text not null,
  importe numeric not null check (importe >= 0),
  movimiento_financiero_id uuid null references public.movimientos_financieros(id) on delete set null,
  metodo_reparto text not null default 'horas_mes',
  estado text not null default 'borrador' check (estado in ('borrador','revisado','cerrado')),
  notas text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid null default auth.uid() references auth.users(id) on delete set null,
  constraint costes_personal_periodo_mes check (periodo = date_trunc('month',periodo)::date)
);

create table if not exists public.costes_personal_imputaciones (
  id uuid primary key default gen_random_uuid(),
  coste_personal_id uuid not null references public.costes_personal_mensuales(id) on delete cascade,
  proyecto_id text null references public.proyectos(id) on delete restrict,
  clasificacion text not null default 'proyecto' check (clasificacion in ('proyecto','general','no_estudio')),
  horas_base numeric not null default 0 check (horas_base >= 0),
  porcentaje numeric not null default 0 check (porcentaje >= 0 and porcentaje <= 100),
  importe numeric not null default 0 check (importe >= 0),
  metodo text not null default 'automatico_horas',
  ajuste_manual boolean not null default false,
  notas text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid null default auth.uid() references auth.users(id) on delete set null,
  constraint coste_personal_imputacion_contexto check (
    (clasificacion='proyecto' and proyecto_id is not null)
    or (clasificacion in ('general','no_estudio') and proyecto_id is null)
  )
);

create unique index if not exists costes_personal_imputacion_unica_idx
on public.costes_personal_imputaciones(coste_personal_id,clasificacion,coalesce(proyecto_id,'__sin_proyecto__'));
create index if not exists costes_personal_mensuales_periodo_persona_idx on public.costes_personal_mensuales(periodo,persona);
create index if not exists costes_personal_mensuales_movimiento_idx on public.costes_personal_mensuales(movimiento_financiero_id) where movimiento_financiero_id is not null;
create index if not exists costes_personal_imputaciones_proyecto_idx on public.costes_personal_imputaciones(proyecto_id) where proyecto_id is not null;
create index if not exists costes_personal_imputaciones_coste_idx on public.costes_personal_imputaciones(coste_personal_id);

alter table public.costes_personal_mensuales enable row level security;
alter table public.costes_personal_imputaciones enable row level security;
grant select,insert,update,delete on public.costes_personal_mensuales to authenticated;
grant select,insert,update,delete on public.costes_personal_imputaciones to authenticated;
revoke all on public.costes_personal_mensuales from anon;
revoke all on public.costes_personal_imputaciones from anon;

create policy "usuarios autenticados ven costes personal" on public.costes_personal_mensuales for select to authenticated using (true);
create policy "usuarios autenticados crean costes personal" on public.costes_personal_mensuales for insert to authenticated with check (true);
create policy "usuarios autenticados editan costes personal" on public.costes_personal_mensuales for update to authenticated using (true) with check (true);
create policy "usuarios autenticados eliminan costes personal" on public.costes_personal_mensuales for delete to authenticated using (true);
create policy "usuarios autenticados ven imputaciones personal" on public.costes_personal_imputaciones for select to authenticated using (true);
create policy "usuarios autenticados crean imputaciones personal" on public.costes_personal_imputaciones for insert to authenticated with check (true);
create policy "usuarios autenticados editan imputaciones personal" on public.costes_personal_imputaciones for update to authenticated using (true) with check (true);
create policy "usuarios autenticados eliminan imputaciones personal" on public.costes_personal_imputaciones for delete to authenticated using (true);

drop trigger if exists trg_touch_costes_personal_mensuales on public.costes_personal_mensuales;
create trigger trg_touch_costes_personal_mensuales before update on public.costes_personal_mensuales for each row execute function public.set_updated_at();
drop trigger if exists trg_touch_costes_personal_imputaciones on public.costes_personal_imputaciones;
create trigger trg_touch_costes_personal_imputaciones before update on public.costes_personal_imputaciones for each row execute function public.set_updated_at();

create or replace function public.recalcular_imputaciones_coste_personal_v2(p_coste_id uuid)
returns jsonb language plpgsql security invoker set search_path to 'public' as $function$
declare
  c public.costes_personal_mensuales%rowtype;
  v_horas numeric := 0; v_asignado numeric := 0; v_delta numeric := 0; v_top uuid;
begin
  if auth.uid() is null then raise exception 'Autenticación requerida'; end if;
  select * into c from public.costes_personal_mensuales where id=p_coste_id for update;
  if not found then raise exception 'Coste mensual no encontrado'; end if;
  if c.estado='cerrado' then raise exception 'Reabre el coste mensual antes de recalcularlo'; end if;
  delete from public.costes_personal_imputaciones where coste_personal_id=c.id;
  select coalesce(sum(h.horas),0) into v_horas
  from public.horas_proyecto h
  where h.fecha>=c.periodo and h.fecha<(c.periodo+interval '1 month')::date
    and ((c.usuario_id is not null and h.usuario_id=c.usuario_id)
      or (c.usuario_id is null and lower(trim(h.persona))=lower(trim(c.persona))));
  if v_horas>0 then
    insert into public.costes_personal_imputaciones(coste_personal_id,proyecto_id,clasificacion,horas_base,porcentaje,importe,metodo,ajuste_manual)
    select c.id,h.proyecto_id,'proyecto',sum(h.horas),round(sum(h.horas)/v_horas*100,6),round(c.importe*sum(h.horas)/v_horas,2),'automatico_horas',false
    from public.horas_proyecto h
    where h.fecha>=c.periodo and h.fecha<(c.periodo+interval '1 month')::date
      and ((c.usuario_id is not null and h.usuario_id=c.usuario_id)
        or (c.usuario_id is null and lower(trim(h.persona))=lower(trim(c.persona))))
    group by h.proyecto_id;
    select coalesce(sum(importe),0) into v_asignado from public.costes_personal_imputaciones where coste_personal_id=c.id;
    v_delta:=round(c.importe-v_asignado,2);
    if v_delta<>0 then
      select id into v_top from public.costes_personal_imputaciones where coste_personal_id=c.id order by horas_base desc,id limit 1;
      update public.costes_personal_imputaciones set importe=importe+v_delta where id=v_top;
    end if;
  else
    insert into public.costes_personal_imputaciones(coste_personal_id,proyecto_id,clasificacion,horas_base,porcentaje,importe,metodo,ajuste_manual,notas)
    values(c.id,null,'general',0,100,c.importe,'sin_horas',false,'Sin horas del periodo para esta persona; pendiente de revisión manual.');
  end if;
  update public.costes_personal_mensuales set estado='borrador' where id=c.id;
  return jsonb_build_object('coste_id',c.id,'horas_mes',v_horas,'importe',c.importe,'imputaciones',(select count(*) from public.costes_personal_imputaciones where coste_personal_id=c.id),'asignado',(select coalesce(sum(importe),0) from public.costes_personal_imputaciones where coste_personal_id=c.id));
end;
$function$;

create or replace function public.cerrar_coste_personal_v2(p_coste_id uuid)
returns jsonb language plpgsql security invoker set search_path to 'public' as $function$
declare c public.costes_personal_mensuales%rowtype; v_sum numeric;
begin
  if auth.uid() is null then raise exception 'Autenticación requerida'; end if;
  select * into c from public.costes_personal_mensuales where id=p_coste_id for update;
  if not found then raise exception 'Coste mensual no encontrado'; end if;
  select coalesce(sum(importe),0) into v_sum from public.costes_personal_imputaciones where coste_personal_id=c.id;
  if abs(v_sum-c.importe)>0.01 then raise exception 'Las imputaciones no cuadran con el coste origen: asignado %, origen %',v_sum,c.importe; end if;
  if not exists(select 1 from public.costes_personal_imputaciones where coste_personal_id=c.id) then raise exception 'No hay imputaciones que cerrar'; end if;
  update public.costes_personal_mensuales set estado='cerrado' where id=c.id;
  return jsonb_build_object('coste_id',c.id,'estado','cerrado','importe',c.importe,'asignado',v_sum);
end;
$function$;

revoke all on function public.recalcular_imputaciones_coste_personal_v2(uuid) from public,anon;
revoke all on function public.cerrar_coste_personal_v2(uuid) from public,anon;
grant execute on function public.recalcular_imputaciones_coste_personal_v2(uuid) to authenticated;
grant execute on function public.cerrar_coste_personal_v2(uuid) to authenticated;

create or replace view public.v_costes_personal_proyecto with (security_invoker=true) as
select i.proyecto_id,c.periodo,c.persona,c.tipo,c.concepto,c.estado,sum(i.importe)::numeric as importe_imputado,sum(i.horas_base)::numeric as horas_base,count(*)::integer as lineas
from public.costes_personal_imputaciones i join public.costes_personal_mensuales c on c.id=i.coste_personal_id
where i.clasificacion='proyecto' and i.proyecto_id is not null
group by i.proyecto_id,c.periodo,c.persona,c.tipo,c.concepto,c.estado;
grant select on public.v_costes_personal_proyecto to authenticated;
revoke all on public.v_costes_personal_proyecto from anon;

-- Run inside BEGIN / ROLLBACK, after the migration. No fixture is retained.
select set_config('request.jwt.claim.sub',(select id::text from public.profiles limit 1),true);
select set_config('request.jwt.claim.role','authenticated',true);
set local role authenticated;
do $$
declare a uuid; b uuid; outsider uuid; budget uuid; f1 uuid; f2 uuid; phase uuid; req uuid:=gen_random_uuid(); result jsonb; fail boolean; n numeric; budget2 uuid; historic uuid; anonymous_uid text;
begin
 insert into public.clientes(nombre) values('TEST rollback A') returning id into a;
 insert into public.clientes(nombre) values('TEST rollback B') returning id into b;
 insert into public.clientes(nombre) values('TEST rollback outsider') returning id into outsider;
 insert into public.proyectos(id,nombre,cliente_id,codigo) values('test-billing-v3','TEST rollback',a,'TEST-billing-v3');
 perform public.guardar_clientes_proyecto_v3('test-billing-v3',jsonb_build_array(jsonb_build_object('cliente_id',a,'porcentaje',60),jsonb_build_object('cliente_id',b,'porcentaje',40)));
 insert into public.presupuestos(proyecto_id,cliente_id,nombre,name,ref,kind,estado,phase,status,base,total,items)
 values('test-billing-v3',a,'TEST','TEST','TEST-1','obra','aceptado','Aceptado','Aceptado',10000,11440,
 '[{"description":"IVA21","section":"Obra","qty":1,"price":4000,"vat":21},{"description":"IVA10","section":"Plantas","qty":1,"price":6000,"vat":10}]') returning id into budget;
 result:=public.facturar_presupuesto_parcial_v3(budget,a,6000,'Anticipo 60%',req); f1:=(result->>'invoice_id')::uuid;
 if (select base<>6000 or total<>6864 or cliente_id<>a from public.facturas where id=f1) then raise exception 'TEST wrong first invoice'; end if;
 if (public.facturar_presupuesto_parcial_v3(budget,a,6000,'Anticipo 60%',req)->>'invoice_id')::uuid<>f1 then raise exception 'TEST idempotency'; end if;
 if (select count(*) from public.factura_lineas where factura_id=f1)<>2 then raise exception 'TEST mixed taxes'; end if;
 fail:=false;begin perform public.facturar_presupuesto_parcial_v3(budget,a,1,'Excess share',gen_random_uuid());exception when others then fail:=true;end;
 if not fail then raise exception 'TEST share cap missing'; end if;
 fail:=false;begin perform public.facturar_presupuesto_parcial_v3(budget,outsider,1,'Wrong client',gen_random_uuid());exception when others then fail:=true;end;
 if not fail then raise exception 'TEST client guard missing'; end if;
 result:=public.facturar_presupuesto_parcial_v3(budget,b,4000,'Liquidación',gen_random_uuid());f2:=(result->>'invoice_id')::uuid;
 if (select base<>4000 or total<>4576 or cliente_id<>b from public.facturas where id=f2) then raise exception 'TEST wrong second invoice'; end if;
 fail:=false;begin perform public.facturar_presupuesto_parcial_v3(budget,b,1,'Excess total',gen_random_uuid());exception when others then fail:=true;end;
 if not fail then raise exception 'TEST budget cap missing'; end if;
 fail:=false;begin perform public.guardar_clientes_proyecto_v3('test-billing-v3',jsonb_build_array(jsonb_build_object('cliente_id',a)));exception when others then fail:=true;end;
 if not fail then raise exception 'TEST historical client removed'; end if;
 update public.facturas set numero='TEST-V3-1',estado='emitida' where id=f1;
 if (select estado from public.presupuesto_fases_facturacion where factura_id=f1)<>'facturada' then raise exception 'TEST emitted phase state'; end if;
 update public.facturas set estado='anulada' where id=f2;
 result:=public.facturar_presupuesto_parcial_v3(budget,b,4000,'Restante tras anulación',gen_random_uuid());
 perform public.comprobar_saldo_presupuesto_v3(budget);
 -- Existing issued invoices link without creating another financial document.
 perform public.guardar_clientes_proyecto_v3('test-billing-v3',jsonb_build_array(jsonb_build_object('cliente_id',a),jsonb_build_object('cliente_id',b)));
 insert into public.presupuestos(proyecto_id,cliente_id,nombre,name,ref,kind,estado,phase,status,base,total,items)
 values('test-billing-v3',a,'TEST2','TEST2','TEST-2','obra','aceptado','Aceptado','Aceptado',1000,1210,
 '[{"description":"Obra","qty":1,"price":1000,"vat":21}]') returning id into budget2;
 insert into public.facturas(numero,fecha,proyecto_id,cliente_id,estado,concepto) values('TEST-HISTORIC',current_date,'test-billing-v3',b,'emitida','Factura anterior') returning id into historic;
 insert into public.factura_lineas(factura_id,descripcion,cantidad,precio_unitario,iva_pct,descuento_pct) values(historic,'Anticipo',1,400,21,0);
 perform public.vincular_factura_presupuesto_v3(budget2,historic);
 if (select base from public.facturas where id=historic)<>400 then raise exception 'TEST historical amount changed'; end if;
 result:=public.facturar_presupuesto_parcial_v3(budget2,a,600,'Liquidación restante',gen_random_uuid());
 if (select total from public.facturas where id=(result->>'invoice_id')::uuid)<>726 then raise exception 'TEST historical remainder'; end if;
 -- Editing a generated draft cannot bypass the shared budget cap.
 fail:=false;begin
  update public.factura_lineas set precio_unitario=601 where factura_id=(result->>'invoice_id')::uuid;
  perform public.comprobar_saldo_presupuesto_v3(budget2);
 exception when others then fail:=true;end;
 if not fail then raise exception 'TEST editing cap missing'; end if;
 -- Unauthenticated RPC access is denied, even when SQL execution role has privileges.
 anonymous_uid:=current_setting('request.jwt.claim.sub');perform set_config('request.jwt.claim.sub','',true);
 fail:=false;begin perform public.facturar_presupuesto_parcial_v3(budget2,a,1,'Unauthorized',gen_random_uuid());exception when others then fail:=true;end;
 perform set_config('request.jwt.claim.sub',anonymous_uid,true);
 if not fail then raise exception 'TEST authentication guard missing'; end if;
 set constraints all immediate;
 raise notice 'PASS: multiple clients, allocation, mixed VAT, totals, idempotency, caps, cancellation, phase status, historical linking, editing and authenticated access';
end; $$;

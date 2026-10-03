-- Dividamos · datos de prueba: Lucas y Sara (GBA, Galicia, 50/50, DIV·4821)
-- Login: lucas@dividamos.app / dividamos123   ·   sara@dividamos.app / dividamos123
-- Ejecutar DESPUÉS de migrations/001_schema.sql. Es idempotente.

do $$
declare
  v_lucas uuid := '11111111-1111-4111-8111-111111111111';
  v_sara  uuid := '22222222-2222-4222-8222-222222222222';
  v_hogar uuid := '44444444-4821-4821-8821-444444444821';
  v_meta1 uuid := '55555555-0001-4000-8000-000000000001';
  v_meta2 uuid := '55555555-0002-4000-8000-000000000002';
  v_meta3 uuid := '55555555-0003-4000-8000-000000000003';
  u record;
begin
  -- Usuarios de auth
  for u in select * from (values (v_lucas, 'lucas@dividamos.app'), (v_sara, 'sara@dividamos.app')) as t(id, email) loop
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                            raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                            confirmation_token, recovery_token, email_change_token_new, email_change)
    values ('00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
            crypt('dividamos123', gen_salt('bf')), now(),
            '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '')
    on conflict (id) do nothing;

    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), u.id, u.id::text,
            jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
            'email', now(), now(), now())
    on conflict do nothing;
  end loop;

  -- Hogar
  insert into public.hogares (id, nombre, codigo_invitacion, region, division_default, banco, created_at)
  values (v_hogar, 'Casa de Lucas y Sara', 'DIV·4821', 'GBA', '50/50', 'Galicia', now() - interval '8 months')
  on conflict (id) do nothing;

  insert into public.users (id, nombre, email, hogar_id, avatar_color, created_at) values
    (v_lucas, 'Lucas', 'lucas@dividamos.app', v_hogar, '#7C3AED', now() - interval '8 months'),
    (v_sara,  'Sara',  'sara@dividamos.app',  v_hogar, '#EC4899', now() - interval '8 months' + interval '1 minute')
  on conflict (id) do nothing;

  perform public.crear_categorias_default(v_hogar);

  -- Gastos: sólo si el hogar todavía no tiene
  if not exists (select 1 from public.gastos where hogar_id = v_hogar) then
    -- Mes actual (fechas relativas a hoy para que la demo siempre tenga datos frescos)
    insert into public.gastos (hogar_id, monto, categoria, descripcion, quien_pago, division, fecha) values
      (v_hogar,  48700, 'Super',     'Compra semanal Coto',      v_lucas, '50/50', current_date),
      (v_hogar,  18500, 'Comida',    'Pedido de sushi',          v_sara,  '50/50', current_date - 1),
      (v_hogar,  32900, 'Servicios', 'Edenor',                   v_lucas, '50/50', current_date - 2),
      (v_hogar,  14200, 'Salud',     'Farmacia',                 v_sara,  '50/50', current_date - 3),
      (v_hogar,  65000, 'Auto',      'Nafta + lavado',           v_lucas, '50/50', current_date - 5),
      (v_hogar,  27400, 'Niños',     'Útiles del cole',          v_sara,  '50/50', current_date - 6),
      (v_hogar,  39800, 'Ropa',      'Zapatillas',               v_sara,  '50/50', current_date - 8),
      (v_hogar,  21600, 'Hogar',     'Ferretería',               v_lucas, '50/50', current_date - 9),
      (v_hogar,  56300, 'Super',     'Carrefour mensual',        v_sara,  '50/50', current_date - 11),
      (v_hogar,  24800, 'Servicios', 'Internet Fibertel',        v_sara,  '50/50', current_date - 13);

    -- Meses anteriores (5 meses hacia atrás), con un poco de variación
    insert into public.gastos (hogar_id, monto, categoria, descripcion, quien_pago, division, fecha)
    select v_hogar,
           round((base.monto * (1 + 0.04 * m.n) * (0.9 + random() * 0.2))::numeric, -2),
           base.categoria, base.descripcion,
           case when (m.n + base.i) % 2 = 0 then v_lucas else v_sara end,
           '50/50',
           (date_trunc('month', current_date) - (m.n || ' months')::interval)::date + base.dia
    from generate_series(1, 5) as m(n)
    cross join (values
      (1, 'Super',     'Compra mensual',   95000, 3),
      (2, 'Servicios', 'Luz, gas y agua',  58000, 6),
      (3, 'Comida',    'Delivery',         31000, 9),
      (4, 'Auto',      'Nafta',            52000, 12),
      (5, 'Salud',     'Prepaga copago',   22000, 15),
      (6, 'Niños',     'Actividades',      36000, 18),
      (7, 'Hogar',     'Limpieza',         19000, 21),
      (8, 'Ropa',      'Ropa',             28000, 24)
    ) as base(i, categoria, descripcion, monto, dia);
  end if;

  -- Metas
  insert into public.metas (id, hogar_id, nombre, emoji, monto_objetivo, fecha_objetivo) values
    (v_meta1, v_hogar, 'Vacaciones en Bariloche', '🏔️', 1800000, (current_date + interval '5 months')::date),
    (v_meta2, v_hogar, 'Fondo de emergencia',     '🛟', 1200000, (current_date + interval '10 months')::date),
    (v_meta3, v_hogar, 'Heladera nueva',          '🧊',  950000, (current_date + interval '2 months')::date)
  on conflict (id) do nothing;

  if not exists (select 1 from public.depositos where meta_id in (v_meta1, v_meta2, v_meta3)) then
    insert into public.depositos (meta_id, usuario_id, monto, fecha) values
      (v_meta1, v_lucas, 250000, current_date - 60),
      (v_meta1, v_sara,  250000, current_date - 30),
      (v_meta1, v_lucas, 150000, current_date - 4),
      (v_meta2, v_sara,  300000, current_date - 45),
      (v_meta2, v_lucas, 180000, current_date - 10),
      (v_meta3, v_sara,  420000, current_date - 20),
      (v_meta3, v_lucas, 300000, current_date - 2);
  end if;

  -- Vencimientos
  if not exists (select 1 from public.vencimientos where hogar_id = v_hogar) then
    insert into public.vencimientos (hogar_id, nombre, dia_del_mes, monto_estimado) values
      (v_hogar, 'Alquiler',        5,  450000),
      (v_hogar, 'Tarjeta Galicia', 12, 380000),
      (v_hogar, 'Edenor',          18,  33000),
      (v_hogar, 'Internet',        22,  25000),
      (v_hogar, 'Expensas',        10, 120000);
  end if;
end $$;

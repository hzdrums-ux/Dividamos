-- Dividamos · esquema inicial
-- Ejecutar en el SQL Editor de Supabase (o `supabase db push`).

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- Tablas
-- ─────────────────────────────────────────────────────────────

create table public.hogares (
  id                uuid primary key default gen_random_uuid(),
  nombre            text not null,
  codigo_invitacion text not null unique check (codigo_invitacion ~ '^DIV·[0-9]{4}$'),
  region            text not null check (region in ('CABA','GBA','Córdoba','Rosario','Mendoza','Tucumán','Otra')),
  division_default  text not null default '50/50' check (division_default in ('50/50','60/40','70/30')),
  banco             text check (banco in ('Galicia','Santander','BBVA','Macro','Nación','HSBC','Brubank','Naranja X','Otro')),
  created_at        timestamptz not null default now()
);

-- users.id = auth.users.id
create table public.users (
  id           uuid primary key references auth.users(id) on delete cascade,
  nombre       text not null,
  email        text not null,
  hogar_id     uuid references public.hogares(id) on delete set null,
  avatar_color text not null default '#7C3AED',
  created_at   timestamptz not null default now()
);

create table public.gastos (
  id          uuid primary key default gen_random_uuid(),
  hogar_id    uuid not null references public.hogares(id) on delete cascade,
  monto       numeric(14,2) not null check (monto > 0),
  categoria   text not null,
  descripcion text,
  quien_pago  uuid not null references public.users(id),
  division    text not null default '50/50' check (division in ('50/50','60/40','70/30','40/60','30/70','100/0','0/100')),
  fecha       date not null default current_date,
  created_at  timestamptz not null default now()
);
create index gastos_hogar_fecha_idx on public.gastos (hogar_id, fecha desc);

create table public.metas (
  id             uuid primary key default gen_random_uuid(),
  hogar_id       uuid not null references public.hogares(id) on delete cascade,
  nombre         text not null,
  emoji          text not null default '🎯',
  monto_objetivo numeric(14,2) not null check (monto_objetivo > 0),
  fecha_objetivo date,
  created_at     timestamptz not null default now()
);

create table public.depositos (
  id         uuid primary key default gen_random_uuid(),
  meta_id    uuid not null references public.metas(id) on delete cascade,
  usuario_id uuid not null references public.users(id),
  monto      numeric(14,2) not null check (monto > 0),
  fecha      date not null default current_date
);
create index depositos_meta_idx on public.depositos (meta_id);

create table public.categorias (
  id       uuid primary key default gen_random_uuid(),
  hogar_id uuid not null references public.hogares(id) on delete cascade,
  nombre   text not null,
  emoji    text not null,
  activa   boolean not null default true,
  orden    int not null default 0,
  unique (hogar_id, nombre)
);

create table public.vencimientos (
  id             uuid primary key default gen_random_uuid(),
  hogar_id       uuid not null references public.hogares(id) on delete cascade,
  nombre         text not null,
  dia_del_mes    int not null check (dia_del_mes between 1 and 31),
  monto_estimado numeric(14,2),
  activo         boolean not null default true
);

-- ─────────────────────────────────────────────────────────────
-- Helpers
-- ─────────────────────────────────────────────────────────────

-- Hogar del usuario autenticado (security definer para evitar recursión de RLS).
create or replace function public.mi_hogar_id()
returns uuid language sql stable security definer set search_path = public as $$
  select hogar_id from public.users where id = auth.uid()
$$;

create or replace function public.generar_codigo_invitacion()
returns text language plpgsql volatile set search_path = public as $$
declare
  codigo text;
begin
  loop
    codigo := 'DIV·' || lpad((floor(random() * 10000))::int::text, 4, '0');
    exit when not exists (select 1 from public.hogares where codigo_invitacion = codigo);
  end loop;
  return codigo;
end $$;

create or replace function public.crear_categorias_default(p_hogar uuid)
returns void language sql security definer set search_path = public as $$
  insert into public.categorias (hogar_id, nombre, emoji, orden) values
    (p_hogar, 'Super',     '🛒', 1),
    (p_hogar, 'Niños',     '🧸', 2),
    (p_hogar, 'Servicios', '💡', 3),
    (p_hogar, 'Salud',     '💊', 4),
    (p_hogar, 'Hogar',     '🏠', 5),
    (p_hogar, 'Auto',      '🚗', 6),
    (p_hogar, 'Comida',    '🍕', 7),
    (p_hogar, 'Ropa',      '👕', 8)
  on conflict do nothing;
$$;

-- Onboarding "nuevo hogar": crea hogar + perfil + categorías. Devuelve el hogar.
create or replace function public.crear_hogar(
  p_nombre_usuario text,
  p_region text,
  p_division text,
  p_nombre_hogar text default null,
  p_avatar_color text default '#7C3AED'
)
returns public.hogares language plpgsql security definer set search_path = public as $$
declare
  h public.hogares;
  v_email text;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  select email into v_email from auth.users where id = auth.uid();

  insert into public.hogares (nombre, codigo_invitacion, region, division_default)
  values (coalesce(nullif(p_nombre_hogar, ''), 'Hogar de ' || p_nombre_usuario),
          public.generar_codigo_invitacion(), p_region, p_division)
  returning * into h;

  insert into public.users (id, nombre, email, hogar_id, avatar_color)
  values (auth.uid(), p_nombre_usuario, v_email, h.id, p_avatar_color)
  on conflict (id) do update set nombre = excluded.nombre, hogar_id = excluded.hogar_id;

  perform public.crear_categorias_default(h.id);
  return h;
end $$;

-- Onboarding "unirse": acepta 'DIV·4821', 'DIV4821', 'div-4821' o '4821'.
create or replace function public.unirse_hogar(
  p_codigo text,
  p_nombre_usuario text,
  p_avatar_color text default '#EC4899'
)
returns public.hogares language plpgsql security definer set search_path = public as $$
declare
  h public.hogares;
  v_email text;
  v_codigo text;
  v_color text;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  v_codigo := 'DIV·' || right(regexp_replace(p_codigo, '[^0-9]', '', 'g'), 4);
  select * into h from public.hogares where codigo_invitacion = v_codigo;
  if h.id is null then raise exception 'Código de invitación inválido'; end if;

  select email into v_email from auth.users where id = auth.uid();
  -- Primer color de avatar que no use otro miembro del hogar.
  select c into v_color
  from unnest(array[p_avatar_color, '#7C3AED', '#EC4899', '#0EA5E9', '#F59E0B', '#10B981', '#EF4444']) with ordinality as t(c, i)
  where c not in (select avatar_color from public.users where hogar_id = h.id and id <> auth.uid())
  order by i limit 1;

  insert into public.users (id, nombre, email, hogar_id, avatar_color)
  values (auth.uid(), p_nombre_usuario, v_email, h.id, coalesce(v_color, p_avatar_color))
  on conflict (id) do update set nombre = excluded.nombre, hogar_id = excluded.hogar_id;
  return h;
end $$;

grant execute on function public.crear_hogar(text, text, text, text, text) to authenticated;
grant execute on function public.unirse_hogar(text, text, text) to authenticated;
grant execute on function public.mi_hogar_id() to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Row Level Security: cada usuario sólo ve los datos de su hogar
-- ─────────────────────────────────────────────────────────────

alter table public.hogares      enable row level security;
alter table public.users        enable row level security;
alter table public.gastos       enable row level security;
alter table public.metas        enable row level security;
alter table public.depositos    enable row level security;
alter table public.categorias   enable row level security;
alter table public.vencimientos enable row level security;

create policy hogares_select on public.hogares for select using (id = public.mi_hogar_id());
create policy hogares_update on public.hogares for update using (id = public.mi_hogar_id());

create policy users_select on public.users for select
  using (id = auth.uid() or hogar_id = public.mi_hogar_id());
create policy users_update on public.users for update using (id = auth.uid());

create policy gastos_all on public.gastos for all
  using (hogar_id = public.mi_hogar_id()) with check (hogar_id = public.mi_hogar_id());

create policy metas_all on public.metas for all
  using (hogar_id = public.mi_hogar_id()) with check (hogar_id = public.mi_hogar_id());

create policy depositos_all on public.depositos for all
  using (exists (select 1 from public.metas m where m.id = meta_id and m.hogar_id = public.mi_hogar_id()))
  with check (exists (select 1 from public.metas m where m.id = meta_id and m.hogar_id = public.mi_hogar_id()));

create policy categorias_all on public.categorias for all
  using (hogar_id = public.mi_hogar_id()) with check (hogar_id = public.mi_hogar_id());

create policy vencimientos_all on public.vencimientos for all
  using (hogar_id = public.mi_hogar_id()) with check (hogar_id = public.mi_hogar_id());

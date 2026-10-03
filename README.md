# Dividamos 💜

PWA de finanzas para hogares argentinos: registrá gastos, dividilos entre los miembros del hogar
(50/50, 60/40, 70/30), seguí metas de ahorro, el calendario de gastos y vencimientos, estadísticas
y el dólar del día.

**Stack:** Vite + React + TypeScript · Supabase (Auth + Postgres + RLS) · CSS propio (Inter, mobile-first 390px).

## Correr en local

```bash
npm install
npm run dev
```

Sin configurar nada arranca en **modo demo** (datos en `localStorage`) con el hogar de prueba:

| Usuario | Email | Contraseña |
|---|---|---|
| Lucas | lucas@dividamos.app | dividamos123 |
| Sara  | sara@dividamos.app  | dividamos123 |

Hogar "Casa de Lucas y Sara" · GBA · Banco Galicia · 50/50 · código **DIV·4821**.
Desde Perfil → "Restaurar datos de demo" se vuelve al estado inicial.

## Conectar Supabase

1. Creá un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor**, ejecutá en orden:
   - `supabase/migrations/001_schema.sql` (tablas, funciones `crear_hogar` / `unirse_hogar`, RLS)
   - `supabase/seed.sql` (opcional: crea a Lucas y Sara con el hogar DIV·4821 y datos de ejemplo)
3. En **Authentication → Providers → Email**, desactivá "Confirm email" si querés que el
   registro entre directo (si queda activo, la app avisa que hay que confirmar el mail).
4. Copiá `.env.example` a `.env.local` y completá `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
5. `npm run dev`.

## Base de datos

| Tabla | Campos |
|---|---|
| `users` | id (= auth.users.id), nombre, email, hogar_id, avatar_color |
| `hogares` | id, nombre, codigo_invitacion (`DIV·XXXX`, único), region, division_default, banco, created_at |
| `gastos` | id, hogar_id, monto, categoria, descripcion, quien_pago, division, fecha |
| `metas` | id, hogar_id, nombre, emoji, monto_objetivo, fecha_objetivo |
| `depositos` | id, meta_id, usuario_id, monto, fecha |
| `categorias` | id, hogar_id, nombre, emoji, activa (+ orden) |
| `vencimientos` | id, hogar_id, nombre, dia_del_mes, monto_estimado, activo |

- El código de invitación se genera solo al crear el hogar (`generar_codigo_invitacion()`).
- Al crear un hogar se cargan las 8 categorías por defecto (Super, Niños, Servicios, Salud, Hogar, Auto, Comida, Ropa).
- RLS: cada usuario sólo lee/escribe datos de su hogar. Unirse se hace vía RPC `unirse_hogar`
  (acepta `DIV·4821`, `DIV4821` o `4821`).

### Cómo se calcula el balance

La división `A/B` se aplica en el orden de los miembros (el que creó el hogar es el primero).
Cada gasto genera lo que "le corresponde" a cada uno; el balance es lo pagado menos lo que le
correspondía, y se salda con el mínimo de transferencias. Con más de 2 miembros se reparte en partes iguales.

## Pantallas

- **Inicio**: saludo, mes, avatares, total del mes con desglose por miembro, balance (quién le debe a quién), grid de categorías, últimos 4 gastos.
- **Agregar**: monto grande, categoría en chips, descripción, quién pagó, división, fecha.
- **Metas**: progreso por meta, depósitos, crear meta.
- **Calendario**: grilla mensual con puntos de gastos y vencimientos; tocá un día para ver sus gastos.
- **Estadísticas**: torta por categoría, barras de 6 meses, comparación entre miembros, IPC.
- **Noticias**: dólar oficial y blue ([dolarapi.com](https://dolarapi.com)), IPC, SMVM, AUH y noticias de economía (RSS de Ámbito / Infobae / Página12 vía rss2json).
- **Perfil**: datos del hogar (editables), código para compartir, miembros, categorías, vencimientos, cerrar sesión.

Calendario y Noticias se abren desde los accesos de Inicio.

## Indicadores "hardcodeados"

IPC, SMVM y AUH están en `src/data/indicadores.ts`. **Son valores de referencia: verificalos con
INDEC / Boletín Oficial / ANSES y actualizalos** cuando salga un dato nuevo.

## PWA

`public/manifest.webmanifest` + `public/sw.js` (app shell offline; Supabase y APIs externas nunca se cachean).
Instalable desde el navegador del celular ("Agregar a pantalla de inicio").

## Scripts

- `npm run dev`: desarrollo
- `npm run build`: typecheck + build de producción en `dist/`
- `npm run preview`: servir el build

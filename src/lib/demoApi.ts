/**
 * Implementación local (localStorage) de la API, para usar la app sin Supabase.
 * Viene precargada con el hogar de prueba de Lucas y Sara (DIV·4821).
 */
import type { Api } from './api'
import { normalizarCodigo, toISO } from './format'
import { AVATAR_COLORS, type Categoria, type Deposito, type Gasto, type Hogar, type Meta, type Usuario, type Vencimiento } from './types'

const KEY = 'dividamos-demo-v1'

interface Db {
  session: string | null
  passwords: Record<string, string> // email -> password
  authIds: Record<string, string> // email -> user id
  users: Usuario[]
  hogares: Hogar[]
  gastos: Gasto[]
  metas: Meta[]
  depositos: Deposito[]
  categorias: Categoria[]
  vencimientos: Vencimiento[]
}

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36))

const diasAtras = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return toISO(d)
}

export const CATEGORIAS_DEFAULT: [string, string][] = [
  ['Super', '🛒'],
  ['Niños', '🧸'],
  ['Servicios', '💡'],
  ['Salud', '💊'],
  ['Hogar', '🏠'],
  ['Auto', '🚗'],
  ['Comida', '🍕'],
  ['Ropa', '👕'],
]

const categoriasPara = (hogarId: string): Categoria[] =>
  CATEGORIAS_DEFAULT.map(([nombre, emoji], i) => ({ id: uid(), hogar_id: hogarId, nombre, emoji, activa: true, orden: i + 1 }))

function seed(): Db {
  const lucas = 'demo-lucas'
  const sara = 'demo-sara'
  const hogar = 'demo-hogar-4821'
  const creado = new Date()
  creado.setMonth(creado.getMonth() - 8)

  const g = (monto: number, categoria: string, descripcion: string, quien: string, fecha: string): Gasto => ({
    id: uid(),
    hogar_id: hogar,
    monto,
    categoria,
    descripcion,
    quien_pago: quien,
    division: '50/50',
    fecha,
    created_at: fecha + 'T12:00:00Z',
  })

  const gastos: Gasto[] = [
    g(48700, 'Super', 'Compra semanal Coto', lucas, diasAtras(0)),
    g(18500, 'Comida', 'Pedido de sushi', sara, diasAtras(1)),
    g(32900, 'Servicios', 'Edenor', lucas, diasAtras(2)),
    g(14200, 'Salud', 'Farmacia', sara, diasAtras(3)),
    g(65000, 'Auto', 'Nafta + lavado', lucas, diasAtras(5)),
    g(27400, 'Niños', 'Útiles del cole', sara, diasAtras(6)),
    g(39800, 'Ropa', 'Zapatillas', sara, diasAtras(8)),
    g(21600, 'Hogar', 'Ferretería', lucas, diasAtras(9)),
    g(56300, 'Super', 'Carrefour mensual', sara, diasAtras(11)),
    g(24800, 'Servicios', 'Internet Fibertel', sara, diasAtras(13)),
  ]
  // Meses anteriores: base mensual con inflación suave (determinístico).
  const base: [string, string, number, number][] = [
    ['Super', 'Compra mensual', 95000, 3],
    ['Servicios', 'Luz, gas y agua', 58000, 6],
    ['Comida', 'Delivery', 31000, 9],
    ['Auto', 'Nafta', 52000, 12],
    ['Salud', 'Prepaga copago', 22000, 15],
    ['Niños', 'Actividades', 36000, 18],
    ['Hogar', 'Limpieza', 19000, 21],
    ['Ropa', 'Ropa', 28000, 24],
  ]
  const hoy = new Date()
  for (let n = 1; n <= 5; n++) {
    base.forEach(([cat, desc, monto, dia], i) => {
      const f = new Date(hoy.getFullYear(), hoy.getMonth() - n, dia)
      const factor = (1 - 0.035 * n) * (0.92 + ((i * 7 + n * 13) % 17) / 100)
      gastos.push(g(Math.round((monto * factor) / 100) * 100, cat, desc, (n + i) % 2 === 0 ? lucas : sara, toISO(f)))
    })
  }

  const enMeses = (n: number) => {
    const d = new Date()
    d.setMonth(d.getMonth() + n)
    return toISO(d)
  }

  const metas: Meta[] = [
    { id: 'meta-1', hogar_id: hogar, nombre: 'Vacaciones en Bariloche', emoji: '🏔️', monto_objetivo: 1800000, fecha_objetivo: enMeses(5) },
    { id: 'meta-2', hogar_id: hogar, nombre: 'Fondo de emergencia', emoji: '🛟', monto_objetivo: 1200000, fecha_objetivo: enMeses(10) },
    { id: 'meta-3', hogar_id: hogar, nombre: 'Heladera nueva', emoji: '🧊', monto_objetivo: 950000, fecha_objetivo: enMeses(2) },
  ]
  const dep = (meta_id: string, usuario_id: string, monto: number, n: number): Deposito => ({ id: uid(), meta_id, usuario_id, monto, fecha: diasAtras(n) })

  return {
    session: null,
    passwords: { 'lucas@dividamos.app': 'dividamos123', 'sara@dividamos.app': 'dividamos123' },
    authIds: { 'lucas@dividamos.app': lucas, 'sara@dividamos.app': sara },
    users: [
      { id: lucas, nombre: 'Lucas', email: 'lucas@dividamos.app', hogar_id: hogar, avatar_color: '#7C3AED', created_at: creado.toISOString() },
      { id: sara, nombre: 'Sara', email: 'sara@dividamos.app', hogar_id: hogar, avatar_color: '#EC4899', created_at: new Date(creado.getTime() + 60000).toISOString() },
    ],
    hogares: [
      { id: hogar, nombre: 'Casa de Lucas y Sara', codigo_invitacion: 'DIV·4821', region: 'GBA', division_default: '50/50', banco: 'Galicia', created_at: creado.toISOString() },
    ],
    gastos,
    metas,
    depositos: [
      dep('meta-1', lucas, 250000, 60),
      dep('meta-1', sara, 250000, 30),
      dep('meta-1', lucas, 150000, 4),
      dep('meta-2', sara, 300000, 45),
      dep('meta-2', lucas, 180000, 10),
      dep('meta-3', sara, 420000, 20),
      dep('meta-3', lucas, 300000, 2),
    ],
    categorias: categoriasPara(hogar),
    vencimientos: [
      { id: uid(), hogar_id: hogar, nombre: 'Alquiler', dia_del_mes: 5, monto_estimado: 450000, activo: true },
      { id: uid(), hogar_id: hogar, nombre: 'Expensas', dia_del_mes: 10, monto_estimado: 120000, activo: true },
      { id: uid(), hogar_id: hogar, nombre: 'Tarjeta Galicia', dia_del_mes: 12, monto_estimado: 380000, activo: true },
      { id: uid(), hogar_id: hogar, nombre: 'Edenor', dia_del_mes: 18, monto_estimado: 33000, activo: true },
      { id: uid(), hogar_id: hogar, nombre: 'Internet', dia_del_mes: 22, monto_estimado: 25000, activo: true },
    ],
  }
}

function load(): Db {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as Db
  } catch {
    /* storage no disponible */
  }
  const db = seed()
  save(db)
  return db
}

function save(db: Db) {
  try {
    localStorage.setItem(KEY, JSON.stringify(db))
  } catch {
    /* storage no disponible: la demo sigue en memoria */
  }
}

export function resetDemo() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* noop */
  }
}

export function createDemoApi(): Api {
  let db = load()
  const listeners = new Set<(id: string | null) => void>()
  const commit = () => save(db)
  const delay = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 60))
  const me = () => {
    if (!db.session) throw new Error('No autenticado')
    return db.session
  }
  const emit = () => listeners.forEach((l) => l(db.session))
  const generarCodigo = () => {
    let c: string
    do c = `DIV·${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`
    while (db.hogares.some((h) => h.codigo_invitacion === c))
    return c
  }
  const upsertPerfil = (hogarId: string, nombre: string, avatarColor: string) => {
    const id = me()
    const email = Object.entries(db.authIds).find(([, v]) => v === id)?.[0] ?? ''
    const existing = db.users.find((u) => u.id === id)
    if (existing) Object.assign(existing, { nombre, hogar_id: hogarId })
    else {
      const usados = db.users.filter((u) => u.hogar_id === hogarId).map((u) => u.avatar_color)
      const color = [avatarColor, ...AVATAR_COLORS].find((c) => !usados.includes(c)) ?? avatarColor
      db.users.push({ id, nombre, email, hogar_id: hogarId, avatar_color: color, created_at: new Date().toISOString() })
    }
  }

  return {
    mode: 'demo',

    async getSessionUserId() {
      db = load()
      return delay(db.session)
    },
    onAuthChange(cb) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    async signIn(email, password) {
      const e = email.trim().toLowerCase()
      if (db.passwords[e] !== password) throw new Error('Email o contraseña incorrectos')
      db.session = db.authIds[e]
      commit()
      emit()
      await delay(null)
    },
    async signUp(email, password) {
      const e = email.trim().toLowerCase()
      if (db.passwords[e]) throw new Error('Ya existe una cuenta con ese email')
      if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres')
      db.passwords[e] = password
      db.authIds[e] = uid()
      db.session = db.authIds[e]
      commit()
      emit()
      return delay({ needsConfirmation: false })
    },
    async signOut() {
      db.session = null
      commit()
      emit()
    },

    async getPerfil(userId) {
      return delay(db.users.find((u) => u.id === userId) ?? null)
    },
    async updatePerfil(userId, patch) {
      Object.assign(db.users.find((u) => u.id === userId)!, patch)
      commit()
    },
    async crearHogar({ nombreUsuario, region, division, avatarColor }) {
      const h: Hogar = {
        id: uid(),
        nombre: `Hogar de ${nombreUsuario}`,
        codigo_invitacion: generarCodigo(),
        region: region as Hogar['region'],
        division_default: division,
        banco: null,
        created_at: new Date().toISOString(),
      }
      db.hogares.push(h)
      db.categorias.push(...categoriasPara(h.id))
      upsertPerfil(h.id, nombreUsuario, avatarColor)
      commit()
      return delay(h)
    },
    async unirseHogar({ codigo, nombreUsuario, avatarColor }) {
      const c = normalizarCodigo(codigo)
      const h = db.hogares.find((x) => x.codigo_invitacion === c)
      if (!h) throw new Error('Código de invitación inválido')
      upsertPerfil(h.id, nombreUsuario, avatarColor)
      commit()
      return delay(h)
    },
    async getHogar(id) {
      const h = db.hogares.find((x) => x.id === id)
      if (!h) throw new Error('Hogar no encontrado')
      return delay(h)
    },
    async updateHogar(id, patch) {
      Object.assign(db.hogares.find((x) => x.id === id)!, patch)
      commit()
    },
    async getMiembros(hogarId) {
      return delay(db.users.filter((u) => u.hogar_id === hogarId).sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? '')))
    },

    async listGastos(hogarId, desde, hasta) {
      return delay(
        db.gastos
          .filter((x) => x.hogar_id === hogarId && (!desde || x.fecha >= desde) && (!hasta || x.fecha <= hasta))
          .sort((a, b) => b.fecha.localeCompare(a.fecha) || (b.created_at ?? '').localeCompare(a.created_at ?? ''))
      )
    },
    async addGasto(g) {
      const row: Gasto = { ...g, id: uid(), created_at: new Date().toISOString() }
      db.gastos.push(row)
      commit()
      return delay(row)
    },
    async deleteGasto(id) {
      db.gastos = db.gastos.filter((x) => x.id !== id)
      commit()
    },

    async listCategorias(hogarId) {
      return delay(db.categorias.filter((c) => c.hogar_id === hogarId).sort((a, b) => (a.orden ?? 99) - (b.orden ?? 99)))
    },
    async addCategoria(c) {
      if (db.categorias.some((x) => x.hogar_id === c.hogar_id && x.nombre.toLowerCase() === c.nombre.toLowerCase()))
        throw new Error('Ya existe una categoría con ese nombre')
      const row = { ...c, id: uid() }
      db.categorias.push(row)
      commit()
      return delay(row)
    },
    async updateCategoria(id, patch) {
      Object.assign(db.categorias.find((c) => c.id === id)!, patch)
      commit()
    },

    async listMetas(hogarId) {
      return delay(db.metas.filter((m) => m.hogar_id === hogarId).sort((a, b) => (a.fecha_objetivo ?? '9').localeCompare(b.fecha_objetivo ?? '9')))
    },
    async addMeta(m) {
      const row = { ...m, id: uid() }
      db.metas.push(row)
      commit()
      return delay(row)
    },
    async deleteMeta(id) {
      db.metas = db.metas.filter((m) => m.id !== id)
      db.depositos = db.depositos.filter((d) => d.meta_id !== id)
      commit()
    },
    async listDepositos(metaIds) {
      return delay(db.depositos.filter((d) => metaIds.includes(d.meta_id)).sort((a, b) => b.fecha.localeCompare(a.fecha)))
    },
    async addDeposito(d) {
      const row = { ...d, id: uid() }
      db.depositos.push(row)
      commit()
      return delay(row)
    },

    async listVencimientos(hogarId) {
      return delay(db.vencimientos.filter((v) => v.hogar_id === hogarId).sort((a, b) => a.dia_del_mes - b.dia_del_mes))
    },
    async addVencimiento(v) {
      const row = { ...v, id: uid() }
      db.vencimientos.push(row)
      commit()
      return delay(row)
    },
    async updateVencimiento(id, patch) {
      Object.assign(db.vencimientos.find((v) => v.id === id)!, patch)
      commit()
    },
    async deleteVencimiento(id) {
      db.vencimientos = db.vencimientos.filter((v) => v.id !== id)
      commit()
    },
  }
}

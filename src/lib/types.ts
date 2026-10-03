export type Division = '50/50' | '60/40' | '70/30'
export type DivisionGasto = Division | '40/60' | '30/70' | '100/0' | '0/100'

export const REGIONES = ['CABA', 'GBA', 'Córdoba', 'Rosario', 'Mendoza', 'Tucumán', 'Otra'] as const
export type Region = (typeof REGIONES)[number]

export const BANCOS = ['Galicia', 'Santander', 'BBVA', 'Macro', 'Nación', 'HSBC', 'Brubank', 'Naranja X', 'Otro'] as const
export type Banco = (typeof BANCOS)[number]

export const DIVISIONES: Division[] = ['50/50', '60/40', '70/30']

export const AVATAR_COLORS = ['#7C3AED', '#EC4899', '#0EA5E9', '#F59E0B', '#10B981', '#EF4444']

export interface Usuario {
  id: string
  nombre: string
  email: string
  hogar_id: string | null
  avatar_color: string
  created_at?: string
}

export interface Hogar {
  id: string
  nombre: string
  codigo_invitacion: string
  region: Region
  division_default: Division
  banco: Banco | null
  created_at: string
}

export interface Gasto {
  id: string
  hogar_id: string
  monto: number
  categoria: string
  descripcion: string | null
  quien_pago: string
  division: DivisionGasto
  fecha: string // YYYY-MM-DD
  created_at?: string
}

export interface Meta {
  id: string
  hogar_id: string
  nombre: string
  emoji: string
  monto_objetivo: number
  fecha_objetivo: string | null
}

export interface Deposito {
  id: string
  meta_id: string
  usuario_id: string
  monto: number
  fecha: string
}

export interface Categoria {
  id: string
  hogar_id: string
  nombre: string
  emoji: string
  activa: boolean
  orden?: number
}

export interface Vencimiento {
  id: string
  hogar_id: string
  nombre: string
  dia_del_mes: number
  monto_estimado: number | null
  activo: boolean
}

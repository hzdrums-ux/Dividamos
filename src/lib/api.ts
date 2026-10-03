import type { Categoria, Deposito, Division, Gasto, Hogar, Meta, Usuario, Vencimiento } from './types'

export interface Api {
  mode: 'supabase' | 'demo'

  // Auth
  getSessionUserId(): Promise<string | null>
  onAuthChange(cb: (userId: string | null) => void): () => void
  signIn(email: string, password: string): Promise<void>
  signUp(email: string, password: string): Promise<{ needsConfirmation: boolean }>
  signOut(): Promise<void>

  // Perfil / hogar
  getPerfil(userId: string): Promise<Usuario | null>
  updatePerfil(userId: string, patch: Partial<Pick<Usuario, 'nombre' | 'avatar_color'>>): Promise<void>
  crearHogar(p: { nombreUsuario: string; region: string; division: Division; avatarColor: string }): Promise<Hogar>
  unirseHogar(p: { codigo: string; nombreUsuario: string; avatarColor: string }): Promise<Hogar>
  getHogar(id: string): Promise<Hogar>
  updateHogar(id: string, patch: Partial<Omit<Hogar, 'id' | 'codigo_invitacion' | 'created_at'>>): Promise<void>
  getMiembros(hogarId: string): Promise<Usuario[]>

  // Gastos
  listGastos(hogarId: string, desde?: string, hasta?: string): Promise<Gasto[]>
  addGasto(g: Omit<Gasto, 'id' | 'created_at'>): Promise<Gasto>
  deleteGasto(id: string): Promise<void>

  // Categorías
  listCategorias(hogarId: string): Promise<Categoria[]>
  addCategoria(c: Omit<Categoria, 'id'>): Promise<Categoria>
  updateCategoria(id: string, patch: Partial<Pick<Categoria, 'nombre' | 'emoji' | 'activa'>>): Promise<void>

  // Metas
  listMetas(hogarId: string): Promise<Meta[]>
  addMeta(m: Omit<Meta, 'id'>): Promise<Meta>
  deleteMeta(id: string): Promise<void>
  listDepositos(metaIds: string[]): Promise<Deposito[]>
  addDeposito(d: Omit<Deposito, 'id'>): Promise<Deposito>

  // Vencimientos
  listVencimientos(hogarId: string): Promise<Vencimiento[]>
  addVencimiento(v: Omit<Vencimiento, 'id'>): Promise<Vencimiento>
  updateVencimiento(id: string, patch: Partial<Omit<Vencimiento, 'id' | 'hogar_id'>>): Promise<void>
  deleteVencimiento(id: string): Promise<void>
}

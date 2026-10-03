import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Api } from './api'
import type { Deposito, Gasto, Meta, Vencimiento } from './types'

const num = <T extends object>(row: T, keys: (keyof T)[]): T => {
  const out = { ...row }
  for (const k of keys) if (out[k] != null) (out as Record<string, unknown>)[k as string] = Number(out[k])
  return out
}

// Sin tipos generados de la DB: los rows se tipan según la interfaz Api.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function check(res: { data: any; error: { message: string } | null }): any {
  if (res.error) throw new Error(traducirError(res.error.message))
  return res.data
}

function traducirError(msg: string): string {
  if (/Invalid login credentials/i.test(msg)) return 'Email o contraseña incorrectos'
  if (/already registered/i.test(msg)) return 'Ya existe una cuenta con ese email'
  if (/Password should be at least/i.test(msg)) return 'La contraseña debe tener al menos 6 caracteres'
  if (/Email not confirmed/i.test(msg)) return 'Confirmá tu email antes de ingresar'
  if (/Código de invitación inválido/i.test(msg)) return 'Código de invitación inválido'
  return msg
}

export function createSupabaseApi(url: string, key: string): Api {
  const sb: SupabaseClient = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } })

  return {
    mode: 'supabase',

    async getSessionUserId() {
      const { data } = await sb.auth.getSession()
      return data.session?.user.id ?? null
    },
    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange((_e, session) => cb(session?.user.id ?? null))
      return () => data.subscription.unsubscribe()
    },
    async signIn(email, password) {
      const { error } = await sb.auth.signInWithPassword({ email, password })
      if (error) throw new Error(traducirError(error.message))
    },
    async signUp(email, password) {
      const { data, error } = await sb.auth.signUp({ email, password })
      if (error) throw new Error(traducirError(error.message))
      return { needsConfirmation: !data.session }
    },
    async signOut() {
      await sb.auth.signOut()
    },

    async getPerfil(userId) {
      return check(await sb.from('users').select('*').eq('id', userId).maybeSingle())
    },
    async updatePerfil(userId, patch) {
      check(await sb.from('users').update(patch).eq('id', userId))
    },
    async crearHogar({ nombreUsuario, region, division, avatarColor }) {
      return check(
        await sb.rpc('crear_hogar', {
          p_nombre_usuario: nombreUsuario,
          p_region: region,
          p_division: division,
          p_avatar_color: avatarColor,
        })
      )
    },
    async unirseHogar({ codigo, nombreUsuario, avatarColor }) {
      return check(
        await sb.rpc('unirse_hogar', { p_codigo: codigo, p_nombre_usuario: nombreUsuario, p_avatar_color: avatarColor })
      )
    },
    async getHogar(id) {
      return check(await sb.from('hogares').select('*').eq('id', id).single())
    },
    async updateHogar(id, patch) {
      check(await sb.from('hogares').update(patch).eq('id', id))
    },
    async getMiembros(hogarId) {
      return check(await sb.from('users').select('*').eq('hogar_id', hogarId).order('created_at'))
    },

    async listGastos(hogarId, desde, hasta) {
      let q = sb.from('gastos').select('*').eq('hogar_id', hogarId)
      if (desde) q = q.gte('fecha', desde)
      if (hasta) q = q.lte('fecha', hasta)
      const rows = check(await q.order('fecha', { ascending: false }).order('created_at', { ascending: false }))
      return (rows as Gasto[]).map((r) => num(r, ['monto']))
    },
    async addGasto(g) {
      return num(check(await sb.from('gastos').insert(g).select().single()) as Gasto, ['monto'])
    },
    async deleteGasto(id) {
      check(await sb.from('gastos').delete().eq('id', id))
    },

    async listCategorias(hogarId) {
      return check(await sb.from('categorias').select('*').eq('hogar_id', hogarId).order('orden').order('nombre'))
    },
    async addCategoria(c) {
      return check(await sb.from('categorias').insert(c).select().single())
    },
    async updateCategoria(id, patch) {
      check(await sb.from('categorias').update(patch).eq('id', id))
    },

    async listMetas(hogarId) {
      const rows = check(await sb.from('metas').select('*').eq('hogar_id', hogarId).order('fecha_objetivo'))
      return (rows as Meta[]).map((r) => num(r, ['monto_objetivo']))
    },
    async addMeta(m) {
      return num(check(await sb.from('metas').insert(m).select().single()) as Meta, ['monto_objetivo'])
    },
    async deleteMeta(id) {
      check(await sb.from('metas').delete().eq('id', id))
    },
    async listDepositos(metaIds) {
      if (metaIds.length === 0) return []
      const rows = check(await sb.from('depositos').select('*').in('meta_id', metaIds).order('fecha', { ascending: false }))
      return (rows as Deposito[]).map((r) => num(r, ['monto']))
    },
    async addDeposito(d) {
      return num(check(await sb.from('depositos').insert(d).select().single()) as Deposito, ['monto'])
    },

    async listVencimientos(hogarId) {
      const rows = check(await sb.from('vencimientos').select('*').eq('hogar_id', hogarId).order('dia_del_mes'))
      return (rows as Vencimiento[]).map((r) => num(r, ['monto_estimado']))
    },
    async addVencimiento(v) {
      return num(check(await sb.from('vencimientos').insert(v).select().single()) as Vencimiento, ['monto_estimado'])
    },
    async updateVencimiento(id, patch) {
      check(await sb.from('vencimientos').update(patch).eq('id', id))
    },
    async deleteVencimiento(id) {
      check(await sb.from('vencimientos').delete().eq('id', id))
    },
  }
}

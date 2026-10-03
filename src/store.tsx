import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { api } from './lib'
import { toISO } from './lib/format'
import type { Categoria, Gasto, Hogar, Usuario } from './lib/types'

type Status = 'loading' | 'signed-out' | 'onboarding' | 'ready'

interface Store {
  status: Status
  userId: string | null
  perfil: Usuario | null
  hogar: Hogar | null
  miembros: Usuario[]
  categorias: Categoria[]
  /** Gastos de los últimos 6 meses (incluye el actual). */
  gastos: Gasto[]
  refresh: () => Promise<void>
  refreshGastos: () => Promise<void>
  setHogar: (h: Hogar) => void
  toast: (msg: string) => void
}

const Ctx = createContext<Store | null>(null)

export const desdeSeisMeses = () => {
  const d = new Date()
  return toISO(new Date(d.getFullYear(), d.getMonth() - 5, 1))
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading')
  const [userId, setUserId] = useState<string | null>(null)
  const [perfil, setPerfil] = useState<Usuario | null>(null)
  const [hogar, setHogar] = useState<Hogar | null>(null)
  const [miembros, setMiembros] = useState<Usuario[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const loadedFor = useRef<string | null | undefined>(undefined)
  const seq = useRef(0)

  const load = useCallback(async (uid: string | null) => {
    const mine = ++seq.current
    const stale = () => mine !== seq.current
    loadedFor.current = uid
    setUserId(uid)
    if (!uid) {
      setPerfil(null)
      setHogar(null)
      setStatus('signed-out')
      return
    }
    try {
      const p = await api.getPerfil(uid)
      if (stale()) return
      setPerfil(p)
      if (!p?.hogar_id) {
        setStatus('onboarding')
        return
      }
      const [h, m, c, g] = await Promise.all([
        api.getHogar(p.hogar_id),
        api.getMiembros(p.hogar_id),
        api.listCategorias(p.hogar_id),
        api.listGastos(p.hogar_id, desdeSeisMeses()),
      ])
      if (stale()) return
      setHogar(h)
      setMiembros(m)
      setCategorias(c)
      setGastos(g)
      setStatus('ready')
    } catch (e) {
      console.error(e)
      if (!stale()) setStatus('onboarding')
    }
  }, [])

  useEffect(() => {
    let alive = true
    api.getSessionUserId().then((id) => {
      if (alive) load(id)
    })
    const off = api.onAuthChange((id) => {
      // Evita recargar en refrescos de token del mismo usuario.
      if (loadedFor.current !== id) load(id)
    })
    return () => {
      alive = false
      off()
    }
  }, [load])

  // Usa el ref: después de un signUp el userId del render actual todavía puede ser null.
  const refresh = useCallback(() => load(loadedFor.current ?? null), [load])

  const refreshGastos = useCallback(async () => {
    if (!hogar) return
    setGastos(await api.listGastos(hogar.id, desdeSeisMeses()))
  }, [hogar])

  const toast = useCallback((msg: string) => {
    setToastMsg(msg)
    window.setTimeout(() => setToastMsg((m) => (m === msg ? null : m)), 2400)
  }, [])

  const value = useMemo<Store>(
    () => ({ status, userId, perfil, hogar, miembros, categorias, gastos, refresh, refreshGastos, setHogar, toast }),
    [status, userId, perfil, hogar, miembros, categorias, gastos, refresh, refreshGastos, toast]
  )

  return (
    <Ctx.Provider value={value}>
      {children}
      {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
    </Ctx.Provider>
  )
}

export function useStore() {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore fuera de StoreProvider')
  return s
}

/** Para pantallas que sólo se renderizan con status === 'ready'. */
export function useHogar() {
  const s = useStore()
  return { ...s, hogar: s.hogar!, perfil: s.perfil! }
}

export function useCategoriaEmoji() {
  const { categorias } = useStore()
  return useCallback((nombre: string) => categorias.find((c) => c.nombre === nombre)?.emoji ?? '💸', [categorias])
}

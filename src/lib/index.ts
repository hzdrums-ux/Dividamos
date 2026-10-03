import type { Api } from './api'
import { createDemoApi } from './demoApi'
import { createSupabaseApi } from './supabaseApi'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Supabase si hay credenciales en el .env; si no, modo demo local. */
export const api: Api = url && key ? createSupabaseApi(url, key) : createDemoApi()

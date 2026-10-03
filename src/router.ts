import { useCallback, useEffect, useState } from 'react'

export type Route = 'inicio' | 'agregar' | 'metas' | 'calendario' | 'estadisticas' | 'noticias' | 'perfil'

const ROUTES: Route[] = ['inicio', 'agregar', 'metas', 'calendario', 'estadisticas', 'noticias', 'perfil']

function read(): Route {
  const h = window.location.hash.replace(/^#\/?/, '') as Route
  return ROUTES.includes(h) ? h : 'inicio'
}

/** Router mínimo por hash: soporta el botón "atrás" del celular. */
export function useRoute() {
  const [route, setRoute] = useState<Route>(read)
  useEffect(() => {
    const on = () => {
      setRoute(read())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  const go = useCallback((r: Route) => {
    if (r === read()) return
    window.location.hash = `/${r}`
  }, [])
  const back = useCallback(() => {
    if (window.history.length > 1) window.history.back()
    else window.location.hash = '/inicio'
  }, [])
  return { route, go, back }
}

import { BottomNav } from './components/BottomNav'
import { Logo } from './components/Icon'
import { useRoute } from './router'
import { AgregarGasto } from './screens/AgregarGasto'
import { Auth } from './screens/Auth'
import { Calendario } from './screens/Calendario'
import { Estadisticas } from './screens/Estadisticas'
import { Inicio } from './screens/Inicio'
import { Metas } from './screens/Metas'
import { Noticias } from './screens/Noticias'
import { Perfil } from './screens/Perfil'
import { useStore } from './store'

export function App() {
  const { status } = useStore()
  const { route, go, back } = useRoute()

  if (status === 'loading') {
    return (
      <div className="app" style={{ display: 'grid', placeItems: 'center', minHeight: '100dvh' }}>
        <span className="brand-mark" style={{ width: 64, height: 64, borderRadius: 20 }}>
          <Logo size={36} />
        </span>
      </div>
    )
  }

  if (status !== 'ready') {
    return (
      <div className="app">
        <Auth />
      </div>
    )
  }

  const navRoute = route === 'calendario' || route === 'noticias' ? 'inicio' : route

  return (
    <div className="app">
      {route === 'inicio' && <Inicio go={go} />}
      {route === 'agregar' && <AgregarGasto onDone={() => go('inicio')} onCancel={back} />}
      {route === 'metas' && <Metas />}
      {route === 'calendario' && <Calendario onBack={back} />}
      {route === 'estadisticas' && <Estadisticas />}
      {route === 'noticias' && <Noticias onBack={back} />}
      {route === 'perfil' && <Perfil />}
      <BottomNav current={navRoute} go={go} />
    </div>
  )
}

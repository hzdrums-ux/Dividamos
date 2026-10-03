import type { Route } from '../router'
import { Icon } from './Icon'

const ITEMS: { route: Route; label: string; icon: string }[] = [
  { route: 'inicio', label: 'Inicio', icon: 'home' },
  { route: 'agregar', label: 'Agregar', icon: 'plus' },
  { route: 'metas', label: 'Metas', icon: 'target' },
  { route: 'estadisticas', label: 'Estadísticas', icon: 'chart' },
  { route: 'perfil', label: 'Perfil', icon: 'user' },
]

export function BottomNav({ current, go }: { current: Route; go: (r: Route) => void }) {
  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      {ITEMS.map((it) =>
        it.route === 'agregar' ? (
          <button key={it.route} className="nav-item" onClick={() => go('agregar')} aria-label="Agregar gasto">
            <span className="nav-add">
              <Icon name="plus" size={26} stroke={2.6} />
            </span>
          </button>
        ) : (
          <button
            key={it.route}
            className={`nav-item ${current === it.route ? 'active' : ''}`}
            onClick={() => go(it.route)}
            aria-current={current === it.route ? 'page' : undefined}
          >
            <Icon name={it.icon} size={23} stroke={current === it.route ? 2.4 : 2} />
            {it.label}
          </button>
        )
      )}
    </nav>
  )
}

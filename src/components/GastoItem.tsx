import { fechaRelativa, pesos } from '../lib/format'
import type { Gasto, Usuario } from '../lib/types'
import { useCategoriaEmoji } from '../store'
import { Avatar } from './Avatar'

export function GastoItem({ gasto, miembros, onClick }: { gasto: Gasto; miembros: Usuario[]; onClick?: () => void }) {
  const emoji = useCategoriaEmoji()
  const quien = miembros.find((m) => m.id === gasto.quien_pago)
  return (
    <div className="list-item" onClick={onClick} role={onClick ? 'button' : undefined} style={onClick ? { cursor: 'pointer' } : undefined}>
      <span className="cat-icon">{emoji(gasto.categoria)}</span>
      <div className="grow">
        <div className="title ellipsis">{gasto.descripcion || gasto.categoria}</div>
        <div className="meta">
          {quien && <Avatar user={quien} size="sm" />}
          <span className="ellipsis">
            {quien?.nombre ?? 'Ex miembro'} · {fechaRelativa(gasto.fecha)}
          </span>
        </div>
      </div>
      <div className="amount num">{pesos(gasto.monto)}</div>
    </div>
  )
}

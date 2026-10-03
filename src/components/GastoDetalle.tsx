import { useState } from 'react'
import { api } from '../lib'
import { fechaLarga, pesos } from '../lib/format'
import { shares } from '../lib/finanzas'
import type { Gasto } from '../lib/types'
import { useCategoriaEmoji, useHogar } from '../store'
import { Avatar } from './Avatar'
import { Icon } from './Icon'
import { Sheet } from './Sheet'

export function GastoDetalle({ gasto, onClose, onDeleted }: { gasto: Gasto | null; onClose: () => void; onDeleted?: () => void }) {
  const { miembros, refreshGastos, toast } = useHogar()
  const emoji = useCategoriaEmoji()
  const [borrando, setBorrando] = useState(false)
  if (!gasto) return null
  const quien = miembros.find((m) => m.id === gasto.quien_pago)
  const parts = shares(gasto.division, miembros)

  const borrar = async () => {
    if (!confirm('¿Borrar este gasto?')) return
    setBorrando(true)
    try {
      await api.deleteGasto(gasto.id)
      await refreshGastos()
      toast('Gasto borrado')
      onDeleted?.()
      onClose()
    } finally {
      setBorrando(false)
    }
  }

  return (
    <Sheet open onClose={onClose}>
      <div className="center stack" style={{ alignItems: 'center', gap: 6 }}>
        <span className="cat-icon" style={{ width: 60, height: 60, fontSize: 30, borderRadius: 18 }}>{emoji(gasto.categoria)}</span>
        <div className="h2" style={{ marginTop: 8 }}>{gasto.descripcion || gasto.categoria}</div>
        <div className="muted small">{gasto.categoria} · {fechaLarga(gasto.fecha)}</div>
        <div className="num" style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.03em', margin: '6px 0 4px' }}>{pesos(gasto.monto)}</div>
      </div>
      <div className="list" style={{ marginTop: 16 }}>
        <div className="list-item">
          <span className="muted grow">Pagó</span>
          <Avatar user={quien} size="sm" />
          <b>{quien?.nombre ?? '—'}</b>
        </div>
        <div className="list-item">
          <span className="muted grow">División</span>
          <b>{gasto.division}</b>
        </div>
        {miembros.map((m, i) => (
          <div className="list-item" key={m.id}>
            <span className="muted grow">Le corresponde a {m.nombre}</span>
            <b className="num">{pesos(gasto.monto * (parts[i] ?? 0))}</b>
          </div>
        ))}
      </div>
      <button className="btn danger" style={{ marginTop: 16 }} onClick={borrar} disabled={borrando}>
        <Icon name="trash" size={18} /> {borrando ? 'Borrando…' : 'Borrar gasto'}
      </button>
    </Sheet>
  )
}

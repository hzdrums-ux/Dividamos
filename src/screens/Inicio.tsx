import { useMemo, useState } from 'react'
import { Avatar, AvatarStack } from '../components/Avatar'
import { GastoItem } from '../components/GastoItem'
import { Icon } from '../components/Icon'
import { GastoDetalle } from '../components/GastoDetalle'
import { calcularBalance } from '../lib/finanzas'
import { inicioMes, mesAnio, pesos } from '../lib/format'
import { setCategoriaPreset } from '../lib/preset'
import type { Gasto } from '../lib/types'
import type { Route } from '../router'
import { useHogar } from '../store'

export function Inicio({ go }: { go: (r: Route) => void }) {
  const { perfil, hogar, miembros, gastos, categorias } = useHogar()
  const [detalle, setDetalle] = useState<Gasto | null>(null)

  const desde = inicioMes()
  const delMes = useMemo(() => gastos.filter((g) => g.fecha >= desde), [gastos, desde])
  const balance = useMemo(() => calcularBalance(delMes, miembros), [delMes, miembros])
  const porCategoria = useMemo(() => {
    const m = new Map<string, number>()
    delMes.forEach((g) => m.set(g.categoria, (m.get(g.categoria) ?? 0) + g.monto))
    return m
  }, [delMes])
  const activas = categorias.filter((c) => c.activa).slice(0, 8)
  const nombre = (id: string) => miembros.find((m) => m.id === id)

  return (
    <div className="screen">
      {/* Header */}
      <header className="topbar" style={{ alignItems: 'flex-start' }}>
        <div>
          <h1 className="h1">Hola {perfil.nombre}! 👋</h1>
          <p className="muted small" style={{ marginTop: 2 }}>{mesAnio(new Date())}</p>
        </div>
        <button onClick={() => go('perfil')} aria-label="Miembros del hogar">
          <AvatarStack users={miembros} />
        </button>
      </header>

      {/* Card violeta: total del mes */}
      <section className="hero">
        <div className="label">Gastos del hogar este mes</div>
        <div className="amount num">{pesos(balance.total)}</div>
        <div className="split">
          <div className="bar">
            {miembros.map((m) => (
              <span
                key={m.id}
                style={{
                  width: balance.total ? `${(balance.pagado[m.id] / balance.total) * 100}%` : `${100 / miembros.length}%`,
                  background: m.id === miembros[0]?.id ? '#fff' : 'rgba(255,255,255,0.55)',
                }}
              />
            ))}
          </div>
          {miembros.map((m) => (
            <div className="who" key={m.id}>
              <Avatar user={m} size="sm" />
              <span className="grow">{m.id === perfil.id ? `${m.nombre} (vos)` : m.nombre} pagó</span>
              <b className="num">{pesos(balance.pagado[m.id] ?? 0)}</b>
            </div>
          ))}
        </div>
      </section>

      {/* Balance */}
      <section className="card" style={{ marginTop: 14 }}>
        <div className="card-title">
          <h2 className="h3">Balance del mes</h2>
          <span className="badge violet">División {hogar.division_default}</span>
        </div>
        {balance.deudas.length === 0 ? (
          <div className="row">
            <span className="cat-icon" style={{ background: 'var(--success-bg)' }}>✅</span>
            <div>
              <div className="bold">Están al día</div>
              <div className="small muted">Nadie le debe nada a nadie.</div>
            </div>
          </div>
        ) : (
          <div className="stack">
            {balance.deudas.map((d) => {
              const de = nombre(d.de)
              const a = nombre(d.a)
              const soyDeudor = d.de === perfil.id
              const soyAcreedor = d.a === perfil.id
              return (
                <div key={d.de + d.a} className="balance">
                  <Avatar user={de} />
                  <Icon name="arrowRight" size={18} className="arrow" />
                  <Avatar user={a} />
                  <div className="grow">
                    <div className="small muted">
                      {soyDeudor ? `Le debés a ${a?.nombre}` : soyAcreedor ? `${de?.nombre} te debe` : `${de?.nombre} le debe a ${a?.nombre}`}
                    </div>
                    <div className="h2 num" style={{ color: soyDeudor ? 'var(--danger)' : soyAcreedor ? 'var(--success)' : undefined }}>
                      {pesos(d.monto)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <div className="quick-links">
        <button className="quick-link" onClick={() => go('calendario')}>
          <span className="ql-icon"><Icon name="calendar" size={20} /></span>
          <span>
            <span className="bold small" style={{ display: 'block' }}>Calendario</span>
            <span className="xs muted">Gastos por día</span>
          </span>
        </button>
        <button className="quick-link" onClick={() => go('noticias')}>
          <span className="ql-icon"><Icon name="dollar" size={20} /></span>
          <span>
            <span className="bold small" style={{ display: 'block' }}>Dólar y noticias</span>
            <span className="xs muted">Oficial, blue, IPC</span>
          </span>
        </button>
      </div>

      {/* Categorías */}
      <div className="section-title">
        <h2 className="h2">Categorías</h2>
        <button className="link" onClick={() => go('estadisticas')}>Ver todo</button>
      </div>
      <div className="cat-grid">
        {activas.map((c) => (
          <button
            key={c.id}
            className="cat-tile"
            onClick={() => {
              setCategoriaPreset(c.nombre)
              go('agregar')
            }}
          >
            <span className="cat-icon">{c.emoji}</span>
            <span className="name ellipsis" style={{ maxWidth: '100%' }}>{c.nombre}</span>
            <span className="total num">{porCategoria.get(c.nombre) ? pesos(porCategoria.get(c.nombre)!) : '—'}</span>
          </button>
        ))}
      </div>

      {/* Últimos gastos */}
      <div className="section-title">
        <h2 className="h2">Últimos gastos</h2>
        <button className="link" onClick={() => go('calendario')}>Ver todos</button>
      </div>
      <div className="list">
        {gastos.length === 0 ? (
          <div className="empty">
            <span className="emoji">🧾</span>
            Todavía no cargaron gastos.
            <br />
            <button className="link" style={{ marginTop: 8 }} onClick={() => go('agregar')}>Agregar el primero</button>
          </div>
        ) : (
          gastos.slice(0, 4).map((g) => <GastoItem key={g.id} gasto={g} miembros={miembros} onClick={() => setDetalle(g)} />)
        )}
      </div>

      <GastoDetalle gasto={detalle} onClose={() => setDetalle(null)} />
    </div>
  )
}

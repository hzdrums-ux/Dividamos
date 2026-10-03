import { useEffect, useMemo, useState } from 'react'
import { GastoDetalle } from '../components/GastoDetalle'
import { GastoItem } from '../components/GastoItem'
import { Icon } from '../components/Icon'
import { api } from '../lib'
import { DIAS_CORTOS, fechaLarga, finMes, hoyISO, inicioMes, mesAnio, pesos, toISO } from '../lib/format'
import type { Gasto, Vencimiento } from '../lib/types'
import { useHogar } from '../store'

export function Calendario({ onBack }: { onBack: () => void }) {
  const { hogar, miembros, gastos: gastosStore } = useHogar()
  const [mes, setMes] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [seleccionado, setSeleccionado] = useState<string>(hoyISO())
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [vencimientos, setVencimientos] = useState<Vencimiento[]>([])
  const [detalle, setDetalle] = useState<Gasto | null>(null)

  useEffect(() => {
    let alive = true
    api.listGastos(hogar.id, inicioMes(mes), finMes(mes)).then((g) => alive && setGastos(g))
    return () => {
      alive = false
    }
    // gastosStore: recargar cuando se agrega o borra un gasto
  }, [hogar.id, mes, gastosStore])

  useEffect(() => {
    api.listVencimientos(hogar.id).then((v) => setVencimientos(v.filter((x) => x.activo)))
  }, [hogar.id])

  const porDia = useMemo(() => {
    const m = new Map<string, Gasto[]>()
    gastos.forEach((g) => m.set(g.fecha, [...(m.get(g.fecha) ?? []), g]))
    return m
  }, [gastos])

  const ultimoDia = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate()
  const vencPorDia = useMemo(() => {
    const m = new Map<number, Vencimiento[]>()
    // Un vencimiento el 31 cae el último día en meses más cortos.
    vencimientos.forEach((v) => {
      const d = Math.min(v.dia_del_mes, ultimoDia)
      m.set(d, [...(m.get(d) ?? []), v])
    })
    return m
  }, [vencimientos, ultimoDia])

  // Lunes = 0
  const offset = (new Date(mes.getFullYear(), mes.getMonth(), 1).getDay() + 6) % 7
  const celdas: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: ultimoDia }, (_, i) => i + 1)]
  const hoy = hoyISO()
  const totalMes = gastos.reduce((s, g) => s + g.monto, 0)

  const cambiarMes = (delta: number) => {
    const n = new Date(mes.getFullYear(), mes.getMonth() + delta, 1)
    setMes(n)
    const esActual = n.getFullYear() === new Date().getFullYear() && n.getMonth() === new Date().getMonth()
    setSeleccionado(esActual ? hoy : toISO(n))
  }

  const delDia = porDia.get(seleccionado) ?? []
  const diaSel = Number(seleccionado.slice(8, 10))
  const vencDelDia = seleccionado.slice(0, 7) === toISO(mes).slice(0, 7) ? vencPorDia.get(diaSel) ?? [] : []
  const totalDia = delDia.reduce((s, g) => s + g.monto, 0)

  return (
    <div className="screen">
      <header className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="Volver">
          <Icon name="back" />
        </button>
        <span className="title">Calendario</span>
        <span style={{ width: 40 }} />
      </header>

      <section className="card">
        <div className="row between" style={{ marginBottom: 12 }}>
          <button className="icon-btn" style={{ boxShadow: 'none', background: 'var(--primary-50)' }} onClick={() => cambiarMes(-1)} aria-label="Mes anterior">
            <Icon name="back" size={20} />
          </button>
          <div className="center">
            <div className="h3">{mesAnio(mes)}</div>
            <div className="xs muted num">{pesos(totalMes)} en gastos</div>
          </div>
          <button className="icon-btn" style={{ boxShadow: 'none', background: 'var(--primary-50)' }} onClick={() => cambiarMes(1)} aria-label="Mes siguiente">
            <Icon name="right" size={20} />
          </button>
        </div>
        <div className="cal-grid">
          {DIAS_CORTOS.map((d, i) => (
            <div key={i} className="cal-dow">{d}</div>
          ))}
          {celdas.map((dia, i) => {
            if (dia === null) return <div key={`e${i}`} />
            const iso = toISO(new Date(mes.getFullYear(), mes.getMonth(), dia))
            const tiene = porDia.has(iso)
            const venc = vencPorDia.has(dia)
            return (
              <button
                key={iso}
                className={`cal-day ${iso === hoy ? 'today' : ''} ${iso === seleccionado ? 'selected' : ''}`}
                onClick={() => setSeleccionado(iso)}
                aria-label={`${dia}${tiene ? ', con gastos' : ''}${venc ? ', con vencimientos' : ''}`}
              >
                {dia}
                <span className="dots">
                  {tiene && <i />}
                  {venc && <i className="venc" />}
                </span>
              </button>
            )
          })}
        </div>
        <div className="row" style={{ gap: 16, marginTop: 12, justifyContent: 'center' }}>
          <span className="row xs muted" style={{ gap: 6 }}><i className="dot" style={{ background: 'var(--primary)', width: 8, height: 8 }} /> Gastos</span>
          <span className="row xs muted" style={{ gap: 6 }}><i className="dot" style={{ background: 'var(--warning)', width: 8, height: 8 }} /> Vencimientos</span>
        </div>
      </section>

      <div className="section-title">
        <h2 className="h2">{seleccionado === hoy ? 'Hoy' : fechaLarga(seleccionado)}</h2>
        {totalDia > 0 && <span className="bold num">{pesos(totalDia)}</span>}
      </div>

      {vencDelDia.length > 0 && (
        <div className="list" style={{ marginBottom: 12 }}>
          {vencDelDia.map((v) => (
            <div className="list-item" key={v.id}>
              <span className="cat-icon" style={{ background: 'var(--warning-bg)' }}>🔔</span>
              <div className="grow">
                <div className="title">{v.nombre}</div>
                <div className="meta">Vence el día {v.dia_del_mes}</div>
              </div>
              {v.monto_estimado != null && <div className="amount num muted">~{pesos(v.monto_estimado)}</div>}
            </div>
          ))}
        </div>
      )}

      <div className="list">
        {delDia.length === 0 ? (
          <div className="empty">
            <span className="emoji">🗓️</span>
            No hay gastos este día.
          </div>
        ) : (
          delDia.map((g) => <GastoItem key={g.id} gasto={g} miembros={miembros} onClick={() => setDetalle(g)} />)
        )}
      </div>

      <GastoDetalle gasto={detalle} onClose={() => setDetalle(null)} />
    </div>
  )
}

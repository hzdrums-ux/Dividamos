import { useMemo, useState } from 'react'
import { Avatar } from '../components/Avatar'
import { INDICADORES } from '../data/indicadores'
import { calcularBalance, totalPorCategoria } from '../lib/finanzas'
import { inicioMes, mesCorto, mesNombre, pesos, pesosCorto, toISO } from '../lib/format'
import { useHogar } from '../store'

/** Paleta categórica validada (orden fijo, el color sigue a la categoría, no al ranking). */
const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948']
const OTRAS = '#A19DB5'

export function Estadisticas() {
  const { gastos, miembros, categorias } = useHogar()
  const [activa, setActiva] = useState<string | null>(null)
  const [barSel, setBarSel] = useState<number | null>(null)

  const desde = inicioMes()
  const delMes = useMemo(() => gastos.filter((g) => g.fecha >= desde), [gastos, desde])
  const porCat = useMemo(() => totalPorCategoria(delMes), [delMes])
  const totalMes = delMes.reduce((s, g) => s + g.monto, 0)

  // Color fijo por categoría según su orden en la configuración del hogar.
  const colorDe = (nombre: string) => {
    const i = categorias.findIndex((c) => c.nombre === nombre)
    return i >= 0 && i < SERIES.length ? SERIES[i] : OTRAS
  }

  // Últimos 6 meses
  const meses = useMemo(() => {
    const hoy = new Date()
    return Array.from({ length: 6 }, (_, k) => {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - 5 + k, 1)
      const key = toISO(d).slice(0, 7)
      const total = gastos.filter((g) => g.fecha.startsWith(key)).reduce((s, g) => s + g.monto, 0)
      return { key, mes: d.getMonth(), total }
    })
  }, [gastos])
  const maxMes = Math.max(1, ...meses.map((m) => m.total))
  // Comparar contra el mismo período del mes pasado (del 1 al día de hoy), no contra el mes completo.
  const mismoPeriodoAnterior = useMemo(() => {
    const hoy = new Date()
    const desdeAnt = toISO(new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1))
    const hastaAnt = toISO(new Date(hoy.getFullYear(), hoy.getMonth() - 1, Math.min(hoy.getDate(), new Date(hoy.getFullYear(), hoy.getMonth(), 0).getDate())))
    return gastos.filter((g) => g.fecha >= desdeAnt && g.fecha <= hastaAnt).reduce((s, g) => s + g.monto, 0)
  }, [gastos])
  const variacion = mismoPeriodoAnterior ? ((totalMes - mismoPeriodoAnterior) / mismoPeriodoAnterior) * 100 : null

  const balance = useMemo(() => calcularBalance(delMes, miembros), [delMes, miembros])
  const maxMiembro = Math.max(1, ...miembros.map((m) => balance.pagado[m.id] ?? 0))

  const ipc = INDICADORES.ipc

  return (
    <div className="screen">
      <header className="topbar">
        <span className="title">Estadísticas</span>
        <span className="badge violet">{mesNombre(new Date().getMonth())}</span>
      </header>

      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi">
          <div className="k-label">Este mes</div>
          <div className="k-value num">{pesosCorto(totalMes)}</div>
          <div className="k-foot">
            {variacion === null ? 'Sin datos para comparar' : (
              <>
                <b className={variacion > 0 ? 'up' : 'down'}>{variacion > 0 ? '▲' : '▼'} {Math.abs(variacion).toFixed(1).replace('.', ',')}%</b> vs. mismos días de {mesCorto(meses[4].mes)}
              </>
            )}
          </div>
        </div>
        <div className="kpi">
          <div className="k-label">Inflación IPC</div>
          <div className="k-value num">{ipc.mensual.toString().replace('.', ',')}%</div>
          <div className="k-foot">{ipc.periodo} · {ipc.interanual.toString().replace('.', ',')}% i.a.</div>
        </div>
      </div>

      {/* Torta por categoría */}
      <section className="card" style={{ marginTop: 14 }}>
        <div className="card-title">
          <h2 className="h3">Por categoría</h2>
          <span className="small muted">este mes</span>
        </div>
        {porCat.length === 0 ? (
          <div className="empty">Sin gastos este mes</div>
        ) : (
          <>
            <Torta
              datos={porCat.map((c) => ({ id: c.categoria, valor: c.total, color: colorDe(c.categoria) }))}
              activa={activa}
              onSelect={setActiva}
              centro={
                activa ? (
                  <>
                    <div className="xs muted bold">{activa}</div>
                    <div className="h2 num">{pesosCorto(porCat.find((c) => c.categoria === activa)?.total ?? 0)}</div>
                  </>
                ) : (
                  <>
                    <div className="xs muted bold">Total</div>
                    <div className="h2 num">{pesosCorto(totalMes)}</div>
                  </>
                )
              }
            />
            <div className="legend" style={{ marginTop: 16 }}>
              {porCat.map((c) => (
                <button
                  key={c.categoria}
                  className="legend-row"
                  onClick={() => setActiva(activa === c.categoria ? null : c.categoria)}
                  style={{ opacity: activa && activa !== c.categoria ? 0.45 : 1, width: '100%', textAlign: 'left' }}
                >
                  <span className="dot" style={{ background: colorDe(c.categoria) }} />
                  <span className="grow">{categorias.find((x) => x.nombre === c.categoria)?.emoji} {c.categoria}</span>
                  <b className="num">{pesos(c.total)}</b>
                  <span className="pct num">{Math.round((c.total / totalMes) * 100)}%</span>
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Barras por mes */}
      <section className="card" style={{ marginTop: 14 }}>
        <div className="card-title">
          <h2 className="h3">Últimos 6 meses</h2>
          <span className="small muted num">{barSel !== null ? `${mesNombre(meses[barSel].mes)}: ${pesos(meses[barSel].total)}` : 'Total del hogar'}</span>
        </div>
        <svg viewBox="0 0 320 170" width="100%" role="img" aria-label="Gastos por mes, últimos 6 meses">
          {[0.5, 1].map((t) => (
            <g key={t}>
              <line x1="0" x2="320" y1={140 - t * 120} y2={140 - t * 120} stroke="#EFECFA" strokeWidth="1" />
              <text x="0" y={140 - t * 120 - 4} fontSize="10" fill="#A19DB5">{pesosCorto(maxMes * t)}</text>
            </g>
          ))}
          <line x1="0" x2="320" y1="140" y2="140" stroke="#E2DEF2" strokeWidth="1" />
          {meses.map((m, i) => {
            const w = 30
            const gap = 320 / 6
            const x = i * gap + (gap - w) / 2
            const h = Math.max(m.total > 0 ? 4 : 0, (m.total / maxMes) * 120)
            const actual = i === 5
            const sel = barSel === i
            return (
              <g key={m.key} onClick={() => setBarSel(sel ? null : i)} onMouseEnter={() => setBarSel(i)} onMouseLeave={() => setBarSel(null)} style={{ cursor: 'pointer' }}>
                <rect x={i * gap} y="10" width={gap} height="150" fill="transparent" />
                <path
                  d={barPath(x, 140 - h, w, h, 4)}
                  fill={actual ? '#7C3AED' : '#C4B5FD'}
                  opacity={barSel !== null && !sel ? 0.5 : 1}
                />
                {(actual || sel) && (
                  <text x={x + w / 2} y={140 - h - 6} fontSize="10.5" fontWeight="700" textAnchor="middle" fill="#1E1B2E">
                    {pesosCorto(m.total)}
                  </text>
                )}
                <text x={x + w / 2} y="158" fontSize="11" textAnchor="middle" fill={actual ? '#1E1B2E' : '#6B6880'} fontWeight={actual ? 700 : 500}>
                  {mesCorto(m.mes)}
                </text>
              </g>
            )
          })}
        </svg>
      </section>

      {/* Comparación entre miembros */}
      <section className="card" style={{ marginTop: 14 }}>
        <div className="card-title">
          <h2 className="h3">Quién pagó qué</h2>
          <span className="small muted">este mes</span>
        </div>
        <div className="stack" style={{ gap: 16 }}>
          {miembros.map((m) => {
            const pagado = balance.pagado[m.id] ?? 0
            const corresponde = balance.corresponde[m.id] ?? 0
            const cant = delMes.filter((g) => g.quien_pago === m.id).length
            return (
              <div key={m.id}>
                <div className="row" style={{ marginBottom: 8 }}>
                  <Avatar user={m} size="sm" />
                  <span className="bold grow">{m.nombre}</span>
                  <b className="num">{pesos(pagado)}</b>
                </div>
                <div className="progress" style={{ height: 12, background: 'var(--primary-50)' }}>
                  <span style={{ width: `${(pagado / maxMiembro) * 100}%`, background: m.avatar_color }} />
                </div>
                <div className="xs muted" style={{ marginTop: 6 }}>
                  {cant} {cant === 1 ? 'gasto' : 'gastos'} · {totalMes ? Math.round((pagado / totalMes) * 100) : 0}% del total · le correspondía {pesos(corresponde)}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Inflación */}
      <section className="card" style={{ marginTop: 14 }}>
        <div className="card-title">
          <h2 className="h3">Inflación mensual (IPC)</h2>
          <span className="xs muted">{ipc.fuente}</span>
        </div>
        <div className="row" style={{ alignItems: 'flex-end', gap: 8, height: 90 }}>
          {ipc.historico.map((p, i) => {
            const max = Math.max(...ipc.historico.map((x) => x.valor))
            const ultimo = i === ipc.historico.length - 1
            return (
              <div key={p.mes} className="grow center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                <span className="xs num" style={{ fontWeight: ultimo ? 700 : 500, color: ultimo ? 'var(--text)' : 'var(--muted)' }}>{p.valor.toString().replace('.', ',')}%</span>
                <span style={{ width: 22, height: `${(p.valor / max) * 52}px`, background: ultimo ? 'var(--primary)' : 'var(--primary-200)', borderRadius: '4px 4px 0 0' }} />
                <span className="xs muted">{p.mes}</span>
              </div>
            )
          })}
        </div>
        <div className="small muted" style={{ marginTop: 12 }}>
          Acumulado {new Date().getFullYear()}: <b className="num" style={{ color: 'var(--text)' }}>{ipc.acumulado.toString().replace('.', ',')}%</b>.
          {variacion !== null && (
            <>
              {' '}
              {variacion < 0
                ? 'Este mes vienen gastando menos que el mes pasado. 👏'
                : variacion > ipc.mensual
                  ? 'Sus gastos vienen subiendo más rápido que la inflación.'
                  : 'Sus gastos vienen subiendo por debajo de la inflación.'}
            </>
          )}
        </div>
      </section>
    </div>
  )
}

function barPath(x: number, y: number, w: number, h: number, r: number) {
  if (h <= 0) return ''
  const rr = Math.min(r, h, w / 2)
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`
}

function Torta({
  datos,
  activa,
  onSelect,
  centro,
}: {
  datos: { id: string; valor: number; color: string }[]
  activa: string | null
  onSelect: (id: string | null) => void
  centro: React.ReactNode
}) {
  const total = datos.reduce((s, d) => s + d.valor, 0)
  const R = 80
  const r = 52
  const cx = 100
  const cy = 100
  let ang = -Math.PI / 2
  const GAP = datos.length > 1 ? 0.025 : 0

  const arcs = datos.map((d) => {
    const a = (d.valor / total) * Math.PI * 2
    const a0 = ang + GAP / 2
    const a1 = ang + a - GAP / 2
    ang += a
    return { ...d, a0, a1 }
  })

  const path = (a0: number, a1: number, ro: number) => {
    if (a1 - a0 >= Math.PI * 2 - 0.001) a1 = a0 + Math.PI * 2 - 0.001
    const large = a1 - a0 > Math.PI ? 1 : 0
    const p = (ang: number, rad: number) => `${cx + rad * Math.cos(ang)},${cy + rad * Math.sin(ang)}`
    return `M${p(a0, ro)}A${ro},${ro} 0 ${large} 1 ${p(a1, ro)}L${p(a1, r)}A${r},${r} 0 ${large} 0 ${p(a0, r)}Z`
  }

  return (
    <div style={{ position: 'relative', width: 200, height: 200, margin: '0 auto' }}>
      <svg viewBox="0 0 200 200" width="200" height="200" role="img" aria-label="Gastos por categoría">
        {arcs.map((a) => (
          <path
            key={a.id}
            d={path(a.a0, a.a1, activa === a.id ? R + 6 : R)}
            fill={a.color}
            opacity={activa && activa !== a.id ? 0.35 : 1}
            onClick={() => onSelect(activa === a.id ? null : a.id)}
            style={{ cursor: 'pointer', transition: 'opacity .15s' }}
          >
            <title>{`${a.id}: ${pesos(a.valor)}`}</title>
          </path>
        ))}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none', textAlign: 'center' }}>
        <div>{centro}</div>
      </div>
    </div>
  )
}

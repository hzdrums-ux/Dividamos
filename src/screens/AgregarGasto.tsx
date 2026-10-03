import { useMemo, useState, type FormEvent } from 'react'
import { Avatar } from '../components/Avatar'
import { Icon } from '../components/Icon'
import { api } from '../lib'
import { formatMontoInput, hoyISO, parsePesos, pesos, toISO } from '../lib/format'
import { shares } from '../lib/finanzas'
import { takeCategoriaPreset } from '../lib/preset'
import type { DivisionGasto } from '../lib/types'
import { useHogar } from '../store'

const ayerISO = () => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return toISO(d)
}

export function AgregarGasto({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const { perfil, hogar, miembros, categorias, refreshGastos, toast } = useHogar()
  const activas = categorias.filter((c) => c.activa)

  const [monto, setMonto] = useState('')
  const [categoria, setCategoria] = useState<string>(() => takeCategoriaPreset() ?? activas[0]?.nombre ?? '')
  const [descripcion, setDescripcion] = useState('')
  const [quienPago, setQuienPago] = useState(perfil.id)
  const [fecha, setFecha] = useState(hoyISO())
  const [division, setDivision] = useState<DivisionGasto>(hogar.division_default)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dos = miembros.length === 2
  const opcionesDivision: { value: DivisionGasto; label: string }[] = useMemo(() => {
    if (!dos) return [{ value: hogar.division_default, label: 'Partes iguales' }]
    const [a, b] = miembros
    const base: DivisionGasto[] = ['50/50', '60/40', '40/60', '70/30', '30/70']
    return [
      ...base.map((d) => ({ value: d, label: d })),
      { value: '100/0' as const, label: `Todo ${a.nombre}` },
      { value: '0/100' as const, label: `Todo ${b.nombre}` },
    ]
  }, [dos, miembros, hogar.division_default])

  const montoNum = parsePesos(monto)
  const parts = shares(division, miembros)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (montoNum <= 0) return setError('Ingresá un monto')
    if (!categoria) return setError('Elegí una categoría')
    setGuardando(true)
    setError(null)
    try {
      await api.addGasto({
        hogar_id: hogar.id,
        monto: montoNum,
        categoria,
        descripcion: descripcion.trim() || null,
        quien_pago: quienPago,
        division,
        fecha,
      })
      await refreshGastos()
      toast(`Gasto de ${pesos(montoNum)} guardado ✓`)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form className="screen" onSubmit={submit}>
      <header className="topbar">
        <button type="button" className="icon-btn" onClick={onCancel} aria-label="Cancelar">
          <Icon name="x" />
        </button>
        <span className="title">Nuevo gasto</span>
        <span style={{ width: 40 }} />
      </header>

      {/* Monto */}
      <div className="amount-input">
        <div className="wrap">
          <span className="currency">$</span>
          <input
            inputMode="numeric"
            placeholder="0"
            autoFocus
            aria-label="Monto"
            value={monto}
            onChange={(e) => setMonto(formatMontoInput(e.target.value))}
            style={{ width: `${Math.max(1, monto.length || 1) * 0.62 + 0.4}em` }}
          />
        </div>
        <div className="small muted" style={{ marginTop: 4 }}>pesos argentinos</div>
      </div>

      <div className="stack-lg" style={{ marginTop: 20 }}>
        {/* Categoría */}
        <div className="field">
          <span className="label">Categoría</span>
          <div className="chips">
            {activas.map((c) => (
              <button type="button" key={c.id} className={`chip ${categoria === c.nombre ? 'active' : ''}`} onClick={() => setCategoria(c.nombre)}>
                <span>{c.emoji}</span> {c.nombre}
              </button>
            ))}
          </div>
        </div>

        {/* Descripción */}
        <div className="field">
          <label htmlFor="desc">Descripción</label>
          <input id="desc" className="input" placeholder="Ej: compra en el chino" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={60} />
        </div>

        {/* Quién pagó */}
        <div className="field">
          <span className="label">¿Quién pagó?</span>
          <div className="member-select">
            {miembros.map((m) => (
              <button type="button" key={m.id} className={`option ${quienPago === m.id ? 'active' : ''}`} onClick={() => setQuienPago(m.id)}>
                <Avatar user={m} />
                <span className="bold ellipsis">{m.id === perfil.id ? 'Yo' : m.nombre}</span>
                <span className="check">{quienPago === m.id && <Icon name="check" size={14} stroke={3} />}</span>
              </button>
            ))}
          </div>
        </div>

        {/* División */}
        {dos && (
          <div className="field">
            <span className="label">
              División ({miembros[0].nombre} / {miembros[1].nombre})
            </span>
            <div className="chips scroll">
              {opcionesDivision.map((o) => (
                <button type="button" key={o.value} className={`chip ${division === o.value ? 'active' : ''}`} onClick={() => setDivision(o.value)}>
                  {o.label}
                </button>
              ))}
            </div>
            {montoNum > 0 && (
              <div className="small muted">
                {miembros.map((m, i) => `${m.nombre}: ${pesos(montoNum * parts[i])}`).join(' · ')}
              </div>
            )}
          </div>
        )}

        {/* Fecha */}
        <div className="field">
          <label htmlFor="fecha">Fecha</label>
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className={`chip ${fecha === hoyISO() ? 'active' : ''}`} onClick={() => setFecha(hoyISO())}>Hoy</button>
            <button type="button" className={`chip ${fecha === ayerISO() ? 'active' : ''}`} onClick={() => setFecha(ayerISO())}>Ayer</button>
            <input id="fecha" type="date" className="input grow" value={fecha} max={hoyISO()} onChange={(e) => e.target.value && setFecha(e.target.value)} style={{ height: 40, borderRadius: 99 }} />
          </div>
        </div>

        {error && <div className="error">{error}</div>}

        <button className="btn" disabled={guardando || montoNum <= 0}>
          {guardando ? 'Guardando…' : montoNum > 0 ? `Guardar ${pesos(montoNum)}` : 'Guardar gasto'}
        </button>
      </div>
    </form>
  )
}

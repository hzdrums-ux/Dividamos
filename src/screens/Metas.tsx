import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Avatar } from '../components/Avatar'
import { Icon } from '../components/Icon'
import { Sheet } from '../components/Sheet'
import { api } from '../lib'
import { fechaCorta, formatMontoInput, hoyISO, parseISO, parsePesos, pesos } from '../lib/format'
import type { Deposito, Meta } from '../lib/types'
import { useHogar } from '../store'

const EMOJIS = ['🎯', '🏖️', '🏔️', '✈️', '🏠', '🚗', '🛟', '🎓', '💍', '👶', '🧊', '📺', '🐶', '🎁']

function mesesRestantes(fecha: string | null): string | null {
  if (!fecha) return null
  const d = parseISO(fecha)
  const hoy = new Date()
  const meses = (d.getFullYear() - hoy.getFullYear()) * 12 + d.getMonth() - hoy.getMonth()
  if (d < hoy) return 'Vencida'
  if (meses <= 0) return 'Este mes'
  return meses === 1 ? 'Falta 1 mes' : `Faltan ${meses} meses`
}

export function Metas() {
  const { hogar, miembros, perfil, toast } = useHogar()
  const [metas, setMetas] = useState<Meta[] | null>(null)
  const [depositos, setDepositos] = useState<Deposito[]>([])
  const [depositarEn, setDepositarEn] = useState<Meta | null>(null)
  const [verMeta, setVerMeta] = useState<Meta | null>(null)
  const [creando, setCreando] = useState(false)

  const cargar = useCallback(async () => {
    const m = await api.listMetas(hogar.id)
    const d = await api.listDepositos(m.map((x) => x.id))
    setMetas(m)
    setDepositos(d)
  }, [hogar.id])

  useEffect(() => {
    cargar()
  }, [cargar])

  const acumulado = (id: string) => depositos.filter((d) => d.meta_id === id).reduce((s, d) => s + d.monto, 0)
  const totalAhorrado = depositos.reduce((s, d) => s + d.monto, 0)
  const totalObjetivo = (metas ?? []).reduce((s, m) => s + m.monto_objetivo, 0)

  return (
    <div className="screen">
      <header className="topbar">
        <span className="title">Metas</span>
        <button className="btn sm" onClick={() => setCreando(true)}>
          <Icon name="plus" size={18} stroke={2.6} /> Nueva meta
        </button>
      </header>

      <section className="hero" style={{ marginBottom: 18 }}>
        <div className="label">Ahorrado entre todos</div>
        <div className="amount num" style={{ marginBottom: 8 }}>{pesos(totalAhorrado)}</div>
        <div className="small" style={{ opacity: 0.85, position: 'relative', zIndex: 1 }}>
          de {pesos(totalObjetivo)} en {metas?.length ?? 0} {metas?.length === 1 ? 'meta' : 'metas'}
        </div>
      </section>

      {metas === null ? (
        <div className="stack">
          {[0, 1].map((i) => (
            <div key={i} className="skeleton" style={{ height: 150, borderRadius: 20 }} />
          ))}
        </div>
      ) : metas.length === 0 ? (
        <div className="card empty">
          <span className="emoji">🎯</span>
          Todavía no tienen metas de ahorro.
          <br />
          <button className="link" style={{ marginTop: 8 }} onClick={() => setCreando(true)}>Crear la primera</button>
        </div>
      ) : (
        <div className="stack">
          {metas.map((m) => {
            const acc = acumulado(m.id)
            const pct = Math.min(100, (acc / m.monto_objetivo) * 100)
            const resta = mesesRestantes(m.fecha_objetivo)
            return (
              <article key={m.id} className="card meta-card">
                <button className="row" style={{ width: '100%', textAlign: 'left' }} onClick={() => setVerMeta(m)}>
                  <span className="emoji">{m.emoji}</span>
                  <div className="grow">
                    <div className="h3 ellipsis">{m.nombre}</div>
                    <div className="small muted">
                      {m.fecha_objetivo ? `Para el ${fechaCorta(m.fecha_objetivo)}` : 'Sin fecha'}
                      {resta && ` · ${resta}`}
                    </div>
                  </div>
                  <span className="badge violet">{Math.round(pct)}%</span>
                </button>
                <div className={`progress ${pct >= 100 ? 'done' : ''}`} style={{ margin: '16px 0 10px' }}>
                  <span style={{ width: `${pct}%` }} />
                </div>
                <div className="row between">
                  <div className="small">
                    <b className="num">{pesos(acc)}</b>
                    <span className="muted num"> / {pesos(m.monto_objetivo)}</span>
                  </div>
                  <button className="btn sm secondary" onClick={() => setDepositarEn(m)}>
                    <Icon name="plus" size={16} stroke={2.6} /> Depositar
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <DepositoSheet
        meta={depositarEn}
        acumulado={depositarEn ? acumulado(depositarEn.id) : 0}
        onClose={() => setDepositarEn(null)}
        onSaved={async (monto) => {
          await cargar()
          toast(`Depositaste ${pesos(monto)} 💜`)
        }}
        usuarioId={perfil.id}
      />

      <NuevaMetaSheet
        open={creando}
        onClose={() => setCreando(false)}
        hogarId={hogar.id}
        onSaved={async () => {
          await cargar()
          toast('Meta creada 🎯')
        }}
      />

      <Sheet open={!!verMeta} onClose={() => setVerMeta(null)} title={verMeta ? `${verMeta.emoji} ${verMeta.nombre}` : ''}>
        {verMeta && (
          <>
            <div className="kpi-grid">
              {miembros.map((u) => (
                <div className="kpi" key={u.id}>
                  <div className="row" style={{ gap: 8 }}>
                    <Avatar user={u} size="sm" />
                    <span className="k-label">{u.nombre}</span>
                  </div>
                  <div className="k-value num" style={{ fontSize: 18 }}>
                    {pesos(depositos.filter((d) => d.meta_id === verMeta.id && d.usuario_id === u.id).reduce((s, d) => s + d.monto, 0))}
                  </div>
                </div>
              ))}
            </div>
            <h3 className="h3" style={{ margin: '18px 0 10px' }}>Depósitos</h3>
            <div className="list">
              {depositos.filter((d) => d.meta_id === verMeta.id).length === 0 && <div className="empty">Sin depósitos todavía</div>}
              {depositos
                .filter((d) => d.meta_id === verMeta.id)
                .map((d) => {
                  const u = miembros.find((x) => x.id === d.usuario_id)
                  return (
                    <div className="list-item" key={d.id}>
                      <Avatar user={u} size="sm" />
                      <span className="grow">{u?.nombre ?? '—'}</span>
                      <span className="small muted">{fechaCorta(d.fecha)}</span>
                      <b className="num">{pesos(d.monto)}</b>
                    </div>
                  )
                })}
            </div>
            <button
              className="btn danger"
              style={{ marginTop: 16 }}
              onClick={async () => {
                if (!confirm(`¿Borrar la meta "${verMeta.nombre}" y sus depósitos?`)) return
                await api.deleteMeta(verMeta.id)
                setVerMeta(null)
                await cargar()
                toast('Meta borrada')
              }}
            >
              <Icon name="trash" size={18} /> Borrar meta
            </button>
          </>
        )}
      </Sheet>
    </div>
  )
}

function DepositoSheet({
  meta,
  acumulado,
  onClose,
  onSaved,
  usuarioId,
}: {
  meta: Meta | null
  acumulado: number
  onClose: () => void
  onSaved: (monto: number) => Promise<void>
  usuarioId: string
}) {
  const [monto, setMonto] = useState('')
  const [guardando, setGuardando] = useState(false)
  const n = parsePesos(monto)
  const falta = meta ? Math.max(0, meta.monto_objetivo - acumulado) : 0

  useEffect(() => setMonto(''), [meta])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!meta || n <= 0) return
    setGuardando(true)
    try {
      await api.addDeposito({ meta_id: meta.id, usuario_id: usuarioId, monto: n, fecha: hoyISO() })
      await onSaved(n)
      onClose()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Sheet open={!!meta} onClose={onClose} title={meta ? `Depositar en ${meta.emoji} ${meta.nombre}` : ''}>
      <form onSubmit={submit} className="stack">
        <div className="amount-input" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <span className="currency">$</span>
            <input inputMode="numeric" placeholder="0" autoFocus aria-label="Monto a depositar" value={monto} onChange={(e) => setMonto(formatMontoInput(e.target.value))} style={{ width: `${Math.max(1, monto.length || 1) * 0.62 + 0.4}em` }} />
          </div>
          <div className="small muted" style={{ marginTop: 4 }}>Faltan {pesos(falta)} para la meta</div>
        </div>
        <div className="chips" style={{ justifyContent: 'center' }}>
          {[10000, 25000, 50000, 100000].map((v) => (
            <button type="button" key={v} className="chip" onClick={() => setMonto(formatMontoInput(String(v)))}>
              +{pesos(v)}
            </button>
          ))}
          {falta > 0 && (
            <button type="button" className="chip" onClick={() => setMonto(formatMontoInput(String(Math.round(falta))))}>
              Completar
            </button>
          )}
        </div>
        <button className="btn" disabled={guardando || n <= 0}>
          {guardando ? 'Guardando…' : 'Depositar'}
        </button>
      </form>
    </Sheet>
  )
}

function NuevaMetaSheet({ open, onClose, hogarId, onSaved }: { open: boolean; onClose: () => void; hogarId: string; onSaved: () => Promise<void> }) {
  const [nombre, setNombre] = useState('')
  const [emoji, setEmoji] = useState('🎯')
  const [monto, setMonto] = useState('')
  const [fecha, setFecha] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setNombre('')
      setEmoji('🎯')
      setMonto('')
      setFecha('')
      setError(null)
    }
  }, [open])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const n = parsePesos(monto)
    if (!nombre.trim() || n <= 0) return setError('Completá nombre y monto objetivo')
    setGuardando(true)
    try {
      await api.addMeta({ hogar_id: hogarId, nombre: nombre.trim(), emoji, monto_objetivo: n, fecha_objetivo: fecha || null })
      await onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Nueva meta">
      <form className="stack" onSubmit={submit}>
        <div className="chips scroll">
          {EMOJIS.map((e) => (
            <button type="button" key={e} className={`chip ${emoji === e ? 'active' : ''}`} onClick={() => setEmoji(e)} style={{ fontSize: 20, width: 44, justifyContent: 'center', padding: 0 }}>
              {e}
            </button>
          ))}
        </div>
        <div className="field">
          <label htmlFor="m-nombre">Nombre</label>
          <input id="m-nombre" className="input" placeholder="Ej: Vacaciones en la costa" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={40} />
        </div>
        <div className="field">
          <label htmlFor="m-monto">Monto objetivo</label>
          <input id="m-monto" className="input num" inputMode="numeric" placeholder="$0" value={monto ? `$${monto}` : ''} onChange={(e) => setMonto(formatMontoInput(e.target.value))} />
        </div>
        <div className="field">
          <label htmlFor="m-fecha">Fecha objetivo (opcional)</label>
          <input id="m-fecha" className="input" type="date" min={hoyISO()} value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
        {error && <div className="error">{error}</div>}
        <button className="btn" disabled={guardando}>{guardando ? 'Creando…' : 'Crear meta'}</button>
      </form>
    </Sheet>
  )
}

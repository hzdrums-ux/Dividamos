import { useEffect, useState, type FormEvent } from 'react'
import { Avatar } from '../components/Avatar'
import { Icon } from '../components/Icon'
import { Sheet } from '../components/Sheet'
import { api } from '../lib'
import { resetDemo } from '../lib/demoApi'
import { formatMontoInput, parsePesos, pesos } from '../lib/format'
import { BANCOS, DIVISIONES, REGIONES, type Hogar, type Vencimiento } from '../lib/types'
import { useHogar } from '../store'

type Editando = null | 'nombre' | 'region' | 'banco' | 'division'

export function Perfil() {
  const { hogar, perfil, miembros, categorias, refresh, setHogar, toast } = useHogar()
  const [editando, setEditando] = useState<Editando>(null)
  const [nuevaCat, setNuevaCat] = useState(false)
  const [vencimientos, setVencimientos] = useState<Vencimiento[]>([])
  const [nuevoVenc, setNuevoVenc] = useState(false)

  const cargarVenc = () => api.listVencimientos(hogar.id).then(setVencimientos)
  useEffect(() => {
    cargarVenc()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hogar.id])

  const guardar = async (patch: Partial<Hogar>) => {
    await api.updateHogar(hogar.id, patch)
    setHogar({ ...hogar, ...patch })
    setEditando(null)
    toast('Hogar actualizado')
  }

  const compartir = async () => {
    const texto = `¡Sumate a nuestro hogar en Dividamos! Usá el código ${hogar.codigo_invitacion}`
    try {
      if (navigator.share) await navigator.share({ title: 'Dividamos', text: texto })
      else {
        await navigator.clipboard.writeText(hogar.codigo_invitacion)
        toast('Código copiado')
      }
    } catch {
      /* cancelado */
    }
  }

  return (
    <div className="screen">
      <header className="topbar">
        <span className="title">Perfil</span>
      </header>

      <section className="card row" style={{ gap: 14 }}>
        <Avatar user={perfil} size="lg" />
        <div className="grow">
          <div className="h2">{perfil.nombre}</div>
          <div className="small muted ellipsis">{perfil.email}</div>
        </div>
      </section>

      {/* Código */}
      <section className="hero" style={{ marginTop: 14 }}>
        <div className="row between" style={{ position: 'relative', zIndex: 1 }}>
          <div>
            <div className="label">Código de invitación</div>
            <div className="num" style={{ fontSize: 30, fontWeight: 800, letterSpacing: '0.05em', marginTop: 2 }}>{hogar.codigo_invitacion}</div>
          </div>
          <button className="icon-btn" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', boxShadow: 'none' }} onClick={compartir} aria-label="Compartir código">
            <Icon name="share" size={20} />
          </button>
        </div>
      </section>

      {/* Datos del hogar */}
      <div className="section-title"><h2 className="h2">Datos del hogar</h2></div>
      <div className="list">
        <Fila label="Nombre" valor={hogar.nombre} onClick={() => setEditando('nombre')} />
        <Fila label="Región" valor={hogar.region} onClick={() => setEditando('region')} />
        <Fila label="Banco" valor={hogar.banco ?? 'Elegir'} onClick={() => setEditando('banco')} />
        <Fila label="División" valor={hogar.division_default} onClick={() => setEditando('division')} />
      </div>

      {/* Miembros */}
      <div className="section-title">
        <h2 className="h2">Miembros</h2>
        <span className="small muted">{miembros.length}</span>
      </div>
      <div className="list">
        {miembros.map((m, i) => (
          <div className="list-item" key={m.id}>
            <Avatar user={m} />
            <div className="grow">
              <div className="title">{m.nombre}{m.id === perfil.id && <span className="muted"> (vos)</span>}</div>
              <div className="meta ellipsis">{m.email}</div>
            </div>
            {miembros.length === 2 && <span className="badge violet">{hogar.division_default.split('/')[i]}%</span>}
          </div>
        ))}
        <button className="list-item" style={{ width: '100%', color: 'var(--primary)' }} onClick={compartir}>
          <span className="cat-icon"><Icon name="plus" size={20} /></span>
          <span className="bold">Invitar a alguien</span>
        </button>
      </div>

      {/* Categorías */}
      <div className="section-title">
        <h2 className="h2">Categorías</h2>
        <button className="link" onClick={() => setNuevaCat(true)}>+ Nueva</button>
      </div>
      <div className="list">
        {categorias.map((c) => (
          <div className="list-item" key={c.id}>
            <span className="cat-icon">{c.emoji}</span>
            <span className="grow bold" style={{ opacity: c.activa ? 1 : 0.5 }}>{c.nombre}</span>
            <button
              className={`switch ${c.activa ? 'on' : ''}`}
              role="switch"
              aria-checked={c.activa}
              aria-label={`${c.activa ? 'Desactivar' : 'Activar'} ${c.nombre}`}
              onClick={async () => {
                await api.updateCategoria(c.id, { activa: !c.activa })
                await refresh()
              }}
            />
          </div>
        ))}
      </div>

      {/* Vencimientos */}
      <div className="section-title">
        <h2 className="h2">Vencimientos</h2>
        <button className="link" onClick={() => setNuevoVenc(true)}>+ Nuevo</button>
      </div>
      <div className="list">
        {vencimientos.length === 0 && <div className="empty">Agregá alquiler, expensas, tarjetas… y los vas a ver en el calendario.</div>}
        {vencimientos.map((v) => (
          <div className="list-item" key={v.id}>
            <span className="cat-icon" style={{ background: 'var(--warning-bg)', fontSize: 15, fontWeight: 800, color: 'var(--warning)' }}>{v.dia_del_mes}</span>
            <div className="grow" style={{ opacity: v.activo ? 1 : 0.5 }}>
              <div className="title">{v.nombre}</div>
              <div className="meta">Día {v.dia_del_mes} de cada mes{v.monto_estimado ? ` · ~${pesos(v.monto_estimado)}` : ''}</div>
            </div>
            <button
              className="icon-btn"
              style={{ boxShadow: 'none', color: 'var(--subtle)' }}
              aria-label={`Borrar ${v.nombre}`}
              onClick={async () => {
                if (!confirm(`¿Borrar el vencimiento "${v.nombre}"?`)) return
                await api.deleteVencimiento(v.id)
                cargarVenc()
              }}
            >
              <Icon name="trash" size={18} />
            </button>
          </div>
        ))}
      </div>

      <div className="stack" style={{ marginTop: 28 }}>
        <button
          className="btn danger"
          onClick={() => {
            window.location.hash = '/inicio'
            api.signOut()
          }}
        >
          <Icon name="logout" size={18} /> Cerrar sesión
        </button>
        {api.mode === 'demo' && (
          <button
            className="btn ghost"
            onClick={() => {
              if (!confirm('¿Restaurar los datos de prueba? Se pierden los cambios.')) return
              resetDemo()
              window.location.reload()
            }}
          >
            Restaurar datos de demo
          </button>
        )}
        <p className="center xs subtle">Dividamos v1.0 · {api.mode === 'demo' ? 'Modo demo (datos locales)' : 'Conectado a Supabase'}</p>
      </div>

      {/* Sheets de edición */}
      <EditarNombre open={editando === 'nombre'} valor={hogar.nombre} onClose={() => setEditando(null)} onSave={(nombre) => guardar({ nombre })} />
      <Sheet open={editando === 'region'} onClose={() => setEditando(null)} title="Región">
        <div className="option-grid">
          {REGIONES.map((r) => (
            <button key={r} className={`option ${hogar.region === r ? 'active' : ''}`} onClick={() => guardar({ region: r })}>{r}</button>
          ))}
        </div>
      </Sheet>
      <Sheet open={editando === 'banco'} onClose={() => setEditando(null)} title="Banco principal">
        <div className="option-grid">
          {BANCOS.map((b) => (
            <button key={b} className={`option ${hogar.banco === b ? 'active' : ''}`} onClick={() => guardar({ banco: b })}>{b}</button>
          ))}
        </div>
      </Sheet>
      <Sheet open={editando === 'division'} onClose={() => setEditando(null)} title="División por defecto">
        <div className="stack">
          {DIVISIONES.map((d) => (
            <button key={d} className={`option ${hogar.division_default === d ? 'active' : ''}`} onClick={() => guardar({ division_default: d })}>
              <span className="h3">{d}</span>
              {miembros.length === 2 && (
                <span className="small muted">
                  {miembros[0].nombre} {d.split('/')[0]}% · {miembros[1].nombre} {d.split('/')[1]}%
                </span>
              )}
              <span className="check">{hogar.division_default === d && <Icon name="check" size={14} stroke={3} />}</span>
            </button>
          ))}
          <p className="xs muted">Aplica a los gastos nuevos. Los ya cargados conservan su división.</p>
        </div>
      </Sheet>
      <NuevaCategoria open={nuevaCat} onClose={() => setNuevaCat(false)} hogarId={hogar.id} onSaved={async () => { await refresh(); toast('Categoría creada') }} />
      <NuevoVencimiento open={nuevoVenc} onClose={() => setNuevoVenc(false)} hogarId={hogar.id} onSaved={() => { cargarVenc(); toast('Vencimiento agregado') }} />
    </div>
  )
}

function Fila({ label, valor, onClick }: { label: string; valor: string; onClick: () => void }) {
  return (
    <button className="list-item" style={{ width: '100%', textAlign: 'left' }} onClick={onClick}>
      <span className="muted grow">{label}</span>
      <b className="ellipsis" style={{ maxWidth: '60%' }}>{valor}</b>
      <Icon name="right" size={18} className="subtle" />
    </button>
  )
}

function EditarNombre({ open, valor, onClose, onSave }: { open: boolean; valor: string; onClose: () => void; onSave: (v: string) => void }) {
  const [v, setV] = useState(valor)
  useEffect(() => setV(valor), [valor, open])
  return (
    <Sheet open={open} onClose={onClose} title="Nombre del hogar">
      <form className="stack" onSubmit={(e) => { e.preventDefault(); if (v.trim()) onSave(v.trim()) }}>
        <input className="input" autoFocus value={v} onChange={(e) => setV(e.target.value)} maxLength={40} />
        <button className="btn" disabled={!v.trim()}>Guardar</button>
      </form>
    </Sheet>
  )
}

const EMOJIS_CAT = ['🐶', '🎮', '✈️', '📚', '🎁', '💇', '🏋️', '🍺', '☕', '📱', '🧾', '💳', '🎬', '🌱']

function NuevaCategoria({ open, onClose, hogarId, onSaved }: { open: boolean; onClose: () => void; hogarId: string; onSaved: () => Promise<void> }) {
  const [nombre, setNombre] = useState('')
  const [emoji, setEmoji] = useState(EMOJIS_CAT[0])
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { if (open) { setNombre(''); setError(null) } }, [open])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) return
    try {
      await api.addCategoria({ hogar_id: hogarId, nombre: nombre.trim(), emoji, activa: true, orden: 100 })
      await onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear')
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Nueva categoría">
      <form className="stack" onSubmit={submit}>
        <div className="chips">
          {EMOJIS_CAT.map((e) => (
            <button type="button" key={e} className={`chip ${emoji === e ? 'active' : ''}`} onClick={() => setEmoji(e)} style={{ fontSize: 20, width: 44, justifyContent: 'center', padding: 0 }}>{e}</button>
          ))}
        </div>
        <input className="input" placeholder="Nombre (ej: Mascotas)" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={20} />
        {error && <div className="error">{error}</div>}
        <button className="btn" disabled={!nombre.trim()}>Crear categoría</button>
      </form>
    </Sheet>
  )
}

function NuevoVencimiento({ open, onClose, hogarId, onSaved }: { open: boolean; onClose: () => void; hogarId: string; onSaved: () => void }) {
  const [nombre, setNombre] = useState('')
  const [dia, setDia] = useState('10')
  const [monto, setMonto] = useState('')
  useEffect(() => { if (open) { setNombre(''); setDia('10'); setMonto('') } }, [open])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const d = Number(dia)
    if (!nombre.trim() || !(d >= 1 && d <= 31)) return
    await api.addVencimiento({ hogar_id: hogarId, nombre: nombre.trim(), dia_del_mes: d, monto_estimado: monto ? parsePesos(monto) : null, activo: true })
    onSaved()
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Nuevo vencimiento">
      <form className="stack" onSubmit={submit}>
        <div className="field">
          <label htmlFor="v-nombre">Nombre</label>
          <input id="v-nombre" className="input" placeholder="Ej: Expensas" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={30} />
        </div>
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div className="field" style={{ width: 110 }}>
            <label htmlFor="v-dia">Día del mes</label>
            <input id="v-dia" className="input" type="number" min={1} max={31} value={dia} onChange={(e) => setDia(e.target.value)} />
          </div>
          <div className="field grow">
            <label htmlFor="v-monto">Monto estimado</label>
            <input id="v-monto" className="input num" inputMode="numeric" placeholder="$0" value={monto ? `$${monto}` : ''} onChange={(e) => setMonto(formatMontoInput(e.target.value))} />
          </div>
        </div>
        <button className="btn" disabled={!nombre.trim()}>Agregar</button>
      </form>
    </Sheet>
  )
}

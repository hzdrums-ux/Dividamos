import { useState, type FormEvent, type ReactNode } from 'react'
import { Icon, Logo } from '../components/Icon'
import { api } from '../lib'
import { normalizarCodigo } from '../lib/format'
import { AVATAR_COLORS, DIVISIONES, REGIONES, type Division, type Hogar, type Region } from '../lib/types'
import { useStore } from '../store'

type Mode = 'login' | 'elegir' | 'crear' | 'unirse'
type CrearStep = 'cuenta' | 'nombre' | 'region' | 'division' | 'codigo'

const REGION_EMOJI: Record<Region, string> = {
  CABA: '🏙️',
  GBA: '🏘️',
  Córdoba: '⛰️',
  Rosario: '🌊',
  Mendoza: '🍇',
  Tucumán: '🌿',
  Otra: '📍',
}

const DIVISION_TEXTO: Record<Division, string> = {
  '50/50': 'Mitad y mitad, todo parejo',
  '60/40': 'Uno pone un poco más',
  '70/30': 'Según lo que gana cada uno',
}

export function Auth() {
  const { status, refresh, signOutLocal } = useAuthHelpers()
  const [mode, setMode] = useState<Mode>(status === 'onboarding' ? 'elegir' : 'login')
  const effectiveMode: Mode = status === 'onboarding' && mode === 'login' ? 'elegir' : mode

  return (
    <div className="auth">
      {effectiveMode === 'login' && <Login onCrear={() => setMode('crear')} onUnirse={() => setMode('unirse')} />}
      {effectiveMode === 'elegir' && (
        <Elegir onCrear={() => setMode('crear')} onUnirse={() => setMode('unirse')} onSalir={signOutLocal} />
      )}
      {effectiveMode === 'crear' && <Crear loggedIn={status === 'onboarding'} onBack={() => setMode(status === 'onboarding' ? 'elegir' : 'login')} onDone={refresh} />}
      {effectiveMode === 'unirse' && <Unirse loggedIn={status === 'onboarding'} onBack={() => setMode(status === 'onboarding' ? 'elegir' : 'login')} onDone={refresh} />}
    </div>
  )
}

function useAuthHelpers() {
  const { status, refresh } = useStore()
  return { status, refresh, signOutLocal: () => api.signOut() }
}

function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark">
        <Logo size={24} />
      </span>
      Dividamos
    </div>
  )
}

function useSubmit() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const run = async (fn: () => Promise<void>) => {
    setLoading(true)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Algo salió mal, probá de nuevo')
    } finally {
      setLoading(false)
    }
  }
  return { loading, error, setError, run }
}

/* ───────────── Login ───────────── */

function Login({ onCrear, onUnirse }: { onCrear: () => void; onUnirse: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { loading, error, run } = useSubmit()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    run(() => api.signIn(email.trim(), password))
  }

  return (
    <>
      <Brand />
      <div style={{ margin: '48px 0 28px' }}>
        <h1 className="h1" style={{ fontSize: 30 }}>
          Las cuentas del hogar,
          <br />
          <span style={{ color: 'var(--primary)' }}>en equipo.</span>
        </h1>
        <p className="muted" style={{ marginTop: 10 }}>
          Registrá gastos, dividí entre los dos y ahorren para lo que importa.
        </p>
      </div>

      <form className="stack" onSubmit={submit}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" className="input" type="email" autoComplete="email" inputMode="email" placeholder="vos@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="pw">Contraseña</label>
          <input id="pw" className="input" type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <div className="error">{error}</div>}
        <button className="btn" disabled={loading} style={{ marginTop: 6 }}>
          {loading ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>

      {api.mode === 'demo' && (
        <div className="info small" style={{ marginTop: 16 }}>
          <b>Modo demo.</b> Probá con <b>lucas@dividamos.app</b> o <b>sara@dividamos.app</b>, contraseña <b>dividamos123</b>.
          <button
            type="button"
            className="link"
            style={{ display: 'block', marginTop: 6 }}
            onClick={() => run(() => api.signIn('lucas@dividamos.app', 'dividamos123'))}
          >
            Entrar como Lucas →
          </button>
        </div>
      )}

      <div style={{ flex: 1 }} />
      <div className="stack" style={{ marginTop: 32 }}>
        <button type="button" className="btn secondary" onClick={onCrear}>
          Crear un hogar nuevo
        </button>
        <button type="button" className="btn ghost" onClick={onUnirse}>
          Tengo un código de invitación
        </button>
      </div>
    </>
  )
}

/* ───────────── Elegir (logueado sin hogar) ───────────── */

function Elegir({ onCrear, onUnirse, onSalir }: { onCrear: () => void; onUnirse: () => void; onSalir: () => void }) {
  return (
    <>
      <Brand />
      <div style={{ margin: '48px 0 28px' }}>
        <h1 className="h1">¡Ya casi! 🙌</h1>
        <p className="muted" style={{ marginTop: 8 }}>
          Tu cuenta todavía no está en ningún hogar.
        </p>
      </div>
      <div className="stack">
        <button className="option" onClick={onCrear}>
          <span className="cat-icon">🏡</span>
          <span>
            <span className="h3" style={{ display: 'block' }}>Crear un hogar</span>
            <span className="small muted">Y después invitás a tu pareja o roomies</span>
          </span>
        </button>
        <button className="option" onClick={onUnirse}>
          <span className="cat-icon">🔑</span>
          <span>
            <span className="h3" style={{ display: 'block' }}>Unirme con un código</span>
            <span className="small muted">Te lo pasaron como DIV·XXXX</span>
          </span>
        </button>
      </div>
      <div style={{ flex: 1 }} />
      <button className="btn ghost" onClick={onSalir} style={{ marginTop: 24 }}>
        Cerrar sesión
      </button>
    </>
  )
}

/* ───────────── Crear hogar ───────────── */

function StepHeader({ step, total, onBack, children }: { step: number; total: number; onBack?: () => void; children: ReactNode }) {
  return (
    <>
      <div className="row" style={{ marginBottom: 24 }}>
        {onBack ? (
          <button type="button" className="icon-btn" onClick={onBack} aria-label="Volver">
            <Icon name="back" />
          </button>
        ) : (
          <span style={{ width: 40 }} />
        )}
        <div className="steps grow">
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={i < step ? 'on' : ''} />
          ))}
        </div>
        <span className="small muted" style={{ width: 40, textAlign: 'right' }}>
          {step}/{total}
        </span>
      </div>
      <div style={{ marginBottom: 24 }}>{children}</div>
    </>
  )
}

function Crear({ loggedIn, onBack, onDone }: { loggedIn: boolean; onBack: () => void; onDone: () => Promise<void> }) {
  // Fijo al montar: al crear la cuenta el usuario pasa a estar logueado pero el flujo sigue igual.
  const [pasos] = useState<CrearStep[]>(() =>
    loggedIn ? ['nombre', 'region', 'division', 'codigo'] : ['cuenta', 'nombre', 'region', 'division', 'codigo']
  )
  const [step, setStep] = useState<CrearStep>(pasos[0])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [region, setRegion] = useState<Region | null>(null)
  const [division, setDivision] = useState<Division>('50/50')
  const [hogar, setHogar] = useState<Hogar | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const { loading, error, run } = useSubmit()
  const { toast } = useStore()

  const idx = pasos.indexOf(step)
  const prev = () => (idx === 0 || (loggedIn && pasos[idx - 1] === 'cuenta') ? onBack() : setStep(pasos[idx - 1]))
  const next = () => setStep(pasos[idx + 1])

  if (step === 'cuenta') {
    return (
      <form
        className="stack"
        style={{ flex: 1 }}
        onSubmit={(e) => {
          e.preventDefault()
          run(async () => {
            const { needsConfirmation } = await api.signUp(email.trim(), password)
            if (needsConfirmation) {
              setAviso('Te mandamos un mail para confirmar tu cuenta. Confirmalo, ingresá y seguimos desde acá.')
              return
            }
            next()
          })
        }}
      >
        <StepHeader step={idx + 1} total={pasos.length} onBack={prev}>
          <h1 className="h1">Creá tu cuenta</h1>
          <p className="muted" style={{ marginTop: 6 }}>Con esto vas a ingresar a Dividamos.</p>
        </StepHeader>
        <div className="field">
          <label htmlFor="c-email">Email</label>
          <input id="c-email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vos@email.com" required />
        </div>
        <div className="field">
          <label htmlFor="c-pw">Contraseña</label>
          <input id="c-pw" className="input" type="password" autoComplete="new-password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required />
        </div>
        {error && <div className="error">{error}</div>}
        {aviso && <div className="info">{aviso}</div>}
        <div style={{ flex: 1 }} />
        <button className="btn" disabled={loading}>{loading ? 'Creando…' : 'Continuar'}</button>
      </form>
    )
  }

  if (step === 'nombre') {
    return (
      <form
        className="stack"
        style={{ flex: 1 }}
        onSubmit={(e) => {
          e.preventDefault()
          if (nombre.trim()) next()
        }}
      >
        <StepHeader step={idx + 1} total={pasos.length} onBack={prev}>
          <h1 className="h1">¿Cómo te llamás?</h1>
          <p className="muted" style={{ marginTop: 6 }}>Así te van a ver los demás en el hogar.</p>
        </StepHeader>
        <input className="input" autoFocus autoComplete="given-name" placeholder="Tu nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={30} style={{ fontSize: 20, height: 60 }} />
        <div style={{ flex: 1 }} />
        <button className="btn" disabled={!nombre.trim()}>Continuar</button>
      </form>
    )
  }

  if (step === 'region') {
    return (
      <div className="stack" style={{ flex: 1 }}>
        <StepHeader step={idx + 1} total={pasos.length} onBack={prev}>
          <h1 className="h1">¿Dónde viven, {nombre.trim()}?</h1>
          <p className="muted" style={{ marginTop: 6 }}>Lo usamos para comparar precios e inflación de tu zona.</p>
        </StepHeader>
        <div className="option-grid">
          {REGIONES.map((r) => (
            <button key={r} type="button" className={`option ${region === r ? 'active' : ''}`} onClick={() => setRegion(r)} style={r === 'Otra' ? { gridColumn: 'span 2' } : undefined}>
              <span style={{ fontSize: 20 }}>{REGION_EMOJI[r]}</span> {r}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn" disabled={!region} onClick={next}>Continuar</button>
      </div>
    )
  }

  if (step === 'division') {
    return (
      <div className="stack" style={{ flex: 1 }}>
        <StepHeader step={idx + 1} total={pasos.length} onBack={prev}>
          <h1 className="h1">¿Cómo dividen los gastos?</h1>
          <p className="muted" style={{ marginTop: 6 }}>Es la división por defecto. Después la podés cambiar en cada gasto.</p>
        </StepHeader>
        {DIVISIONES.map((d) => {
          const [a, b] = d.split('/').map(Number)
          return (
            <button key={d} type="button" className={`option ${division === d ? 'active' : ''}`} onClick={() => setDivision(d)}>
              <div className="grow">
                <div className="h2">{d}</div>
                <div className="small muted">{DIVISION_TEXTO[d]}</div>
                <div className="progress" style={{ marginTop: 10, height: 8, display: 'flex', background: '#FBCFE8' }}>
                  <span style={{ width: `${(a / (a + b)) * 100}%`, borderRadius: 0 }} />
                </div>
              </div>
              <span className="check">{division === d && <Icon name="check" size={14} stroke={3} />}</span>
            </button>
          )
        })}
        {error && <div className="error">{error}</div>}
        <div style={{ flex: 1 }} />
        <button
          className="btn"
          disabled={loading}
          onClick={() =>
            run(async () => {
              const h = await api.crearHogar({ nombreUsuario: nombre.trim(), region: region!, division, avatarColor: AVATAR_COLORS[0] })
              setHogar(h)
              next()
            })
          }
        >
          {loading ? 'Creando hogar…' : 'Crear hogar'}
        </button>
      </div>
    )
  }

  // step === 'codigo'
  const compartir = async () => {
    const texto = `¡Sumate a nuestro hogar en Dividamos! Usá el código ${hogar!.codigo_invitacion}`
    try {
      if (navigator.share) await navigator.share({ title: 'Dividamos', text: texto })
      else {
        await navigator.clipboard.writeText(hogar!.codigo_invitacion)
        toast('Código copiado')
      }
    } catch {
      /* cancelado */
    }
  }

  return (
    <div className="stack" style={{ flex: 1 }}>
      <StepHeader step={pasos.length} total={pasos.length}>
        <h1 className="h1">¡Listo, {nombre.trim()}! 🎉</h1>
        <p className="muted" style={{ marginTop: 6 }}>Tu hogar está creado. Compartí este código para que se sumen.</p>
      </StepHeader>
      <div className="code-box">
        <div className="small muted bold" style={{ marginBottom: 8 }}>CÓDIGO DE INVITACIÓN</div>
        <div className="code">{hogar?.codigo_invitacion}</div>
        <div className="small muted" style={{ marginTop: 8 }}>
          {hogar?.region} · División {hogar?.division_default}
        </div>
      </div>
      <button className="btn secondary" onClick={compartir}>
        <Icon name="share" size={18} /> Compartir código
      </button>
      <div style={{ flex: 1 }} />
      <button className="btn" onClick={() => onDone()}>
        Empezar <Icon name="arrowRight" size={18} />
      </button>
    </div>
  )
}

/* ───────────── Unirse con código ───────────── */

function Unirse({ loggedIn, onBack, onDone }: { loggedIn: boolean; onBack: () => void; onDone: () => Promise<void> }) {
  const [codigo, setCodigo] = useState('DIV·')
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [aviso, setAviso] = useState<string | null>(null)
  const { loading, error, setError, run } = useSubmit()

  const onCodigo = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 4)
    setCodigo(`DIV·${digits}`)
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const c = normalizarCodigo(codigo)
    if (!c) return setError('El código tiene 4 números, por ejemplo DIV·4821')
    run(async () => {
      if (!loggedIn) {
        const { needsConfirmation } = await api.signUp(email.trim(), password)
        if (needsConfirmation) {
          setAviso('Te mandamos un mail para confirmar tu cuenta. Confirmalo, ingresá y volvé a poner el código.')
          return
        }
      }
      await api.unirseHogar({ codigo: c, nombreUsuario: nombre.trim(), avatarColor: AVATAR_COLORS[1] })
      await onDone()
    })
  }

  return (
    <form className="stack" style={{ flex: 1 }} onSubmit={submit}>
      <div className="row" style={{ marginBottom: 12 }}>
        <button type="button" className="icon-btn" onClick={onBack} aria-label="Volver">
          <Icon name="back" />
        </button>
      </div>
      <div style={{ marginBottom: 8 }}>
        <h1 className="h1">Unite a un hogar</h1>
        <p className="muted" style={{ marginTop: 6 }}>Ingresá el código que te compartieron.</p>
      </div>
      <input
        className="input code-input"
        inputMode="numeric"
        autoFocus
        aria-label="Código de invitación"
        value={codigo}
        onChange={(e) => onCodigo(e.target.value)}
        onFocus={(e) => e.target.setSelectionRange(e.target.value.length, e.target.value.length)}
      />
      <div className="field">
        <label htmlFor="u-nombre">Tu nombre</label>
        <input id="u-nombre" className="input" autoComplete="given-name" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={30} required />
      </div>
      {!loggedIn && (
        <>
          <div className="field">
            <label htmlFor="u-email">Email</label>
            <input id="u-email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vos@email.com" required />
          </div>
          <div className="field">
            <label htmlFor="u-pw">Contraseña</label>
            <input id="u-pw" className="input" type="password" autoComplete="new-password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required />
          </div>
        </>
      )}
      {error && <div className="error">{error}</div>}
      {aviso && <div className="info">{aviso}</div>}
      <div style={{ flex: 1 }} />
      <button className="btn" disabled={loading || !nombre.trim()} style={{ marginTop: 12 }}>
        {loading ? 'Uniéndote…' : 'Unirme al hogar'}
      </button>
    </form>
  )
}

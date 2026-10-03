import { useCallback, useEffect, useState } from 'react'
import { Icon } from '../components/Icon'
import { INDICADORES } from '../data/indicadores'
import { pesos } from '../lib/format'

interface Dolar {
  nombre: string
  compra: number
  venta: number
  fechaActualizacion: string
}

interface Noticia {
  title: string
  link: string
  pubDate: string
  thumbnail?: string
  enclosure?: { link?: string }
  description?: string
}

const FEEDS = [
  { nombre: 'Ámbito', url: 'https://www.ambito.com/rss/pages/economia.xml' },
  { nombre: 'Infobae', url: 'https://www.infobae.com/arc/outboundfeeds/rss/category/economia/' },
  { nombre: 'Página/12', url: 'https://www.pagina12.com.ar/rss/secciones/economia/notas' },
]

const rss2json = (url: string) => `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`

function hace(fecha: string): string {
  const d = new Date(fecha.replace(' ', 'T'))
  const min = Math.round((Date.now() - d.getTime()) / 60000)
  if (Number.isNaN(min)) return ''
  if (min < 60) return `Hace ${Math.max(1, min)} min`
  if (min < 60 * 24) return `Hace ${Math.round(min / 60)} h`
  const dias = Math.round(min / 1440)
  return dias === 1 ? 'Ayer' : `Hace ${dias} días`
}

function imagenDe(n: Noticia): string | null {
  if (n.thumbnail) return n.thumbnail
  if (n.enclosure?.link) return n.enclosure.link
  const m = n.description?.match(/<img[^>]+src="([^"]+)"/)
  return m?.[1] ?? null
}

export function Noticias({ onBack }: { onBack: () => void }) {
  const [dolares, setDolares] = useState<Dolar[] | null>(null)
  const [dolarError, setDolarError] = useState(false)
  const [noticias, setNoticias] = useState<Noticia[] | null>(null)
  const [fuente, setFuente] = useState<string>('')
  const [noticiasError, setNoticiasError] = useState(false)

  const cargarDolar = useCallback(async () => {
    setDolarError(false)
    try {
      const [oficial, blue] = await Promise.all(
        ['oficial', 'blue'].map((c) => fetch(`https://dolarapi.com/v1/dolares/${c}`).then((r) => (r.ok ? r.json() : Promise.reject(r))))
      )
      setDolares([oficial, blue])
    } catch {
      setDolarError(true)
    }
  }, [])

  const cargarNoticias = useCallback(async () => {
    setNoticiasError(false)
    for (const f of FEEDS) {
      try {
        const r = await fetch(rss2json(f.url))
        const j = await r.json()
        if (j.status === 'ok' && j.items?.length) {
          setNoticias(j.items.slice(0, 10))
          setFuente(f.nombre)
          return
        }
      } catch {
        /* probar el siguiente feed */
      }
    }
    setNoticiasError(true)
    setNoticias([])
  }, [])

  useEffect(() => {
    cargarDolar()
    cargarNoticias()
  }, [cargarDolar, cargarNoticias])

  const brecha = dolares ? ((dolares[1].venta - dolares[0].venta) / dolares[0].venta) * 100 : null

  return (
    <div className="screen">
      <header className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="Volver">
          <Icon name="back" />
        </button>
        <span className="title">Economía hoy</span>
        <button
          className="icon-btn"
          onClick={() => {
            setDolares(null)
            setNoticias(null)
            cargarDolar()
            cargarNoticias()
          }}
          aria-label="Actualizar"
        >
          <Icon name="refresh" size={20} />
        </button>
      </header>

      {/* Dólar */}
      <div className="kpi-grid">
        {dolarError ? (
          <div className="kpi" style={{ gridColumn: 'span 2' }}>
            <div className="small muted">No pudimos traer la cotización del dólar.</div>
            <button className="link" onClick={cargarDolar} style={{ marginTop: 6 }}>Reintentar</button>
          </div>
        ) : dolares === null ? (
          [0, 1].map((i) => <div key={i} className="skeleton" style={{ height: 104, borderRadius: 18 }} />)
        ) : (
          dolares.map((d, i) => (
            <div className="kpi" key={d.nombre} style={i === 1 ? { background: 'linear-gradient(140deg,#8B5CF6,#6D28D9)', color: '#fff' } : undefined}>
              <div className="k-label" style={i === 1 ? { color: 'rgba(255,255,255,0.85)' } : undefined}>
                Dólar {d.nombre}
              </div>
              <div className="k-value num">{pesos(d.venta)}</div>
              <div className="k-foot" style={i === 1 ? { color: 'rgba(255,255,255,0.8)' } : undefined}>
                Compra {pesos(d.compra)}
              </div>
            </div>
          ))
        )}
      </div>
      {dolares && (
        <div className="xs muted" style={{ margin: '8px 4px 0' }}>
          Brecha {brecha!.toFixed(1).replace('.', ',')}% · Actualizado {hace(dolares[0].fechaActualizacion).toLowerCase()} · dolarapi.com
        </div>
      )}

      {/* Indicadores */}
      <div className="section-title">
        <h2 className="h2">Indicadores</h2>
      </div>
      <div className="list">
        <div className="list-item">
          <span className="cat-icon">📈</span>
          <div className="grow">
            <div className="title">Inflación (IPC)</div>
            <div className="meta">{INDICADORES.ipc.periodo} · {INDICADORES.ipc.fuente}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="amount num">{INDICADORES.ipc.mensual.toString().replace('.', ',')}%</div>
            <div className="xs muted num">{INDICADORES.ipc.interanual.toString().replace('.', ',')}% i.a.</div>
          </div>
        </div>
        <div className="list-item">
          <span className="cat-icon">💼</span>
          <div className="grow">
            <div className="title">Salario Mínimo (SMVM)</div>
            <div className="meta">Desde {INDICADORES.smvm.vigenteDesde}</div>
          </div>
          <div className="amount num">{pesos(INDICADORES.smvm.mensual)}</div>
        </div>
        <div className="list-item">
          <span className="cat-icon">👨‍👩‍👧</span>
          <div className="grow">
            <div className="title">AUH por hijo</div>
            <div className="meta">Desde {INDICADORES.auh.vigenteDesde} · {INDICADORES.auh.fuente}</div>
          </div>
          <div className="amount num">{pesos(INDICADORES.auh.porHijo)}</div>
        </div>
      </div>

      {/* Noticias */}
      <div className="section-title">
        <h2 className="h2">Noticias</h2>
        {fuente && <span className="small muted">vía {fuente}</span>}
      </div>
      <div className="list">
        {noticias === null ? (
          [0, 1, 2].map((i) => (
            <div key={i} className="news-item">
              <div className="skeleton" style={{ width: 72, height: 72, borderRadius: 12 }} />
              <div className="grow stack" style={{ gap: 8 }}>
                <div className="skeleton" style={{ height: 14 }} />
                <div className="skeleton" style={{ height: 14, width: '70%' }} />
              </div>
            </div>
          ))
        ) : noticiasError ? (
          <div className="empty">
            <span className="emoji">📰</span>
            No pudimos cargar las noticias.
            <br />
            <button className="link" style={{ marginTop: 8 }} onClick={cargarNoticias}>Reintentar</button>
          </div>
        ) : (
          noticias.map((n) => {
            const img = imagenDe(n)
            return (
              <a key={n.link} className="news-item" href={n.link} target="_blank" rel="noopener noreferrer">
                {img ? <img src={img} alt="" loading="lazy" /> : <span className="cat-icon" style={{ width: 72, height: 72 }}>📰</span>}
                <div className="grow">
                  <div className="t">{n.title}</div>
                  <div className="xs muted" style={{ marginTop: 6 }}>{hace(n.pubDate)}</div>
                </div>
              </a>
            )
          })
        )}
      </div>
    </div>
  )
}

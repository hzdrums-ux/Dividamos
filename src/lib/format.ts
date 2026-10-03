const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
export const DIAS_CORTOS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

/** $142.800 — pesos con punto como separador de miles, sin decimales. */
export function pesos(n: number): string {
  const neg = n < 0
  const s = Math.round(Math.abs(n))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${neg ? '-' : ''}$${s}`
}

/** $1,2M / $142k para ejes y etiquetas compactas. */
export function pesosCorto(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1).replace('.', ',').replace(',0', '')}M`
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000)}k`
  return pesos(n)
}

/** Parsea "142.800" o "142800,50" a número. */
export function parsePesos(s: string): number {
  const clean = s.replace(/[^\d,]/g, '').replace(',', '.')
  return clean ? Number(clean) : 0
}

/** Formatea lo que el usuario va tipeando en el input de monto. */
export function formatMontoInput(s: string): string {
  const digits = s.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 11)
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export function hoyISO(): string {
  return toISO(new Date())
}

export function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseISO(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function mesNombre(m: number): string {
  return MESES[m]
}

export function mesCorto(m: number): string {
  return MESES_CORTOS[m]
}

export function mesAnio(d: Date): string {
  const s = `${MESES[d.getMonth()]} ${d.getFullYear()}`
  return s[0].toUpperCase() + s.slice(1)
}

export function fechaLarga(iso: string): string {
  const d = parseISO(iso)
  return `${d.getDate()} de ${MESES[d.getMonth()]}`
}

export function fechaCorta(iso: string): string {
  const d = parseISO(iso)
  return `${d.getDate()} ${MESES_CORTOS[d.getMonth()]}${d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : ''}`
}

/** Hoy · Ayer · Hace 3 días · 12 sep */
export function fechaRelativa(iso: string): string {
  const d = parseISO(iso)
  const hoy = parseISO(hoyISO())
  const diff = Math.round((hoy.getTime() - d.getTime()) / 86_400_000)
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Ayer'
  if (diff > 1 && diff < 7) return `Hace ${diff} días`
  if (diff === -1) return 'Mañana'
  return fechaCorta(iso)
}

export function inicioMes(d = new Date()): string {
  return toISO(new Date(d.getFullYear(), d.getMonth(), 1))
}

export function finMes(d = new Date()): string {
  return toISO(new Date(d.getFullYear(), d.getMonth() + 1, 0))
}

export function iniciales(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/** Normaliza lo que tipea el usuario a DIV·XXXX (o null si no tiene 4 dígitos). */
export function normalizarCodigo(s: string): string | null {
  const digits = s.replace(/\D/g, '')
  return digits.length === 4 ? `DIV·${digits}` : null
}

import type { DivisionGasto, Gasto, Usuario } from './types'

/**
 * Porcentaje que le corresponde a cada miembro de un gasto.
 * La división "A/B" se lee en el orden de los miembros del hogar
 * (el que creó el hogar primero). Con más de 2 miembros se reparte en partes iguales.
 */
export function shares(division: DivisionGasto, miembros: Usuario[]): number[] {
  if (miembros.length === 0) return []
  if (miembros.length !== 2) return miembros.map(() => 1 / miembros.length)
  const [a, b] = division.split('/').map(Number)
  return [a / (a + b), b / (a + b)]
}

export interface Deuda {
  de: string
  a: string
  monto: number
}

export interface Balance {
  pagado: Record<string, number>
  corresponde: Record<string, number>
  neto: Record<string, number> // positivo = le deben
  deudas: Deuda[]
  total: number
}

export function calcularBalance(gastos: Gasto[], miembros: Usuario[]): Balance {
  const pagado: Record<string, number> = {}
  const corresponde: Record<string, number> = {}
  miembros.forEach((m) => {
    pagado[m.id] = 0
    corresponde[m.id] = 0
  })
  let total = 0
  for (const g of gastos) {
    total += g.monto
    pagado[g.quien_pago] = (pagado[g.quien_pago] ?? 0) + g.monto
    shares(g.division, miembros).forEach((s, i) => {
      corresponde[miembros[i].id] += g.monto * s
    })
  }
  const neto: Record<string, number> = {}
  for (const id of Object.keys(pagado)) neto[id] = pagado[id] - (corresponde[id] ?? 0)

  // Saldar: los que deben le pagan a los que les deben (greedy, mínimo de transferencias).
  const deudores = Object.entries(neto).filter(([, v]) => v < -0.5).map(([id, v]) => ({ id, v: -v })).sort((x, y) => y.v - x.v)
  const acreedores = Object.entries(neto).filter(([, v]) => v > 0.5).map(([id, v]) => ({ id, v })).sort((x, y) => y.v - x.v)
  const deudas: Deuda[] = []
  let i = 0
  let j = 0
  while (i < deudores.length && j < acreedores.length) {
    const m = Math.min(deudores[i].v, acreedores[j].v)
    deudas.push({ de: deudores[i].id, a: acreedores[j].id, monto: Math.round(m) })
    deudores[i].v -= m
    acreedores[j].v -= m
    if (deudores[i].v < 0.5) i++
    if (acreedores[j].v < 0.5) j++
  }
  return { pagado, corresponde, neto, deudas, total }
}

export function totalPorCategoria(gastos: Gasto[]): { categoria: string; total: number }[] {
  const map = new Map<string, number>()
  for (const g of gastos) map.set(g.categoria, (map.get(g.categoria) ?? 0) + g.monto)
  return [...map.entries()].map(([categoria, total]) => ({ categoria, total })).sort((a, b) => b.total - a.total)
}

/** Pequeño "handoff" entre pantallas (ej.: tocar una categoría en Inicio abre Agregar con esa categoría). */
let categoriaPreset: string | null = null

export function setCategoriaPreset(c: string | null) {
  categoriaPreset = c
}

export function takeCategoriaPreset(): string | null {
  const c = categoriaPreset
  categoriaPreset = null
  return c
}

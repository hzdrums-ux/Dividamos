/**
 * Indicadores económicos "hardcodeados actualizables".
 * Editá estos valores cuando salga un dato nuevo (INDEC / Boletín Oficial / ANSES)
 * y volvé a desplegar. No hay API pública estable para todos ellos.
 */
export const INDICADORES = {
  ipc: {
    periodo: 'Agosto 2026',
    mensual: 1.9, // % variación mensual
    interanual: 27.4, // % variación interanual
    acumulado: 16.8, // % acumulado en el año
    fuente: 'INDEC',
    // Últimos 6 meses (para el mini gráfico), del más viejo al más nuevo
    historico: [
      { mes: 'Mar', valor: 2.6 },
      { mes: 'Abr', valor: 2.4 },
      { mes: 'May', valor: 2.2 },
      { mes: 'Jun', valor: 2.1 },
      { mes: 'Jul', valor: 2.0 },
      { mes: 'Ago', valor: 1.9 },
    ],
  },
  smvm: {
    vigenteDesde: 'Septiembre 2026',
    mensual: 371_200,
    fuente: 'Consejo del Salario · Boletín Oficial',
  },
  auh: {
    vigenteDesde: 'Septiembre 2026',
    porHijo: 118_400,
    fuente: 'ANSES',
  },
} as const

export const clp = (value) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value || 0)

export const pct = (value) =>
  new Intl.NumberFormat('es-CL', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value || 0)

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export const monthLabel = (m) => MESES[(m || 1) - 1]?.slice(0, 3)

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { clp, monthLabel, MESES } from '../lib/format'
import { exportToCsv } from '../lib/csvExport'

const STATUS_LABEL = { por_facturar: 'Por facturar', facturado: 'Facturado', pagado: 'Pagado' }
const STATUS_COLOR = {
  por_facturar: 'bg-[var(--color-amber)]/15 text-[var(--color-amber)]',
  facturado: 'bg-blue-400/15 text-blue-300',
  pagado: 'bg-[var(--color-lime)]/15 text-[var(--color-lime)]',
}

const EXPORT_COLUMNS = [
  { key: 'notmedia_id', label: 'ID' },
  { key: 'company_name', label: 'Empresa' },
  { key: 'brand_name', label: 'Marca' },
  { key: 'business_unit_name', label: 'Unidad de negocio' },
  { key: 'title', label: 'Título' },
  { key: 'exhibition_month', label: 'Mes exhibición' },
  { key: 'exhibition_year', label: 'Año exhibición' },
  { key: 'sale_amount', label: 'Venta' },
  { key: 'cost_amount', label: 'Costo' },
  { key: 'margin_amount', label: 'Margen' },
  { key: 'margin_pct', label: 'Margen %' },
  { key: 'billing_status', label: 'Estado facturación' },
  { key: 'invoice_date', label: 'Fecha factura' },
  { key: 'invoice_number', label: 'N° factura' },
  { key: 'owner_name', label: 'Owner' },
]

export default function DealsList({ refreshKey }) {
  const [deals, setDeals] = useState([])
  const [units, setUnits] = useState([])
  const [search, setSearch] = useState('')
  const [unitFilter, setUnitFilter] = useState('todas')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [yearFilter, setYearFilter] = useState('todos')
  const [monthFilter, setMonthFilter] = useState('todos')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('business_units').select('name').order('name').then(({ data }) => setUnits((data || []).map((d) => d.name)))
  }, [])

  useEffect(() => {
    setLoading(true)
    supabase
      .from('deals_enriched')
      .select('*')
      .order('exhibition_year', { ascending: false })
      .order('exhibition_month', { ascending: false })
      .limit(1000)
      .then(({ data }) => {
        setDeals(data || [])
        setLoading(false)
      })
  }, [refreshKey])

  const years = useMemo(() => [...new Set(deals.map((d) => d.exhibition_year))].sort((a, b) => b - a), [deals])

  const filtered = useMemo(() => deals.filter((d) => {
    const q = search.toLowerCase()
    const matchesSearch = !q || d.company_name?.toLowerCase().includes(q) || d.brand_name?.toLowerCase().includes(q) || String(d.notmedia_id).includes(q)
    const matchesUnit = unitFilter === 'todas' || d.business_unit_name === unitFilter
    const matchesStatus = statusFilter === 'todos' || d.billing_status === statusFilter
    const matchesYear = yearFilter === 'todos' || d.exhibition_year === Number(yearFilter)
    const matchesMonth = monthFilter === 'todos' || d.exhibition_month === Number(monthFilter)
    return matchesSearch && matchesUnit && matchesStatus && matchesYear && matchesMonth
  }), [deals, search, unitFilter, statusFilter, yearFilter, monthFilter])

  const selCls = 'rounded-md px-3 py-1.5 text-sm'

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <input
          className="rounded-md px-3 py-2 text-sm w-full max-w-xs"
          placeholder="Buscar por empresa, marca o ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className={selCls} value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)}>
          <option value="todas">Todas las unidades</option>
          {units.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
        <select className={selCls} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="todos">Todos los estados</option>
          <option value="por_facturar">Por facturar</option>
          <option value="facturado">Facturado</option>
          <option value="pagado">Pagado</option>
        </select>
        <select className={selCls} value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
          <option value="todos">Todos los años</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className={selCls} value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
          <option value="todos">Todos los meses</option>
          {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <button
          onClick={() => exportToCsv('ventas', filtered, EXPORT_COLUMNS)}
          className="ml-auto rounded-md border border-[var(--color-lime)] text-[var(--color-lime)] text-sm px-3 py-1.5 hover:bg-[var(--color-lime)]/10"
        >
          Exportar CSV ({filtered.length})
        </button>
      </div>

      <div className="overflow-auto rounded-xl border border-[var(--color-line)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-panel-raised)] text-[var(--color-muted)] text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-3 py-2">ID</th>
              <th className="text-left px-3 py-2">Empresa</th>
              <th className="text-left px-3 py-2">Marca</th>
              <th className="text-left px-3 py-2">Unidad</th>
              <th className="text-left px-3 py-2">Exhibición</th>
              <th className="text-right px-3 py-2">Venta</th>
              <th className="text-right px-3 py-2">Margen</th>
              <th className="text-left px-3 py-2">Estado</th>
              <th className="text-left px-3 py-2">Owner</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={9} className="px-3 py-6 text-center text-[var(--color-muted)]">Cargando…</td></tr>}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={9} className="px-3 py-6 text-center text-[var(--color-muted)]">Sin resultados</td></tr>
            )}
            {filtered.map((d) => (
              <tr key={d.id} className="border-t border-[var(--color-line)] hover:bg-[var(--color-panel)]">
                <td className="px-3 py-2 font-mono-num text-[var(--color-muted)]">#{d.notmedia_id}</td>
                <td className="px-3 py-2">{d.company_name}</td>
                <td className="px-3 py-2">{d.brand_name}</td>
                <td className="px-3 py-2">{d.business_unit_name}</td>
                <td className="px-3 py-2">{monthLabel(d.exhibition_month)} {d.exhibition_year}</td>
                <td className="px-3 py-2 text-right font-mono-num">{clp(d.sale_amount)}</td>
                <td className="px-3 py-2 text-right font-mono-num">{clp(d.margin_amount)}</td>
                <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLOR[d.billing_status]}`}>{STATUS_LABEL[d.billing_status]}</span></td>
                <td className="px-3 py-2 text-[var(--color-muted)]">{d.owner_name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

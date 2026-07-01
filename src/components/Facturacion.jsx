import { useEffect, useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { supabase } from '../lib/supabaseClient'
import { clp, monthLabel } from '../lib/format'
import { exportToCsv } from '../lib/csvExport'

const PALETTE = ['#CCFF66', '#9CD64A', '#FFC857', '#7DD3FC', '#FF6B5E', '#C084FC', '#34D399', '#F472B6']

const EXPORT_COLUMNS = [
  { key: 'notmedia_id', label: 'ID' },
  { key: 'company_name', label: 'Empresa' },
  { key: 'brand_name', label: 'Marca' },
  { key: 'business_unit_name', label: 'Unidad de negocio' },
  { key: 'title', label: 'Título' },
  { key: 'exhibition_month', label: 'Mes exhibición' },
  { key: 'exhibition_year', label: 'Año exhibición' },
  { key: 'sale_amount', label: 'Venta' },
  { key: 'owner_name', label: 'Owner' },
]

export default function Facturacion() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [availableYears, setAvailableYears] = useState([])
  const [units, setUnits] = useState([])
  const [pending, setPending] = useState([])
  const [selected, setSelected] = useState(null) // { month, unit } | null
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('business_units').select('name').order('name').then(({ data }) => setUnits((data || []).map((d) => d.name)))
  }, [])

  useEffect(() => {
    supabase
      .from('deals_enriched')
      .select('exhibition_year')
      .eq('billing_status', 'por_facturar')
      .then(({ data }) => {
        const ys = [...new Set((data || []).map((d) => d.exhibition_year))].sort((a, b) => b - a)
        setAvailableYears(ys)
        if (ys.length && !ys.includes(year)) setYear(ys[0])
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setLoading(true)
    supabase
      .from('deals_enriched')
      .select('*')
      .eq('billing_status', 'por_facturar')
      .eq('exhibition_year', year)
      .order('exhibition_month')
      .then(({ data }) => {
        setPending(data || [])
        setLoading(false)
      })
  }, [year])

  // Datos para el gráfico apilado: una fila por mes, una columna por unidad
  const chartData = useMemo(() => {
    const map = {}
    pending.forEach((d) => {
      map[d.exhibition_month] ??= { month: d.exhibition_month, label: monthLabel(d.exhibition_month) }
      map[d.exhibition_month][d.business_unit_name] = (map[d.exhibition_month][d.business_unit_name] || 0) + Number(d.sale_amount || 0)
    })
    return Object.values(map).sort((a, b) => a.month - b.month)
  }, [pending])

  // Matriz mes -> unidad -> { total, deals[] }
  const matrix = useMemo(() => {
    const m = {}
    pending.forEach((d) => {
      m[d.exhibition_month] ??= { month: d.exhibition_month, label: monthLabel(d.exhibition_month), total: 0, byUnit: {} }
      m[d.exhibition_month].total += Number(d.sale_amount || 0)
      m[d.exhibition_month].byUnit[d.business_unit_name] ??= { total: 0, deals: [] }
      m[d.exhibition_month].byUnit[d.business_unit_name].total += Number(d.sale_amount || 0)
      m[d.exhibition_month].byUnit[d.business_unit_name].deals.push(d)
    })
    return Object.values(m).sort((a, b) => a.month - b.month)
  }, [pending])

  const totalPending = pending.reduce((s, d) => s + Number(d.sale_amount || 0), 0)

  const selectedDeals = useMemo(() => {
    if (!selected) return null
    return pending.filter((d) => d.exhibition_month === selected.month && d.business_unit_name === selected.unit)
  }, [selected, pending])

  const selCls = 'rounded-md px-3 py-1.5 text-sm'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <select className={selCls} value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {(availableYears.length ? availableYears : [year]).map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <div className="bg-[var(--color-panel)] border border-[var(--color-line)] rounded-xl px-4 py-2">
          <span className="text-xs uppercase text-[var(--color-muted)]">Total pendiente de facturar {year}: </span>
          <span className="font-mono-num font-semibold text-[var(--color-amber)]">{clp(totalPending)}</span>
        </div>
        <button
          onClick={() => exportToCsv(`pendientes-facturar-${year}`, pending, EXPORT_COLUMNS)}
          className="ml-auto rounded-md border border-[var(--color-lime)] text-[var(--color-lime)] text-sm px-3 py-1.5 hover:bg-[var(--color-lime)]/10"
        >
          Exportar CSV ({pending.length})
        </button>
      </div>

      <div className="bg-[var(--color-panel)] border border-[var(--color-line)] rounded-xl p-5">
        <h3 className="font-display text-xl font-bold mb-1">Pendiente de facturar por unidad y mes</h3>
        <p className="text-xs text-[var(--color-muted)] mb-4">Click en una barra para ver el detalle de esos tratos.</p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
            <XAxis dataKey="label" stroke="#8FA396" fontSize={12} />
            <YAxis stroke="#8FA396" fontSize={12} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
            <Tooltip formatter={(v) => clp(v)} contentStyle={{ background: '#1E2A23', border: '1px solid #2A382F' }} />
            <Legend />
            {units.map((u, i) => (
              <Bar
                key={u}
                dataKey={u}
                stackId="a"
                fill={PALETTE[i % PALETTE.length]}
                cursor="pointer"
                onClick={(data) => setSelected({ month: data.month, unit: u })}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {selected && selectedDeals && (
        <div className="bg-[var(--color-panel)] border border-[var(--color-lime)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-xl font-bold">
              {selected.unit} · {monthLabel(selected.month)} {year}
            </h3>
            <button onClick={() => setSelected(null)} className="text-sm text-[var(--color-muted)] hover:text-[var(--color-paper)]">
              Cerrar ✕
            </button>
          </div>
          <DealsMiniTable deals={selectedDeals} />
        </div>
      )}

      <div className="bg-[var(--color-panel)] border border-[var(--color-line)] rounded-xl p-5">
        <h3 className="font-display text-xl font-bold mb-4">Detalle por mes y unidad de negocio</h3>
        {loading && <p className="text-[var(--color-muted)] text-sm">Cargando…</p>}
        {!loading && matrix.length === 0 && <p className="text-[var(--color-muted)] text-sm">No hay ventas pendientes de facturar en {year}.</p>}
        <div className="space-y-6">
          {matrix.map((m) => (
            <div key={m.month}>
              <div className="flex items-baseline justify-between border-b border-[var(--color-line)] pb-1 mb-2">
                <h4 className="font-display text-lg font-semibold">{m.label} {year}</h4>
                <span className="font-mono-num text-sm text-[var(--color-amber)]">{clp(m.total)}</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {Object.entries(m.byUnit).map(([unit, u]) => (
                  <button
                    key={unit}
                    onClick={() => setSelected({ month: m.month, unit })}
                    className="text-left bg-[var(--color-panel-raised)] rounded-lg p-3 hover:ring-1 hover:ring-[var(--color-lime)] transition"
                  >
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium">{unit}</span>
                      <span className="font-mono-num text-[var(--color-muted)]">{clp(u.total)}</span>
                    </div>
                    <p className="text-xs text-[var(--color-muted)]">{u.deals.length} trato(s) · click para ver detalle</p>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function DealsMiniTable({ deals }) {
  return (
    <div className="overflow-auto rounded-lg border border-[var(--color-line)]">
      <table className="w-full text-sm">
        <thead className="bg-[var(--color-panel-raised)] text-[var(--color-muted)] text-xs uppercase tracking-wide">
          <tr>
            <th className="text-left px-3 py-2">ID</th>
            <th className="text-left px-3 py-2">Empresa</th>
            <th className="text-left px-3 py-2">Marca</th>
            <th className="text-left px-3 py-2">Título</th>
            <th className="text-right px-3 py-2">Venta</th>
            <th className="text-left px-3 py-2">Owner</th>
          </tr>
        </thead>
        <tbody>
          {deals.map((d) => (
            <tr key={d.id} className="border-t border-[var(--color-line)]">
              <td className="px-3 py-2 font-mono-num text-[var(--color-muted)]">#{d.notmedia_id}</td>
              <td className="px-3 py-2">{d.company_name}</td>
              <td className="px-3 py-2">{d.brand_name}</td>
              <td className="px-3 py-2">{d.title || '—'}</td>
              <td className="px-3 py-2 text-right font-mono-num">{clp(d.sale_amount)}</td>
              <td className="px-3 py-2 text-[var(--color-muted)]">{d.owner_name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

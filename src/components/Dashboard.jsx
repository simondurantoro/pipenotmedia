import { useEffect, useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts'
import { supabase } from '../lib/supabaseClient'
import { clp, monthLabel } from '../lib/format'

const PALETTE = ['#CCFF66', '#9CD64A', '#FFC857', '#7DD3FC', '#FF6B5E', '#C084FC', '#34D399', '#F472B6']

function rangeForPreset(preset) {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  if (preset === 'mes') return { from: `${y}-${String(m).padStart(2, '0')}-01`, to: `${y}-${String(m).padStart(2, '0')}-28` }
  if (preset === 'trimestre') {
    const qStartMonth = Math.floor((m - 1) / 3) * 3 + 1
    return { from: `${y}-${String(qStartMonth).padStart(2, '0')}-01`, to: `${y}-12-31` }
  }
  return { from: `${y}-01-01`, to: `${y}-12-31` }
}

export default function Dashboard() {
  const [preset, setPreset] = useState('anio')
  const [from, setFrom] = useState(rangeForPreset('anio').from)
  const [to, setTo] = useState(rangeForPreset('anio').to)
  const [platformFilter, setPlatformFilter] = useState('todas')
  const [deals, setDeals] = useState([])
  const [dealsPrevYear, setDealsPrevYear] = useState([])
  const [units, setUnits] = useState([])

  useEffect(() => {
    const r = rangeForPreset(preset)
    setFrom(r.from)
    setTo(r.to)
  }, [preset])

  useEffect(() => {
    supabase.from('business_units').select('name').order('name').then(({ data }) => setUnits((data || []).map((d) => d.name)))
  }, [])

  useEffect(() => {
    if (!from || !to) return
    const [fy, fm] = from.split('-').map(Number)
    const [ty, tm] = to.split('-').map(Number)

    async function fetchRange(yearOffset) {
      const fromY = fy - yearOffset, toY = ty - yearOffset
      const { data } = await supabase
        .from('deals_enriched')
        .select('exhibition_month, exhibition_year, sale_amount, cost_amount, margin_amount, business_unit_name')
        .or(`and(exhibition_year.gt.${fromY},exhibition_year.lt.${toY}),and(exhibition_year.eq.${fromY},exhibition_month.gte.${fm}),and(exhibition_year.eq.${toY},exhibition_month.lte.${tm})`)
      return data || []
    }

    fetchRange(0).then(setDeals)
    fetchRange(1).then(setDealsPrevYear)
  }, [from, to])

  const filteredDeals = useMemo(
    () => (platformFilter === 'todas' ? deals : deals.filter((d) => d.business_unit_name === platformFilter)),
    [deals, platformFilter]
  )

  // Chart 1: ventas por mes, apiladas por unidad de negocio (o filtradas a una)
  const salesByMonth = useMemo(() => {
    const map = {}
    filteredDeals.forEach((d) => {
      const key = `${d.exhibition_year}-${String(d.exhibition_month).padStart(2, '0')}`
      map[key] ??= { key, label: `${monthLabel(d.exhibition_month)} ${d.exhibition_year}` }
      map[key][d.business_unit_name] = (map[key][d.business_unit_name] || 0) + Number(d.sale_amount || 0)
    })
    return Object.values(map).sort((a, b) => a.key.localeCompare(b.key))
  }, [filteredDeals])

  // Chart 2: margen por unidad de negocio (monto)
  const marginByUnit = useMemo(() => {
    const map = {}
    filteredDeals.forEach((d) => {
      map[d.business_unit_name] = (map[d.business_unit_name] || 0) + Number(d.margin_amount || 0)
    })
    return Object.entries(map).map(([name, margin]) => ({ name, margin })).sort((a, b) => b.margin - a.margin)
  }, [filteredDeals])

  // Chart 3: margen por unidad, año actual vs año anterior (mismas fechas)
  const yoyByUnit = useMemo(() => {
    const cur = {}, prev = {}
    filteredDeals.forEach((d) => { cur[d.business_unit_name] = (cur[d.business_unit_name] || 0) + Number(d.margin_amount || 0) })
    dealsPrevYear
      .filter((d) => platformFilter === 'todas' || d.business_unit_name === platformFilter)
      .forEach((d) => { prev[d.business_unit_name] = (prev[d.business_unit_name] || 0) + Number(d.margin_amount || 0) })
    const names = new Set([...Object.keys(cur), ...Object.keys(prev)])
    return [...names].map((name) => ({ name, actual: cur[name] || 0, anterior: prev[name] || 0 }))
  }, [filteredDeals, dealsPrevYear, platformFilter])

  const totalSales = filteredDeals.reduce((s, d) => s + Number(d.sale_amount || 0), 0)
  const totalMargin = filteredDeals.reduce((s, d) => s + Number(d.margin_amount || 0), 0)

  const selCls = 'rounded-md px-3 py-1.5 text-sm'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex gap-1 bg-[var(--color-panel)] border border-[var(--color-line)] rounded-md p-1">
          {[['mes', 'Mes'], ['trimestre', 'Trimestre'], ['anio', 'Año'], ['custom', 'Personalizado']].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setPreset(v)}
              className={`px-3 py-1 rounded text-sm font-display tracking-wide ${preset === v ? 'bg-[var(--color-lime)] text-[var(--color-ink)]' : 'text-[var(--color-muted)]'}`}
            >
              {l}
            </button>
          ))}
        </div>
        {preset === 'custom' && (
          <>
            <input type="date" className={selCls} value={from} onChange={(e) => setFrom(e.target.value)} />
            <input type="date" className={selCls} value={to} onChange={(e) => setTo(e.target.value)} />
          </>
        )}
        <select className={selCls} value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)}>
          <option value="todas">Todas las unidades</option>
          {units.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[var(--color-panel)] border border-[var(--color-line)] rounded-xl p-5">
          <p className="text-xs uppercase text-[var(--color-muted)]">Ventas totales</p>
          <p className="font-mono-num text-3xl font-semibold">{clp(totalSales)}</p>
        </div>
        <div className="bg-[var(--color-panel)] border border-[var(--color-line)] rounded-xl p-5">
          <p className="text-xs uppercase text-[var(--color-muted)]">Margen total</p>
          <p className="font-mono-num text-3xl font-semibold text-[var(--color-lime)]">{clp(totalMargin)}</p>
        </div>
      </div>

      <div className="bg-[var(--color-panel)] border border-[var(--color-line)] rounded-xl p-5">
        <h3 className="font-display text-xl font-bold mb-4">Ventas por unidad de negocio</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={salesByMonth}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
            <XAxis dataKey="label" stroke="#8FA396" fontSize={12} />
            <YAxis stroke="#8FA396" fontSize={12} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
            <Tooltip formatter={(v) => clp(v)} contentStyle={{ background: '#1E2A23', border: '1px solid #2A382F' }} />
            <Legend />
            {units.map((u, i) => <Bar key={u} dataKey={u} stackId="a" fill={PALETTE[i % PALETTE.length]} />)}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-[var(--color-panel)] border border-[var(--color-line)] rounded-xl p-5">
        <h3 className="font-display text-xl font-bold mb-4">Margen por unidad de negocio ($)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={marginByUnit} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
            <XAxis type="number" stroke="#8FA396" fontSize={12} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
            <YAxis type="category" dataKey="name" stroke="#8FA396" fontSize={12} width={140} />
            <Tooltip formatter={(v) => clp(v)} contentStyle={{ background: '#1E2A23', border: '1px solid #2A382F' }} />
            <Bar dataKey="margin">
              {marginByUnit.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-[var(--color-panel)] border border-[var(--color-line)] rounded-xl p-5">
        <h3 className="font-display text-xl font-bold mb-4">Margen por unidad: este período vs. mismo período año anterior</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={yoyByUnit}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
            <XAxis dataKey="name" stroke="#8FA396" fontSize={12} />
            <YAxis stroke="#8FA396" fontSize={12} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
            <Tooltip formatter={(v) => clp(v)} contentStyle={{ background: '#1E2A23', border: '1px solid #2A382F' }} />
            <Legend />
            <Bar dataKey="anterior" name="Año anterior" fill="var(--color-line)" />
            <Bar dataKey="actual" name="Este período" fill="var(--color-lime)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

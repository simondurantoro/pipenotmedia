import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { clp, monthLabel } from '../lib/format'

const STATUS_LABEL = { por_facturar: 'Por facturar', facturado: 'Facturado', pagado: 'Pagado' }
const STATUS_COLOR = {
  por_facturar: 'bg-[var(--color-amber)]/15 text-[var(--color-amber)]',
  facturado: 'bg-blue-400/15 text-blue-300',
  pagado: 'bg-[var(--color-lime)]/15 text-[var(--color-lime)]',
}

export default function DealsList({ refreshKey }) {
  const [deals, setDeals] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    supabase
      .from('deals_enriched')
      .select('*')
      .order('exhibition_year', { ascending: false })
      .order('exhibition_month', { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setDeals(data || [])
        setLoading(false)
      })
  }, [refreshKey])

  const filtered = deals.filter((d) => {
    const q = search.toLowerCase()
    return !q || d.company_name?.toLowerCase().includes(q) || d.brand_name?.toLowerCase().includes(q) || String(d.notmedia_id).includes(q)
  })

  return (
    <div>
      <input
        className="w-full max-w-sm rounded-md px-3 py-2 text-sm mb-4"
        placeholder="Buscar por empresa, marca o ID…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
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

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Autocomplete from './Autocomplete'
import { MESES, clp } from '../lib/format'

const BREAKDOWN_TYPES = [
  { value: 'ninguno', label: 'Sin desglose' },
  { value: 'influenciadores', label: 'Influenciadores' },
  { value: 'agencia_medios', label: 'Agencia de medios' },
  { value: 'contenido', label: 'Contenido' },
  { value: 'plataformas', label: 'Plataformas' },
]

const emptyInfluencer = () => ({ influencer_name: '', negotiated_net_amount: '', doc_type: 'factura', company_cost: '' })
const emptyMedia = () => ({ platform: '', amount: '' })
const emptyContent = () => ({ program: '', cost: '' })
const emptyPlatform = () => ({ platform: '', cost: '' })

export default function DealForm({ userId, onSaved }) {
  const [units, setUnits] = useState([])
  const [company, setCompany] = useState(null)
  const [brand, setBrand] = useState(null)
  const [businessUnitId, setBusinessUnitId] = useState('')
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [title, setTitle] = useState('')
  const [saleAmount, setSaleAmount] = useState('')
  const [costAmount, setCostAmount] = useState('')
  const [billingStatus, setBillingStatus] = useState('por_facturar')
  const [invoiceDate, setInvoiceDate] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')

  const [breakdownType, setBreakdownType] = useState('ninguno')
  const [influencers, setInfluencers] = useState([emptyInfluencer()])
  const [mediaRows, setMediaRows] = useState([emptyMedia()])
  const [contentRows, setContentRows] = useState([emptyContent()])
  const [platformRows, setPlatformRows] = useState([emptyPlatform()])

  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    supabase.from('business_units').select('id, name').order('name').then(({ data }) => setUnits(data || []))
  }, [])

  const breakdownTotal = () => {
    if (breakdownType === 'influenciadores') return influencers.reduce((s, r) => s + (Number(r.company_cost) || 0), 0)
    if (breakdownType === 'agencia_medios') return mediaRows.reduce((s, r) => s + (Number(r.amount) || 0), 0)
    if (breakdownType === 'contenido') return contentRows.reduce((s, r) => s + (Number(r.cost) || 0), 0)
    if (breakdownType === 'plataformas') return platformRows.reduce((s, r) => s + (Number(r.cost) || 0), 0)
    return 0
  }

  const total = breakdownTotal()
  const costNum = Number(costAmount) || 0
  const mismatch = breakdownType !== 'ninguno' && Math.abs(total - costNum) > 1

  function resetForm() {
    setCompany(null); setBrand(null); setBusinessUnitId(''); setTitle('')
    setSaleAmount(''); setCostAmount(''); setBillingStatus('por_facturar')
    setInvoiceDate(''); setInvoiceNumber('')
    setBreakdownType('ninguno')
    setInfluencers([emptyInfluencer()]); setMediaRows([emptyMedia()])
    setContentRows([emptyContent()]); setPlatformRows([emptyPlatform()])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage(null)
    if (!company || !brand || !businessUnitId) {
      setMessage({ type: 'error', text: 'Falta empresa, marca o unidad de negocio.' })
      return
    }
    setSaving(true)
    try {
      const { data: deal, error } = await supabase
        .from('deals')
        .insert({
          company_id: company.id,
          brand_id: brand.id,
          business_unit_id: businessUnitId,
          title: title || null,
          exhibition_month: month,
          exhibition_year: year,
          sale_amount: Number(saleAmount) || 0,
          cost_amount: Number(costAmount) || 0,
          billing_status: billingStatus,
          invoice_date: invoiceDate || null,
          invoice_number: invoiceNumber || null,
          owner_id: userId,
        })
        .select()
        .single()

      if (error) throw error

      if (breakdownType === 'influenciadores') {
        const rows = influencers
          .filter((r) => r.influencer_name)
          .map((r) => ({
            deal_id: deal.id,
            influencer_name: r.influencer_name,
            negotiated_net_amount: Number(r.negotiated_net_amount) || 0,
            doc_type: r.doc_type,
            company_cost: Number(r.company_cost) || 0,
          }))
        if (rows.length) await supabase.from('cost_influencers').insert(rows)
      } else if (breakdownType === 'agencia_medios') {
        const rows = mediaRows
          .filter((r) => r.platform)
          .map((r) => ({ deal_id: deal.id, platform: r.platform, amount: Number(r.amount) || 0 }))
        if (rows.length) await supabase.from('cost_media_agency').insert(rows)
      } else if (breakdownType === 'contenido') {
        const rows = contentRows
          .filter((r) => r.program)
          .map((r) => ({ deal_id: deal.id, program: r.program, cost: Number(r.cost) || 0 }))
        if (rows.length) await supabase.from('cost_content').insert(rows)
      } else if (breakdownType === 'plataformas') {
        const rows = platformRows
          .filter((r) => r.platform)
          .map((r) => ({ deal_id: deal.id, platform: r.platform, cost: Number(r.cost) || 0 }))
        if (rows.length) await supabase.from('cost_platforms').insert(rows)
      }

      setMessage({ type: 'ok', text: `Venta #${deal.notmedia_id} creada.` })
      resetForm()
      onSaved?.()
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full rounded-md px-3 py-2 text-sm'
  const labelCls = 'block text-xs uppercase tracking-wide text-[var(--color-muted)] mb-1'

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      <div className="bg-[var(--color-panel)] border border-[var(--color-line)] rounded-xl p-5">
        <h2 className="font-display text-2xl font-bold mb-4">Datos de la venta</h2>
        <div className="grid grid-cols-2 gap-4">
          <Autocomplete table="companies" label="Empresa" value={company} onChange={setCompany} placeholder="Buscar o crear empresa…" />
          <Autocomplete table="brands" label="Marca" value={brand} onChange={setBrand} placeholder="Buscar o crear marca…" />

          <div>
            <label className={labelCls}>Unidad de negocio</label>
            <select className={inputCls} value={businessUnitId} onChange={(e) => setBusinessUnitId(e.target.value)} required>
              <option value="">Seleccionar…</option>
              {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>

          <div>
            <label className={labelCls}>Título / referencia</label>
            <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Opcional" />
          </div>

          <div>
            <label className={labelCls}>Mes de exhibición</label>
            <select className={inputCls} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Año de exhibición</label>
            <input type="number" className={inputCls} value={year} onChange={(e) => setYear(Number(e.target.value))} />
          </div>

          <div>
            <label className={labelCls}>Venta ($)</label>
            <input type="number" className={inputCls} value={saleAmount} onChange={(e) => setSaleAmount(e.target.value)} required />
          </div>
          <div>
            <label className={labelCls}>Costo ($)</label>
            <input type="number" className={inputCls} value={costAmount} onChange={(e) => setCostAmount(e.target.value)} required />
          </div>

          <div className="col-span-2 grid grid-cols-3 gap-3 bg-[var(--color-panel-raised)] rounded-lg p-3">
            <div className="text-sm">
              <span className="text-[var(--color-muted)]">Margen </span>
              <span className="font-mono-num font-semibold">{clp((Number(saleAmount) || 0) - (Number(costAmount) || 0))}</span>
            </div>
            <div className="text-sm">
              <span className="text-[var(--color-muted)]">Margen % </span>
              <span className="font-mono-num font-semibold">
                {saleAmount ? (((Number(saleAmount) - Number(costAmount)) / Number(saleAmount)) * 100).toFixed(1) : '0.0'}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[var(--color-panel)] border border-[var(--color-line)] rounded-xl p-5">
        <h2 className="font-display text-2xl font-bold mb-4">Facturación</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Estado</label>
            <select className={inputCls} value={billingStatus} onChange={(e) => setBillingStatus(e.target.value)}>
              <option value="por_facturar">Por facturar</option>
              <option value="facturado">Facturado</option>
              <option value="pagado">Pagado</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Fecha de factura</label>
            <input type="date" className={inputCls} value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Número de factura</label>
            <input className={inputCls} value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="bg-[var(--color-panel)] border border-[var(--color-line)] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl font-bold">Desglose de costos</h2>
          <select className={inputCls + ' w-56'} value={breakdownType} onChange={(e) => setBreakdownType(e.target.value)}>
            {BREAKDOWN_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        {breakdownType === 'influenciadores' && (
          <RowsEditor
            rows={influencers}
            setRows={setInfluencers}
            empty={emptyInfluencer}
            fields={[
              { key: 'influencer_name', label: 'Influencer', type: 'text' },
              { key: 'negotiated_net_amount', label: 'Monto negociado neto', type: 'number' },
              { key: 'doc_type', label: 'Documento', type: 'select', options: [['factura', 'Factura'], ['boleta', 'Boleta']] },
              { key: 'company_cost', label: 'Costo empresa', type: 'number' },
            ]}
          />
        )}
        {breakdownType === 'agencia_medios' && (
          <RowsEditor
            rows={mediaRows}
            setRows={setMediaRows}
            empty={emptyMedia}
            fields={[
              { key: 'platform', label: 'Plataforma', type: 'text' },
              { key: 'amount', label: 'Monto', type: 'number' },
            ]}
          />
        )}
        {breakdownType === 'contenido' && (
          <RowsEditor
            rows={contentRows}
            setRows={setContentRows}
            empty={emptyContent}
            fields={[
              { key: 'program', label: 'Programa', type: 'text' },
              { key: 'cost', label: 'Costo', type: 'number' },
            ]}
          />
        )}
        {breakdownType === 'plataformas' && (
          <RowsEditor
            rows={platformRows}
            setRows={setPlatformRows}
            empty={emptyPlatform}
            fields={[
              { key: 'platform', label: 'Plataforma', type: 'text' },
              { key: 'cost', label: 'Costo', type: 'number' },
            ]}
          />
        )}

        {breakdownType !== 'ninguno' && (
          <div className={`mt-3 text-sm rounded-md px-3 py-2 ${mismatch ? 'bg-[var(--color-danger)]/15 text-[var(--color-danger)]' : 'bg-[var(--color-lime)]/10 text-[var(--color-lime)]'}`}>
            Desglose: <span className="font-mono-num">{clp(total)}</span> · Costo ingresado: <span className="font-mono-num">{clp(costNum)}</span>
            {mismatch ? ' — no coinciden' : ' — coincide ✓'}
          </div>
        )}
      </div>

      {message && (
        <p className={message.type === 'error' ? 'text-[var(--color-danger)]' : 'text-[var(--color-lime)]'}>{message.text}</p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-[var(--color-lime)] text-[var(--color-ink)] font-display font-bold text-lg px-6 py-2.5 tracking-wide hover:bg-[var(--color-lime-dim)] transition disabled:opacity-50"
      >
        {saving ? 'Guardando…' : 'GUARDAR VENTA'}
      </button>
    </form>
  )
}

function RowsEditor({ rows, setRows, empty, fields }) {
  function update(i, key, val) {
    const next = [...rows]
    next[i] = { ...next[i], [key]: val }
    setRows(next)
  }
  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="grid gap-2 items-end" style={{ gridTemplateColumns: `repeat(${fields.length}, 1fr) auto` }}>
          {fields.map((f) => (
            <div key={f.key}>
              <label className="block text-[10px] uppercase tracking-wide text-[var(--color-muted)] mb-1">{f.label}</label>
              {f.type === 'select' ? (
                <select className="w-full rounded-md px-2 py-1.5 text-sm" value={row[f.key]} onChange={(e) => update(i, f.key, e.target.value)}>
                  {f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              ) : (
                <input
                  type={f.type}
                  className="w-full rounded-md px-2 py-1.5 text-sm"
                  value={row[f.key]}
                  onChange={(e) => update(i, f.key, e.target.value)}
                />
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setRows(rows.filter((_, idx) => idx !== i))}
            className="text-[var(--color-danger)] text-sm px-2 py-1.5"
          >
            Quitar
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setRows([...rows, empty()])}
        className="text-[var(--color-lime)] text-sm hover:underline"
      >
        + Agregar línea
      </button>
    </div>
  )
}

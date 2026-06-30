import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// Autocompletar que busca en una tabla de Supabase y permite crear un
// registro nuevo al vuelo si no existe (empresa o marca nueva).
export default function Autocomplete({ table, label, value, onChange, placeholder }) {
  const [query, setQuery] = useState(value?.name || '')
  const [options, setOptions] = useState([])
  const [open, setOpen] = useState(false)
  const boxRef = useRef(null)

  useEffect(() => {
    setQuery(value?.name || '')
  }, [value])

  useEffect(() => {
    function onClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  useEffect(() => {
    if (!query || query === value?.name) return
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from(table)
        .select('id, name')
        .ilike('name', `%${query}%`)
        .order('name')
        .limit(8)
      setOptions(data || [])
    }, 200)
    return () => clearTimeout(t)
  }, [query, table])

  async function selectExisting(opt) {
    onChange(opt)
    setQuery(opt.name)
    setOpen(false)
  }

  async function createNew() {
    const name = query.trim()
    if (!name) return
    const { data, error } = await supabase.from(table).insert({ name }).select('id, name').single()
    if (error) {
      // probablemente ya existe (carrera entre usuarios) -> la buscamos
      const { data: existing } = await supabase.from(table).select('id, name').ilike('name', name).limit(1)
      if (existing?.[0]) return selectExisting(existing[0])
      alert('No se pudo crear: ' + error.message)
      return
    }
    selectExisting(data)
  }

  const exactMatch = options.some((o) => o.name.toLowerCase() === query.trim().toLowerCase())

  return (
    <div className="relative" ref={boxRef}>
      <label className="block text-xs uppercase tracking-wide text-[var(--color-muted)] mb-1 font-display text-sm">{label}</label>
      <input
        className="w-full rounded-md px-3 py-2 text-sm"
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          if (value) onChange(null)
        }}
        onFocus={() => setOpen(true)}
      />
      {open && query && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-[var(--color-line)] bg-[var(--color-panel-raised)] shadow-xl max-h-56 overflow-auto">
          {options.map((opt) => (
            <button
              type="button"
              key={opt.id}
              onClick={() => selectExisting(opt)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--color-ink)]"
            >
              {opt.name}
            </button>
          ))}
          {!exactMatch && (
            <button
              type="button"
              onClick={createNew}
              className="w-full text-left px-3 py-2 text-sm text-[var(--color-lime)] hover:bg-[var(--color-ink)] border-t border-[var(--color-line)]"
            >
              + Crear "{query.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  )
}

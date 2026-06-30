import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import Login from './components/Login'
import DealForm from './components/DealForm'
import DealsList from './components/DealsList'
import Dashboard from './components/Dashboard'

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = cargando
  const [tab, setTab] = useState('dashboard')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return <div className="min-h-screen flex items-center justify-center text-[var(--color-muted)]">Cargando…</div>
  }

  if (!session) return <Login />

  const tabs = [
    ['dashboard', 'Dashboard'],
    ['nueva', 'Cargar venta'],
    ['ventas', 'Ventas'],
  ]

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--color-line)] sticky top-0 bg-[var(--color-ink)]/95 backdrop-blur z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="font-display font-black text-2xl text-[var(--color-lime)] tracking-tight">NOT MEDIA · VENTAS</h1>
          <nav className="flex gap-1 bg-[var(--color-panel)] border border-[var(--color-line)] rounded-md p-1">
            {tabs.map(([v, l]) => (
              <button
                key={v}
                onClick={() => setTab(v)}
                className={`px-4 py-1.5 rounded text-sm font-display tracking-wide ${tab === v ? 'bg-[var(--color-lime)] text-[var(--color-ink)]' : 'text-[var(--color-muted)]'}`}
              >
                {l}
              </button>
            ))}
          </nav>
          <button onClick={() => supabase.auth.signOut()} className="text-sm text-[var(--color-muted)] hover:text-[var(--color-paper)]">
            Salir
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'nueva' && (
          <DealForm
            userId={session.user.id}
            onSaved={() => { setRefreshKey((k) => k + 1); setTab('ventas') }}
          />
        )}
        {tab === 'ventas' && <DealsList refreshKey={refreshKey} />}
      </main>
    </div>
  )
}

import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setError(error.message)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-display font-black text-5xl text-[var(--color-lime)] leading-none">NOT MEDIA</h1>
          <p className="text-[var(--color-muted)] text-sm mt-1 font-display text-lg tracking-wide">PANEL DE VENTAS</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-[var(--color-panel)] border border-[var(--color-line)] rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wide text-[var(--color-muted)] mb-1">Email</label>
            <input
              type="email"
              required
              className="w-full rounded-md px-3 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@notmedia.cl"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-[var(--color-muted)] mb-1">Contraseña</label>
            <input
              type="password"
              required
              className="w-full rounded-md px-3 py-2 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-[var(--color-danger)] text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-[var(--color-lime)] text-[var(--color-ink)] font-display font-bold text-lg py-2 tracking-wide hover:bg-[var(--color-lime-dim)] transition disabled:opacity-50"
          >
            {loading ? 'Entrando…' : 'ENTRAR'}
          </button>
          <p className="text-xs text-[var(--color-muted)] text-center">
            Acceso solo por invitación. Si no tienes cuenta, pídele a tu administrador que te invite desde Supabase.
          </p>
        </form>
      </div>
    </div>
  )
}

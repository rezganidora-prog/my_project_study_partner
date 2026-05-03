'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase'

function LeafDeco({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 60" fill="none" className={className} aria-hidden>
      <path d="M20 58 C20 58 2 40 2 22 C2 10 10 2 20 2 C30 2 38 10 38 22 C38 40 20 58 20 58Z"
        fill="currentColor" opacity="0.18" />
      <line x1="20" y1="58" x2="20" y2="8" stroke="currentColor" strokeWidth="1" opacity="0.2" />
    </svg>
  )
}

function CloudDeco({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 60" fill="currentColor" className={className} aria-hidden>
      <ellipse cx="40" cy="40" rx="35" ry="20" opacity="0.12" />
      <ellipse cx="70" cy="35" rx="45" ry="25" opacity="0.10" />
      <ellipse cx="90" cy="42" rx="30" ry="18" opacity="0.08" />
    </svg>
  )
}

export default function AuthPage() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      })
      if (error) {
        setError(error.message)
      } else {
        setMessage('Vérifie ton email pour confirmer ton compte. ✉️')
      }
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#FDF6E3] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <LeafDeco className="absolute top-8 left-12 w-16 h-24 text-[#8BAF76] rotate-12" />
      <LeafDeco className="absolute bottom-12 right-16 w-12 h-18 text-[#8BAF76] -rotate-20" />
      <LeafDeco className="absolute top-1/3 right-8 w-10 h-16 text-[#7BA7BC] rotate-45" />
      <CloudDeco className="absolute top-4 right-0 w-64 text-[#7BA7BC]" />
      <CloudDeco className="absolute bottom-0 left-0 w-80 text-[#8BAF76]" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#8BAF76] mb-4 shadow-lg"
            style={{ boxShadow: '0 4px 20px rgba(139,175,118,0.35)' }}>
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-[#4A3728]">Study Partner</h1>
          <p className="text-[#8B6355] mt-1 text-sm">✨ Ton compagnon d'études magique</p>
        </div>

        {/* Card */}
        <div className="bg-[#FFFBF0] border border-[#E8D5B7] rounded-3xl p-8 ghibli-card">
          {/* Tabs */}
          <div className="flex bg-[#F5E6C8] rounded-2xl p-1 mb-6">
            <button
              onClick={() => { setMode('login'); setError(null) }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                mode === 'login'
                  ? 'bg-white text-[#4A3728] shadow-sm'
                  : 'text-[#8B6355] hover:text-[#4A3728]'
              }`}
            >
              🌸 Connexion
            </button>
            <button
              onClick={() => { setMode('signup'); setError(null) }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                mode === 'signup'
                  ? 'bg-white text-[#4A3728] shadow-sm'
                  : 'text-[#8B6355] hover:text-[#4A3728]'
              }`}
            >
              🌱 Inscription
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-semibold text-[#4A3728] mb-1.5">
                  Nom complet
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Jean Dupont"
                  required
                  className="w-full bg-[#FDF6E3] border border-[#E8D5B7] rounded-xl px-4 py-3 text-[#4A3728] placeholder-[#C4A882] text-sm transition"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-[#4A3728] mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="toi@example.com"
                required
                className="w-full bg-[#FDF6E3] border border-[#E8D5B7] rounded-xl px-4 py-3 text-[#4A3728] placeholder-[#C4A882] text-sm transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#4A3728] mb-1.5">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full bg-[#FDF6E3] border border-[#E8D5B7] rounded-xl px-4 py-3 text-[#4A3728] placeholder-[#C4A882] text-sm transition"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
                {error}
              </div>
            )}

            {message && (
              <div className="bg-[#F0F7EB] border border-[#C5DDB8] rounded-xl px-4 py-3 text-[#5A8A4A] text-sm">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#8BAF76] hover:bg-[#7A9E65] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all mt-2 shadow-sm"
              style={{ boxShadow: '0 2px 12px rgba(139,175,118,0.3)' }}
            >
              {loading
                ? '✨ Chargement...'
                : mode === 'login'
                ? '🌿 Se connecter'
                : '🌱 Créer mon compte'}
            </button>
          </form>
        </div>

        <p className="text-center text-[#A89080] text-xs mt-6">
          🍃 Study Partner 2026 — Apprendre avec douceur
        </p>
      </div>
    </div>
  )
}

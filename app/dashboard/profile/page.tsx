'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'

export default function ProfilePage() {
  const supabase = createSupabaseBrowserClient()

  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [studyGoal, setStudyGoal] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user
      if (!user) return
      setEmail(user.email ?? '')
      setFullName(user.user_metadata?.full_name ?? '')
      setBio(user.user_metadata?.bio ?? '')
      setStudyGoal(user.user_metadata?.study_goal ?? '')
    })
  }, [supabase])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSaved(false)

    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName, bio, study_goal: studyGoal },
    })

    if (error) {
      setError(error.message)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
    setLoading(false)
  }

  const initials = fullName
    ? fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : email.slice(0, 2).toUpperCase()

  const inputClass = "w-full bg-[#FDF6E3] border border-[#E8D5B7] rounded-xl px-4 py-3 text-[#4A3728] placeholder-[#C4A882] text-sm transition"

  return (
    <div className="p-8 relative">
      {/* Deco */}
      <svg className="absolute top-8 right-12 w-12 h-18 text-[#7BA7BC] opacity-20 pointer-events-none -rotate-12"
        viewBox="0 0 40 60" fill="currentColor" aria-hidden>
        <path d="M20 58 C20 58 2 40 2 22 C2 10 10 2 20 2 C30 2 38 10 38 22 C38 40 20 58 20 58Z" />
      </svg>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#4A3728]">Mon Profil 🌸</h1>
        <p className="text-[#8B6355] mt-1">Personnalise ton espace d'apprentissage</p>
      </div>

      <div className="max-w-2xl">
        {/* Avatar card */}
        <div className="bg-[#FFFBF0] border border-[#E8D5B7] rounded-3xl p-6 mb-5 flex items-center gap-5 ghibli-card">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold text-white flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #8BAF76 0%, #7A9E65 100%)',
              boxShadow: '0 4px 16px rgba(139,175,118,0.35)',
            }}>
            {initials}
          </div>
          <div>
            <div className="text-xl font-bold text-[#4A3728]">{fullName || 'Ton nom'}</div>
            <div className="text-[#8B6355] text-sm mt-0.5">{email}</div>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
              style={{ background: '#F0F7EB', color: '#5A8A4A', border: '1px solid #C5DDB8' }}>
              <span className="w-1.5 h-1.5 bg-[#8BAF76] rounded-full" />
              🌿 Étudiant actif
            </div>
          </div>
        </div>

        {/* Form card */}
        <div className="bg-[#FFFBF0] border border-[#E8D5B7] rounded-3xl p-6 ghibli-card">
          <h2 className="text-lg font-bold text-[#4A3728] mb-5">✏️ Informations personnelles</h2>

          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-[#4A3728] mb-1.5">Nom complet</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Jean Dupont"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#4A3728] mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full bg-[#F5E6C8] border border-[#E8D5B7] rounded-xl px-4 py-3 text-[#A89080] cursor-not-allowed text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#4A3728] mb-1.5">Bio / Présentation</label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Ex : Étudiant passionné, j'aime apprendre à mon rythme, comme dans un Ghibli 🌿"
                rows={3}
                className={`${inputClass} resize-none`}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#4A3728] mb-1.5">Objectif d'études 🎯</label>
              <select
                value={studyGoal}
                onChange={e => setStudyGoal(e.target.value)}
                className={inputClass}
              >
                <option value="">Choisis ton chemin...</option>
                <option value="bac">🎒 Préparer le Bac</option>
                <option value="licence">📚 Licence / BUT</option>
                <option value="master">🎓 Master</option>
                <option value="doctorat">🔬 Doctorat</option>
                <option value="concours">⚔️ Concours (CPGE, médecine...)</option>
                <option value="certif">🏅 Certification professionnelle</option>
                <option value="autre">🌈 Autre aventure</option>
              </select>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
                {error}
              </div>
            )}

            {saved && (
              <div className="rounded-xl px-4 py-3 text-sm flex items-center gap-2"
                style={{ background: '#F0F7EB', border: '1px solid #C5DDB8', color: '#5A8A4A' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                🌸 Profil sauvegardé avec succès !
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={loading}
                className="text-white font-bold px-6 py-3 rounded-xl transition-all text-sm flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #8BAF76 0%, #7A9E65 100%)', boxShadow: '0 2px 14px rgba(139,175,118,0.3)' }}
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Sauvegarde...
                  </>
                ) : '🌿 Sauvegarder le profil'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

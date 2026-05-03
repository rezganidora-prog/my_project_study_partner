'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase'

export default function DashboardPage() {
  const supabase = createSupabaseBrowserClient()
  const [userName, setUserName] = useState<string>('Étudiant')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const name = data.user?.user_metadata?.full_name || data.user?.email?.split('@')[0] || 'Étudiant'
      setUserName(name)
    })
  }, [supabase])

  const stats = [
    { label: 'Sessions Pomodoro', value: '0', emoji: '🍅', bg: '#F0F7EB', border: '#C5DDB8', text: '#5A8A4A' },
    { label: "Heures d'étude", value: '0h', emoji: '⏰', bg: '#EBF4F7', border: '#B8D5DD', text: '#3A7A8A' },
    { label: 'Série actuelle', value: '0 jours', emoji: '🔥', bg: '#FDF0E6', border: '#F0C8A0', text: '#A06030' },
    { label: 'Questions IA', value: '0', emoji: '🦉', bg: '#F5EEF8', border: '#D8C0E8', text: '#7A50A0' },
  ]

  const quickActions = [
    { href: '/dashboard/pomodoro', label: 'Lancer un Pomodoro', emoji: '🍅', desc: '25 min de focus profond', color: '#8BAF76' },
    { href: '/dashboard/timeline', label: 'Voir ma Timeline', emoji: '🗓️', desc: 'Planifier mes sessions', color: '#7BA7BC' },
    { href: '/dashboard/chatbot', label: 'Demander à Hibou', emoji: '🦉', desc: 'Assistant IA magique', color: '#B8936A' },
  ]

  const greetings = ['Bonjour', 'Salut', 'Bienvenue']
  const greeting = greetings[new Date().getHours() % 3]

  return (
    <div className="p-8 relative">
      {/* Floating leaves deco */}
      <svg className="absolute top-6 right-10 w-12 h-16 text-[#8BAF76] opacity-20 pointer-events-none rotate-12"
        viewBox="0 0 40 60" fill="currentColor" aria-hidden>
        <path d="M20 58 C20 58 2 40 2 22 C2 10 10 2 20 2 C30 2 38 10 38 22 C38 40 20 58 20 58Z" />
        <line x1="20" y1="58" x2="20" y2="8" stroke="white" strokeWidth="1.5" />
      </svg>
      <svg className="absolute top-20 right-24 w-8 h-12 text-[#7BA7BC] opacity-25 pointer-events-none -rotate-6"
        viewBox="0 0 40 60" fill="currentColor" aria-hidden>
        <path d="M20 58 C20 58 2 40 2 22 C2 10 10 2 20 2 C30 2 38 10 38 22 C38 40 20 58 20 58Z" />
      </svg>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#4A3728]">
          {greeting}, <span className="text-[#8BAF76]">{userName}</span> ✨
        </h1>
        <p className="text-[#8B6355] mt-1">Le voyage d'aujourd'hui commence ici 🌿</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {stats.map(stat => (
          <div key={stat.label} className="rounded-2xl p-5 ghibli-card border"
            style={{ background: stat.bg, borderColor: stat.border }}>
            <div className="text-3xl mb-2">{stat.emoji}</div>
            <div className="text-2xl font-bold" style={{ color: stat.text }}>{stat.value}</div>
            <div className="text-sm mt-0.5" style={{ color: stat.text + 'CC' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-[#4A3728] mb-4">✨ Actions rapides</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickActions.map(action => (
            <Link
              key={action.href}
              href={action.href}
              className="bg-[#FFFBF0] border border-[#E8D5B7] hover:border-[#C4A882] rounded-2xl p-5 flex items-center gap-4 transition-all group ghibli-card hover:scale-[1.01]"
            >
              <span className="text-4xl">{action.emoji}</span>
              <div>
                <div className="font-bold text-[#4A3728] group-hover:text-[#8BAF76] transition-colors text-sm">
                  {action.label}
                </div>
                <div className="text-xs text-[#A89080] mt-0.5">{action.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Tip of the day */}
      <div className="rounded-2xl p-6 border relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #F0F7EB 0%, #EBF4F7 100%)',
          borderColor: '#C5DDB8',
        }}>
        {/* Cloud deco inside */}
        <svg className="absolute right-0 bottom-0 w-40 text-[#8BAF76] opacity-10 pointer-events-none"
          viewBox="0 0 120 60" fill="currentColor" aria-hidden>
          <ellipse cx="40" cy="40" rx="35" ry="20" />
          <ellipse cx="70" cy="35" rx="45" ry="25" />
        </svg>
        <div className="flex items-start gap-4 relative z-10">
          <span className="text-3xl">🌸</span>
          <div>
            <h3 className="font-bold text-[#5A8A4A] mb-1">Conseil du jour</h3>
            <p className="text-[#4A6840] text-sm leading-relaxed">
              La technique Pomodoro recommande 25 minutes de travail intensif suivies d'une pause de 5 minutes.
              Comme les saisons qui se renouvellent, ton cerveau a besoin de cycles. Après 4 sessions,
              prends une longue pause et remercie ton effort 🍃
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

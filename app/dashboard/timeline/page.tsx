'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'

interface StudySession {
  id: string
  date: string
  title: string
  subject: string
  duration: number
  color: string
  user_id?: string
}

const SUBJECTS = [
  { value: 'maths', label: '📐 Mathématiques', color: '#7BA7BC' },
  { value: 'physics', label: '⚗️ Physique-Chimie', color: '#8BAF76' },
  { value: 'history', label: '📜 Histoire-Géo', color: '#C4A882' },
  { value: 'languages', label: '🌍 Langues', color: '#B88BAF' },
  { value: 'biology', label: '🌿 SVT / Biologie', color: '#7AAF8B' },
  { value: 'computer', label: '💻 Informatique', color: '#8B9BAF' },
  { value: 'literature', label: '📖 Lettres', color: '#AF8B8B' },
  { value: 'other', label: '✨ Autre', color: '#AFA88B' },
]

const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

function getSubjectColor(subject: string) {
  return SUBJECTS.find(s => s.value === subject)?.color ?? '#C4A882'
}

function getSubjectLabel(subject: string) {
  return SUBJECTS.find(s => s.value === subject)?.label ?? subject
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function firstDayOfMonth(year: number, month: number) {
  const d = new Date(year, month, 1).getDay()
  return d === 0 ? 6 : d - 1 // Mon = 0
}

export default function TimelinePage() {
  const supabase = createSupabaseBrowserClient()

  const now = new Date()
  const [currentYear, setCurrentYear] = useState(now.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(now.getMonth())
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(false)

  // Form state
  const [formTitle, setFormTitle] = useState('')
  const [formSubject, setFormSubject] = useState('maths')
  const [formDuration, setFormDuration] = useState(60)

  useEffect(() => {
    loadSessions()
  }, [currentYear, currentMonth])

  async function loadSessions() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const startDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`
    const endDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(daysInMonth(currentYear, currentMonth)).padStart(2, '0')}`

    const { data, error } = await supabase
      .from('pomodoro_sessions')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })

    if (!error && data) {
      setSessions(data)
    }
  }

  async function addSession() {
    if (!formTitle.trim() || !selectedDay) return
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const date = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`
    const color = getSubjectColor(formSubject)

    const { data, error } = await supabase
      .from('pomodoro_sessions')
      .insert({ user_id: user.id, date, title: formTitle.trim(), subject: formSubject, duration: formDuration, color })
      .select()
      .single()

    if (!error && data) {
      setSessions(prev => [...prev, data])
      setFormTitle('')
      setFormSubject('maths')
      setFormDuration(60)
      setShowAddForm(false)
    }
    setLoading(false)
  }

  async function deleteSession(id: string) {
    await supabase.from('pomodoro_sessions').delete().eq('id', id)
    setSessions(prev => prev.filter(s => s.id !== id))
  }

  function prevMonth() {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) }
    else setCurrentMonth(m => m - 1)
    setSelectedDay(null)
    setShowModal(false)
  }

  function nextMonth() {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) }
    else setCurrentMonth(m => m + 1)
    setSelectedDay(null)
    setShowModal(false)
  }

  function openDay(day: number) {
    setSelectedDay(day)
    setShowModal(true)
    setShowAddForm(false)
    setFormTitle('')
    setFormSubject('maths')
    setFormDuration(60)
  }

  const totalDays = daysInMonth(currentYear, currentMonth)
  const firstDay = firstDayOfMonth(currentYear, currentMonth)

  function getDateString(day: number) {
    return `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  function sessionsForDay(day: number) {
    return sessions.filter(s => s.date === getDateString(day))
  }

  const selectedDaySessions = selectedDay ? sessionsForDay(selectedDay) : []
  const isToday = (day: number) =>
    day === now.getDate() && currentMonth === now.getMonth() && currentYear === now.getFullYear()

  const totalMinutes = sessions.reduce((acc, s) => acc + s.duration, 0)
  const studyDays = new Set(sessions.map(s => s.date)).size

  return (
    <div className="p-8 relative">
      {/* Deco leaves */}
      <svg className="absolute top-6 right-10 w-14 h-20 text-[#8BAF76] opacity-15 pointer-events-none rotate-12"
        viewBox="0 0 40 60" fill="currentColor" aria-hidden>
        <path d="M20 58 C20 58 2 40 2 22 C2 10 10 2 20 2 C30 2 38 10 38 22 C38 40 20 58 20 58Z" />
        <line x1="20" y1="58" x2="20" y2="8" stroke="white" strokeWidth="1.5" />
      </svg>
      <svg className="absolute bottom-20 right-6 w-10 h-14 text-[#7BA7BC] opacity-20 pointer-events-none -rotate-6"
        viewBox="0 0 40 60" fill="currentColor" aria-hidden>
        <path d="M20 58 C20 58 2 40 2 22 C2 10 10 2 20 2 C30 2 38 10 38 22 C38 40 20 58 20 58Z" />
      </svg>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#4A3728]">Ma Timeline 🗓️</h1>
        <p className="text-[#8B6355] mt-1">Planifie tes sessions comme les saisons qui passent 🍃</p>
      </div>

      {/* Month stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Jours d\'étude', value: studyDays, emoji: '📅' },
          { label: 'Minutes totales', value: totalMinutes, emoji: '⏱️' },
          { label: 'Sessions', value: sessions.length, emoji: '✅' },
        ].map(s => (
          <div key={s.label} className="bg-[#FFFBF0] border border-[#E8D5B7] rounded-2xl p-4 text-center ghibli-card">
            <div className="text-2xl mb-1">{s.emoji}</div>
            <div className="text-xl font-bold text-[#4A3728]">{s.value}</div>
            <div className="text-xs text-[#A89080]">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Calendar */}
      <div className="bg-[#FFFBF0] border border-[#E8D5B7] rounded-3xl overflow-hidden ghibli-card">
        {/* Calendar header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8D5B7]"
          style={{ background: 'linear-gradient(135deg, #F5E6C8 0%, #EDD9B0 100%)' }}>
          <button onClick={prevMonth}
            className="w-9 h-9 rounded-full bg-white border border-[#E8D5B7] flex items-center justify-center text-[#8B6355] hover:border-[#C4A882] transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-lg font-bold text-[#4A3728]">
            {MONTHS_FR[currentMonth]} {currentYear}
          </h2>
          <button onClick={nextMonth}
            className="w-9 h-9 rounded-full bg-white border border-[#E8D5B7] flex items-center justify-center text-[#8B6355] hover:border-[#C4A882] transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Day names */}
        <div className="grid grid-cols-7 border-b border-[#E8D5B7]">
          {DAYS_FR.map(d => (
            <div key={d} className="py-2.5 text-center text-xs font-bold text-[#A89080] uppercase tracking-wide">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {/* Empty cells before first day */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="h-24 border-b border-r border-[#F0E6D0] last:border-r-0" />
          ))}

          {/* Day cells */}
          {Array.from({ length: totalDays }).map((_, idx) => {
            const day = idx + 1
            const daySessions = sessionsForDay(day)
            const today = isToday(day)
            const isSelected = selectedDay === day && showModal
            const colIdx = (firstDay + idx) % 7
            const isLastCol = colIdx === 6

            return (
              <div
                key={day}
                onClick={() => openDay(day)}
                className={`h-24 border-b border-r border-[#F0E6D0] p-1.5 cursor-pointer transition-all group ${
                  isLastCol ? 'border-r-0' : ''
                } ${isSelected ? '' : 'hover:bg-[#F5E6C8]/50'}`}
                style={isSelected ? { background: 'rgba(139,175,118,0.1)' } : {}}
              >
                {/* Day number */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold mb-1 transition-all ${
                  today ? 'text-white' : 'text-[#7A6555] group-hover:text-[#4A3728]'
                }`}
                  style={today ? {
                    background: 'linear-gradient(135deg, #8BAF76 0%, #7A9E65 100%)',
                  } : {}}>
                  {day}
                </div>

                {/* Session dots */}
                <div className="flex flex-col gap-0.5">
                  {daySessions.slice(0, 2).map(s => (
                    <div key={s.id} className="text-xs px-1.5 py-0.5 rounded-md truncate font-medium"
                      style={{ background: s.color + '25', color: s.color, border: `1px solid ${s.color}40` }}>
                      {s.title}
                    </div>
                  ))}
                  {daySessions.length > 2 && (
                    <div className="text-xs text-[#A89080] px-1">+{daySessions.length - 2} autres</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Day Detail Modal */}
      {showModal && selectedDay && (
        <div className="fixed inset-0 bg-[#4A3728]/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="bg-[#FFFBF0] border border-[#E8D5B7] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
            style={{ boxShadow: '0 20px 60px rgba(74,55,40,0.15)' }}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8D5B7]"
              style={{ background: 'linear-gradient(135deg, #F5E6C8 0%, #EDD9B0 100%)' }}>
              <div>
                <h3 className="font-bold text-[#4A3728]">
                  {selectedDay} {MONTHS_FR[currentMonth]} {currentYear}
                </h3>
                <p className="text-xs text-[#8B6355]">
                  {selectedDaySessions.length} session(s) d'étude
                </p>
              </div>
              <button onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-white border border-[#E8D5B7] flex items-center justify-center text-[#8B6355] hover:border-[#C4A882] transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 max-h-[60vh] overflow-y-auto">
              {/* Sessions list */}
              {selectedDaySessions.length === 0 && !showAddForm && (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">🌱</div>
                  <p className="text-[#A89080] text-sm">Aucune session ce jour.</p>
                  <p className="text-[#C4A882] text-xs mt-1">Plante une graine de savoir !</p>
                </div>
              )}

              <div className="space-y-2 mb-4">
                {selectedDaySessions.map(s => (
                  <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl border"
                    style={{ background: s.color + '12', borderColor: s.color + '30' }}>
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[#4A3728] text-sm truncate">{s.title}</div>
                      <div className="text-xs text-[#8B6355]">
                        {getSubjectLabel(s.subject)} · {s.duration} min
                      </div>
                    </div>
                    <button onClick={() => deleteSession(s.id)}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[#A89080] hover:text-red-500 hover:bg-red-50 transition flex-shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              {/* Add form */}
              {showAddForm ? (
                <div className="bg-[#F5E6C8]/50 border border-[#E8D5B7] rounded-2xl p-4 space-y-3">
                  <div className="text-sm font-bold text-[#4A3728]">🌱 Nouvelle session</div>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={e => setFormTitle(e.target.value)}
                    placeholder="Titre de la session..."
                    className="w-full bg-white border border-[#E8D5B7] rounded-xl px-3 py-2 text-[#4A3728] placeholder-[#C4A882] text-sm"
                  />
                  <select
                    value={formSubject}
                    onChange={e => setFormSubject(e.target.value)}
                    className="w-full bg-white border border-[#E8D5B7] rounded-xl px-3 py-2 text-[#4A3728] text-sm"
                  >
                    {SUBJECTS.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-[#7A6555] whitespace-nowrap">⏱️ Durée (min) :</label>
                    <input
                      type="number"
                      value={formDuration}
                      onChange={e => setFormDuration(Number(e.target.value))}
                      min={5}
                      max={480}
                      step={5}
                      className="w-24 bg-white border border-[#E8D5B7] rounded-xl px-3 py-2 text-[#4A3728] text-sm"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={addSession} disabled={loading || !formTitle.trim()}
                      className="flex-1 py-2 rounded-xl text-white text-sm font-bold transition disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #8BAF76 0%, #7A9E65 100%)' }}>
                      {loading ? '...' : '🌿 Ajouter'}
                    </button>
                    <button onClick={() => setShowAddForm(false)}
                      className="px-4 py-2 rounded-xl border border-[#E8D5B7] text-[#8B6355] text-sm hover:bg-[#F5E6C8] transition">
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowAddForm(true)}
                  className="w-full py-2.5 rounded-xl border-2 border-dashed text-sm font-semibold transition"
                  style={{ borderColor: '#C5DDB8', color: '#8BAF76' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#F0F7EB' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                  + Ajouter une session 🌸
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

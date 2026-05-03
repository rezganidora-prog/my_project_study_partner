'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

// ─── Types ────────────────────────────────────────────────────────────────────

interface StudyRoom {
  id: string
  name: string
  subject: string | null
  code: string
  created_by: string | null
  created_at: string
}

interface Participant {
  user_id: string
  name: string
  color: string
  joined_at: string
}

interface TimerState {
  timeLeft: number
  isRunning: boolean
  mode: 'work' | 'break'
}

// ─── Constants ────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  '#8BAF76', '#7BA7BC', '#C4956A', '#9B8EA8',
  '#7A9E65', '#6B9EB8', '#BF8B5E', '#A89B5E',
]

const GHIBLI_QUOTES = [
  { text: 'Ensemble, comme les racines d\'un grand arbre, vous grandissez mieux.', author: 'Esprit de la forêt' },
  { text: 'L\'étude partagée est une lumière que nul vent ne peut éteindre.', author: 'Totoro' },
  { text: 'Chaque question posée ensemble ouvre une nouvelle porte.', author: 'Princesse Mononoké' },
]

const WORK_TIME = 25 * 60
const BREAK_TIME = 5 * 60
const R = 80
const CIRC = 2 * Math.PI * R

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('')
}

function randomColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]
}

function randomQuote() {
  return GHIBLI_QUOTES[Math.floor(Math.random() * GHIBLI_QUOTES.length)]
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StudyWithOthersPage() {
  const supabase = createSupabaseBrowserClient()

  // ── Auth state
  const [myUserId, setMyUserId] = useState('')
  const [myName, setMyName] = useState('Étudiant')
  const [myColor] = useState(randomColor)
  const [quote] = useState(randomQuote)

  // ── Navigation
  const [view, setView] = useState<'home' | 'room'>('home')
  const [homeTab, setHomeTab] = useState<'create' | 'join'>('create')

  // ── Create form
  const [createName, setCreateName] = useState('')
  const [createSubject, setCreateSubject] = useState('')
  const [creating, setCreating] = useState(false)

  // ── Join form
  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)

  // ── Room state
  const [room, setRoom] = useState<StudyRoom | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  // ── Timer state
  const [timer, setTimer] = useState<TimerState>({
    timeLeft: WORK_TIME,
    isRunning: false,
    mode: 'work',
  })
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)

  // ── Load current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setMyUserId(data.user.id)
        const m = data.user.user_metadata
        setMyName(m?.full_name || data.user.email?.split('@')[0] || 'Étudiant')
      }
    })
  }, [])

  // ── Timer tick
  useEffect(() => {
    if (timer.isRunning) {
      timerRef.current = setInterval(() => {
        setTimer(prev => {
          if (prev.timeLeft <= 1) {
            clearInterval(timerRef.current!)
            return {
              timeLeft: prev.mode === 'work' ? BREAK_TIME : WORK_TIME,
              isRunning: false,
              mode: prev.mode === 'work' ? 'break' : 'work',
            }
          }
          return { ...prev, timeLeft: prev.timeLeft - 1 }
        })
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [timer.isRunning])

  // ── Join Realtime channel
  const joinChannel = useCallback(
    (roomCode: string, userId: string, name: string, color: string) => {
      const ch = supabase.channel(`study-room:${roomCode}`)

      ch
        .on('presence', { event: 'sync' }, () => {
          const state = ch.presenceState()
          const all: Participant[] = []
          Object.values(state).forEach(ps =>
            (ps as unknown as Participant[]).forEach(p => all.push(p))
          )
          setParticipants(all)
        })
        .on('broadcast', { event: 'timer_sync' }, ({ payload }) => {
          if (timerRef.current) clearInterval(timerRef.current)
          setTimer(payload as TimerState)
        })
        .subscribe(async status => {
          if (status === 'SUBSCRIBED') {
            await ch.track({ user_id: userId, name, color, joined_at: new Date().toISOString() })
          }
        })

      channelRef.current = ch
    },
    [supabase]
  )

  // ── Create room
  async function handleCreate() {
    if (!createName.trim()) { setError('Entrez un nom de salle'); return }
    setCreating(true)
    setError('')
    const code = generateCode()
    const { data, error: err } = await supabase
      .from('study_rooms')
      .insert({ name: createName.trim(), subject: createSubject.trim() || null, code, created_by: myUserId || null })
      .select()
      .single()
    if (err || !data) {
      setError(err?.message ?? 'Erreur inconnue')
      setCreating(false)
      return
    }
    setRoom(data)
    setCreating(false)
    setView('room')
    setTimeout(() => joinChannel(data.code, myUserId, myName, myColor), 150)
  }

  // ── Join room
  async function handleJoin() {
    const code = joinCode.trim().toUpperCase()
    if (code.length !== 6) { setError('Le code doit faire 6 caractères'); return }
    setJoining(true)
    setError('')
    const { data, error: err } = await supabase
      .from('study_rooms')
      .select()
      .eq('code', code)
      .single()
    if (err || !data) {
      setError('Salle introuvable. Vérifiez le code.')
      setJoining(false)
      return
    }
    setRoom(data)
    setJoining(false)
    setView('room')
    setTimeout(() => joinChannel(data.code, myUserId, myName, myColor), 150)
  }

  // ── Leave room
  async function leaveRoom() {
    if (channelRef.current) {
      await channelRef.current.untrack()
      await supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
    if (timerRef.current) clearInterval(timerRef.current)
    setTimer({ timeLeft: WORK_TIME, isRunning: false, mode: 'work' })
    setRoom(null)
    setParticipants([])
    setView('home')
    setCreateName('')
    setCreateSubject('')
    setJoinCode('')
    setError('')
  }

  // ── Timer actions (broadcast to all)
  function handleTimerAction(action: 'toggle' | 'reset') {
    setTimer(prev => {
      const next: TimerState =
        action === 'toggle'
          ? { ...prev, isRunning: !prev.isRunning }
          : { timeLeft: prev.mode === 'work' ? WORK_TIME : BREAK_TIME, isRunning: false, mode: prev.mode }
      channelRef.current?.send({ type: 'broadcast', event: 'timer_sync', payload: next })
      return next
    })
  }

  function switchMode(mode: 'work' | 'break') {
    const next: TimerState = {
      timeLeft: mode === 'work' ? WORK_TIME : BREAK_TIME,
      isRunning: false,
      mode,
    }
    channelRef.current?.send({ type: 'broadcast', event: 'timer_sync', payload: next })
    setTimer(next)
  }

  async function copyCode() {
    if (!room) return
    await navigator.clipboard.writeText(room.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Timer display
  const mins = String(Math.floor(timer.timeLeft / 60)).padStart(2, '0')
  const secs = String(timer.timeLeft % 60).padStart(2, '0')
  const totalTime = timer.mode === 'work' ? WORK_TIME : BREAK_TIME
  const progress = 1 - timer.timeLeft / totalTime
  const dash = CIRC * progress
  const gap = CIRC - dash
  const timerColor = timer.mode === 'work' ? '#8BAF76' : '#7BA7BC'

  // ════════════════════════════════════════════════════════════════
  // ROOM VIEW
  // ════════════════════════════════════════════════════════════════
  if (view === 'room' && room) {
    return (
      <div className="min-h-screen p-6 relative overflow-hidden" style={{ background: '#FDF6E3' }}>
        {/* Decorative top-right leaf */}
        <svg className="absolute top-0 right-0 w-32 h-40 opacity-10 pointer-events-none"
          viewBox="0 0 80 100" fill="#8BAF76" aria-hidden>
          <path d="M40 95 C40 95 5 65 5 38 C5 18 20 5 40 5 C60 5 75 18 75 38 C75 65 40 95 40 95Z" />
          <line x1="40" y1="95" x2="40" y2="5" stroke="#8BAF76" strokeWidth="1.5" />
          <line x1="40" y1="65" x2="22" y2="45" stroke="#8BAF76" strokeWidth="1" />
          <line x1="40" y1="65" x2="58" y2="45" stroke="#8BAF76" strokeWidth="1" />
          <line x1="40" y1="45" x2="28" y2="30" stroke="#8BAF76" strokeWidth="0.8" />
          <line x1="40" y1="45" x2="52" y2="30" stroke="#8BAF76" strokeWidth="0.8" />
        </svg>

        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-6 relative z-10">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#4A3728' }}>{room.name}</h1>
            <p className="text-sm mt-0.5" style={{ color: '#8B6355' }}>
              {room.subject ?? 'Étude générale'} &nbsp;·&nbsp;
              <span style={{ color: '#8BAF76' }}>
                {participants.length} participant{participants.length > 1 ? 's' : ''}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={copyCode}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
              style={{
                background: copied ? '#8BAF76' : '#F5E6C8',
                color: copied ? 'white' : '#4A3728',
                border: '1px solid #E8D5B7',
              }}
            >
              {copied ? '✓ Copié !' : `🔑 ${room.code}`}
            </button>
            <button
              onClick={leaveRoom}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80"
              style={{ background: '#F5E0D8', color: '#8B4A3A', border: '1px solid #E8CEC8' }}
            >
              🍂 Quitter
            </button>
          </div>
        </div>

        {/* ── Two-column layout ── */}
        <div className="grid gap-5 relative z-10" style={{ gridTemplateColumns: '300px 1fr' }}>

          {/* LEFT — Participants + quote */}
          <div className="flex flex-col gap-4">

            {/* Ghibli quote */}
            <div
              className="rounded-2xl p-5"
              style={{
                background: 'linear-gradient(135deg, #F5E6C8 0%, #EDD9B0 100%)',
                border: '1px solid #E8D5B7',
                boxShadow: '0 4px 16px rgba(139,115,85,0.10)',
              }}
            >
              <div className="text-3xl mb-3">🌿</div>
              <p className="text-sm font-medium leading-relaxed" style={{ color: '#4A3728' }}>
                "{quote.text}"
              </p>
              <p className="text-xs mt-3" style={{ color: '#8B6355' }}>— {quote.author}</p>
            </div>

            {/* Participants */}
            <div
              className="rounded-2xl p-5 flex-1"
              style={{
                background: 'white',
                border: '1px solid #E8D5B7',
                boxShadow: '0 4px 16px rgba(139,115,85,0.08)',
              }}
            >
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: '#4A3728' }}>
                <span>👥</span>
                <span>Participants</span>
                <span
                  className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: '#F0F7EB', color: '#8BAF76' }}
                >
                  {participants.length}
                </span>
              </h3>

              {participants.length === 0 ? (
                <div className="text-center py-4">
                  <div className="text-2xl mb-2">🌱</div>
                  <p className="text-xs" style={{ color: '#8B6355' }}>
                    En attente de participants...
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#AFA080' }}>
                    Partagez le code {room.code}
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {participants.map((p, i) => (
                    <div key={p.user_id || i} className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: p.color, boxShadow: `0 2px 8px ${p.color}60` }}
                      >
                        {p.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: '#4A3728' }}>
                          {p.name}
                          {p.user_id === myUserId && (
                            <span className="text-xs ml-1.5" style={{ color: '#8BAF76' }}>(vous)</span>
                          )}
                        </p>
                      </div>
                      {/* Online dot */}
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: '#8BAF76', boxShadow: '0 0 4px #8BAF7680' }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — Shared Timer */}
          <div
            className="rounded-2xl p-8 flex flex-col items-center justify-center gap-6"
            style={{
              background: 'white',
              border: '1px solid #E8D5B7',
              boxShadow: '0 4px 16px rgba(139,115,85,0.08)',
            }}
          >
            {/* Mode tabs */}
            <div
              className="flex gap-1 p-1 rounded-xl"
              style={{ background: '#F5E6C8' }}
            >
              {(['work', 'break'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => switchMode(mode)}
                  className="px-6 py-2 rounded-lg text-sm font-medium transition-all"
                  style={
                    timer.mode === mode
                      ? { background: timerColor, color: 'white', boxShadow: `0 2px 8px ${timerColor}50` }
                      : { color: '#8B6355' }
                  }
                >
                  {mode === 'work' ? '📚 Travail' : '☕ Pause'}
                </button>
              ))}
            </div>

            {/* SVG ring */}
            <div className="relative">
              <svg width="220" height="220" viewBox="0 0 220 220">
                {/* Glow filter */}
                <defs>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Background ring */}
                <circle cx="110" cy="110" r={R} fill="none" stroke="#F0EAE0" strokeWidth="14" />

                {/* Progress ring */}
                <circle
                  cx="110" cy="110" r={R}
                  fill="none"
                  stroke={timerColor}
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={`${dash} ${gap}`}
                  filter="url(#glow)"
                  style={{
                    transform: 'rotate(-90deg)',
                    transformOrigin: '110px 110px',
                    transition: 'stroke-dasharray 0.6s ease, stroke 0.4s ease',
                  }}
                />

                {/* Time */}
                <text
                  x="110" y="100"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="38"
                  fontWeight="bold"
                  fill="#4A3728"
                  fontFamily="system-ui, sans-serif"
                >
                  {mins}:{secs}
                </text>

                {/* Label */}
                <text
                  x="110" y="125"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="12"
                  fill="#8B6355"
                  fontFamily="system-ui, sans-serif"
                >
                  {timer.mode === 'work' ? 'Concentration' : 'Pause détente'}
                </text>

                {/* Sync indicator */}
                <text
                  x="110" y="143"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="10"
                  fill="#8BAF76"
                  fontFamily="system-ui, sans-serif"
                >
                  ⟳ Synchronisé
                </text>
              </svg>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => handleTimerAction('reset')}
                className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-80"
                style={{
                  background: '#F5E6C8',
                  color: '#8B6355',
                  border: '1px solid #E8D5B7',
                }}
              >
                ↺ Réinitialiser
              </button>
              <button
                onClick={() => handleTimerAction('toggle')}
                className="px-10 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                style={{
                  background: timer.isRunning
                    ? 'linear-gradient(135deg, #E8A87C 0%, #D4956A 100%)'
                    : `linear-gradient(135deg, ${timerColor} 0%, ${timer.mode === 'work' ? '#7A9E65' : '#6A96AB'} 100%)`,
                  color: 'white',
                  boxShadow: timer.isRunning
                    ? '0 4px 14px rgba(212,149,106,0.35)'
                    : `0 4px 14px ${timerColor}50`,
                }}
              >
                {timer.isRunning ? '⏸ Pause' : '▶ Démarrer'}
              </button>
            </div>

            <p className="text-xs text-center" style={{ color: '#AFA080', maxWidth: 280 }}>
              Le timer est partagé en temps réel avec tous les participants de la salle.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════
  // HOME VIEW
  // ════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen p-6 relative overflow-hidden" style={{ background: '#FDF6E3' }}>

      {/* Decorative leaves */}
      <svg className="absolute top-0 right-0 w-36 h-48 opacity-[0.07] pointer-events-none"
        viewBox="0 0 80 100" fill="#8BAF76" aria-hidden>
        <path d="M40 95 C40 95 5 65 5 38 C5 18 20 5 40 5 C60 5 75 18 75 38 C75 65 40 95 40 95Z" />
        <line x1="40" y1="95" x2="40" y2="5" stroke="#8BAF76" strokeWidth="1.5" />
        <line x1="40" y1="65" x2="22" y2="45" stroke="#8BAF76" strokeWidth="1" />
        <line x1="40" y1="65" x2="58" y2="45" stroke="#8BAF76" strokeWidth="1" />
      </svg>
      <svg className="absolute bottom-10 left-4 w-24 h-32 opacity-[0.06] pointer-events-none"
        viewBox="0 0 60 80" fill="#7BA7BC" aria-hidden>
        <path d="M30 76 C30 76 4 52 4 30 C4 14 15 4 30 4 C45 4 56 14 56 30 C56 52 30 76 30 76Z" />
        <line x1="30" y1="76" x2="30" y2="4" stroke="#7BA7BC" strokeWidth="1.2" />
      </svg>

      {/* ── Header ── */}
      <div className="mb-8 relative z-10">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
            style={{ background: 'linear-gradient(135deg, #8BAF76 0%, #7A9E65 100%)', boxShadow: '0 4px 14px rgba(139,175,118,0.35)' }}
          >
            👥
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#4A3728' }}>Study Together</h1>
            <p className="text-sm" style={{ color: '#8B6355' }}>
              Étudiez en groupe avec un timer partagé en temps réel
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto relative z-10">

        {/* ── Tabs ── */}
        <div
          className="flex gap-1 p-1.5 rounded-2xl mb-6"
          style={{ background: '#F0E8D8', border: '1px solid #E8D5B7' }}
        >
          {(['create', 'join'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => { setHomeTab(tab); setError('') }}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={
                homeTab === tab
                  ? { background: '#8BAF76', color: 'white', boxShadow: '0 2px 10px rgba(139,175,118,0.35)' }
                  : { color: '#8B6355' }
              }
            >
              {tab === 'create' ? '🌱 Créer une salle' : '🚪 Rejoindre une salle'}
            </button>
          ))}
        </div>

        {/* ── Main card ── */}
        <div
          className="rounded-2xl p-7 mb-6"
          style={{
            background: 'white',
            border: '1px solid #E8D5B7',
            boxShadow: '0 8px 32px rgba(139,115,85,0.10)',
          }}
        >
          {homeTab === 'create' ? (
            /* CREATE FORM */
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#4A3728' }}>
                  Nom de la salle
                </label>
                <input
                  value={createName}
                  onChange={e => setCreateName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  placeholder="ex: Révisions bac de maths"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{
                    background: '#FDF6E3',
                    border: '1.5px solid #E8D5B7',
                    color: '#4A3728',
                  }}
                  onFocus={e => (e.target.style.borderColor = '#8BAF76')}
                  onBlur={e => (e.target.style.borderColor = '#E8D5B7')}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#4A3728' }}>
                  Matière <span style={{ color: '#AFA080', fontWeight: 400 }}>(optionnel)</span>
                </label>
                <input
                  value={createSubject}
                  onChange={e => setCreateSubject(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  placeholder="ex: Mathématiques, Histoire, Physique..."
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{
                    background: '#FDF6E3',
                    border: '1.5px solid #E8D5B7',
                    color: '#4A3728',
                  }}
                  onFocus={e => (e.target.style.borderColor = '#8BAF76')}
                  onBlur={e => (e.target.style.borderColor = '#E8D5B7')}
                />
              </div>

              {/* Code preview */}
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: '#F5F0E8', border: '1px dashed #C8B89A' }}
              >
                <span className="text-lg">🔑</span>
                <div>
                  <p className="text-xs font-semibold" style={{ color: '#4A3728' }}>Code unique généré automatiquement</p>
                  <p className="text-xs" style={{ color: '#8B6355' }}>
                    Un code à 6 caractères sera créé et partageable avec vos amis.
                  </p>
                </div>
              </div>

              {error && (
                <p className="text-sm px-3 py-2 rounded-lg" style={{ background: '#FDE8E8', color: '#C44A3A' }}>
                  ⚠ {error}
                </p>
              )}

              <button
                onClick={handleCreate}
                disabled={creating}
                className="w-full py-3.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 disabled:opacity-60"
                style={{
                  background: 'linear-gradient(135deg, #8BAF76 0%, #7A9E65 100%)',
                  color: 'white',
                  boxShadow: '0 4px 16px rgba(139,175,118,0.35)',
                }}
              >
                {creating ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Création de la salle...
                  </span>
                ) : (
                  '🌱 Créer la salle'
                )}
              </button>
            </div>
          ) : (
            /* JOIN FORM */
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#4A3728' }}>
                  Code de la salle
                </label>
                <input
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                  onKeyDown={e => e.key === 'Enter' && handleJoin()}
                  placeholder="AB3CD7"
                  maxLength={6}
                  className="w-full px-4 py-4 rounded-xl text-2xl font-bold tracking-[0.4em] text-center outline-none transition-all"
                  style={{
                    background: '#FDF6E3',
                    border: '1.5px solid #E8D5B7',
                    color: '#4A3728',
                    letterSpacing: '0.4em',
                  }}
                  onFocus={e => (e.target.style.borderColor = '#7BA7BC')}
                  onBlur={e => (e.target.style.borderColor = '#E8D5B7')}
                />
                <p className="text-xs mt-2 text-center" style={{ color: '#AFA080' }}>
                  Entrez le code à 6 caractères partagé par votre ami
                </p>
              </div>

              {error && (
                <p className="text-sm px-3 py-2 rounded-lg" style={{ background: '#FDE8E8', color: '#C44A3A' }}>
                  ⚠ {error}
                </p>
              )}

              <button
                onClick={handleJoin}
                disabled={joining}
                className="w-full py-3.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 disabled:opacity-60"
                style={{
                  background: 'linear-gradient(135deg, #7BA7BC 0%, #6A96AB 100%)',
                  color: 'white',
                  boxShadow: '0 4px 16px rgba(123,167,188,0.35)',
                }}
              >
                {joining ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Connexion à la salle...
                  </span>
                ) : (
                  '🚪 Rejoindre la salle'
                )}
              </button>
            </div>
          )}
        </div>

        {/* ── How it works ── */}
        <div
          className="rounded-2xl p-5"
          style={{
            background: 'linear-gradient(135deg, #F5E6C8 0%, #EDD9B0 100%)',
            border: '1px solid #E8D5B7',
          }}
        >
          <div className="text-2xl mb-3">🌸</div>
          <p className="text-sm font-medium leading-relaxed mb-3" style={{ color: '#4A3728' }}>
            "{quote.text}"
          </p>
          <p className="text-xs mb-4" style={{ color: '#8B6355' }}>— {quote.author}</p>

          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: '🌱', label: 'Créez une salle', desc: 'Nom + matière' },
              { icon: '🔑', label: 'Partagez le code', desc: '6 caractères' },
              { icon: '⏱', label: 'Timer partagé', desc: 'En temps réel' },
            ].map(item => (
              <div key={item.label} className="text-center">
                <div className="text-xl mb-1">{item.icon}</div>
                <p className="text-xs font-semibold" style={{ color: '#4A3728' }}>{item.label}</p>
                <p className="text-xs" style={{ color: '#8B6355' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

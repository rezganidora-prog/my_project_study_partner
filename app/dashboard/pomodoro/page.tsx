'use client'

import { useState, useEffect, useRef } from 'react'

type Mode = 'work' | 'short-break' | 'long-break'

const MODE_CONFIG: Record<Mode, { label: string; emoji: string; duration: number; stroke: string; btnBg: string; badgeBg: string; badgeText: string; badgeBorder: string }> = {
  work: {
    label: 'Temps de focus',
    emoji: '🍅',
    duration: 25 * 60,
    stroke: '#8BAF76',
    btnBg: '#8BAF76',
    badgeBg: '#F0F7EB',
    badgeText: '#5A8A4A',
    badgeBorder: '#C5DDB8',
  },
  'short-break': {
    label: 'Petite pause',
    emoji: '🌊',
    duration: 5 * 60,
    stroke: '#7BA7BC',
    btnBg: '#7BA7BC',
    badgeBg: '#EBF4F7',
    badgeText: '#3A7A8A',
    badgeBorder: '#B8D5DD',
  },
  'long-break': {
    label: 'Grande pause',
    emoji: '🌸',
    duration: 15 * 60,
    stroke: '#C4A882',
    btnBg: '#C4A882',
    badgeBg: '#FDF5EB',
    badgeText: '#8B6030',
    badgeBorder: '#E8D5B0',
  },
}

export default function PomodoroPage() {
  const [mode, setMode] = useState<Mode>('work')
  const [timeLeft, setTimeLeft] = useState(MODE_CONFIG.work.duration)
  const [running, setRunning] = useState(false)
  const [sessions, setSessions] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setTimeLeft(MODE_CONFIG[mode].duration)
    setRunning(false)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }, [mode])

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!)
            setRunning(false)
            if (mode === 'work') setSessions(s => s + 1)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, mode])

  function reset() {
    setRunning(false)
    setTimeLeft(MODE_CONFIG[mode].duration)
  }

  const cfg = MODE_CONFIG[mode]
  const minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const seconds = String(timeLeft % 60).padStart(2, '0')
  const total = cfg.duration
  const progress = ((total - timeLeft) / total) * 100
  const circumference = 2 * Math.PI * 110
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className="p-8 relative">
      {/* Deco */}
      <svg className="absolute top-8 right-8 w-14 h-20 text-[#8BAF76] opacity-15 pointer-events-none rotate-6"
        viewBox="0 0 40 60" fill="currentColor" aria-hidden>
        <path d="M20 58 C20 58 2 40 2 22 C2 10 10 2 20 2 C30 2 38 10 38 22 C38 40 20 58 20 58Z" />
        <line x1="20" y1="58" x2="20" y2="8" stroke="white" strokeWidth="1.5" />
      </svg>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#4A3728]">Pomodoro Timer 🍅</h1>
        <p className="text-[#8B6355] mt-1">Travaille en cycles, comme les saisons 🌿</p>
      </div>

      {/* Mode selector */}
      <div className="flex gap-2 mb-8">
        {(Object.keys(MODE_CONFIG) as Mode[]).map(m => {
          const mc = MODE_CONFIG[m]
          const isActive = mode === m
          return (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="px-4 py-2 rounded-full text-sm font-semibold transition-all border"
              style={isActive ? {
                background: mc.badgeBg,
                color: mc.badgeText,
                borderColor: mc.badgeBorder,
              } : {
                background: '#FFFBF0',
                color: '#A89080',
                borderColor: '#E8D5B7',
              }}
            >
              {mc.emoji} {mc.label}
            </button>
          )
        })}
      </div>

      {/* Timer card */}
      <div className="max-w-sm mx-auto">
        <div className="bg-[#FFFBF0] border border-[#E8D5B7] rounded-3xl p-8 text-center ghibli-card">
          {/* Circular progress */}
          <div className="relative inline-flex items-center justify-center mb-6">
            {/* Subtle glow */}
            <div className="absolute w-56 h-56 rounded-full opacity-15"
              style={{ background: `radial-gradient(circle, ${cfg.stroke}40 0%, transparent 70%)` }} />
            <svg width="260" height="260" className="-rotate-90">
              <circle cx="130" cy="130" r="110" fill="none" stroke="#EDD9B0" strokeWidth="10" />
              <circle
                cx="130" cy="130" r="110"
                fill="none"
                stroke={cfg.stroke}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-5xl mb-1">{cfg.emoji}</span>
              <span className="text-5xl font-bold font-mono tracking-tight text-[#4A3728]">
                {minutes}:{seconds}
              </span>
              <span className="text-sm font-medium mt-1" style={{ color: cfg.stroke }}>
                {cfg.label}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={reset}
              className="w-12 h-12 rounded-full border border-[#E8D5B7] text-[#8B6355] hover:border-[#C4A882] hover:bg-[#F5E6C8] transition flex items-center justify-center bg-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            <button
              onClick={() => setRunning(r => !r)}
              className="w-16 h-16 rounded-full text-white font-semibold transition-all flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${cfg.stroke} 0%, ${cfg.stroke}CC 100%)`,
                boxShadow: `0 4px 20px ${cfg.stroke}50`,
              }}
            >
              {running ? (
                <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <button
              onClick={() => setMode('short-break')}
              className="w-12 h-12 rounded-full border border-[#E8D5B7] text-[#8B6355] hover:border-[#C4A882] hover:bg-[#F5E6C8] transition flex items-center justify-center bg-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Session counter */}
        <div className="mt-5 bg-[#FFFBF0] border border-[#E8D5B7] rounded-2xl p-5 ghibli-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-[#4A3728]">🌱 Sessions complétées</span>
            <span className="text-lg font-bold text-[#8BAF76]">{sessions}</span>
          </div>
          <div className="flex gap-2">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="flex-1 h-2.5 rounded-full transition-all"
                style={{
                  background: i < (sessions % 4) ? '#8BAF76' : '#EDD9B0',
                }} />
            ))}
          </div>
          <p className="text-xs text-[#A89080] mt-2">
            {sessions % 4 === 0 && sessions > 0
              ? '🎉 Grande pause méritée ! Profites-en !'
              : `🍃 ${4 - (sessions % 4)} session(s) avant la grande pause`}
          </p>
        </div>

        {/* Ghibli quote */}
        <div className="mt-4 bg-[#EBF4F7] border border-[#B8D5DD] rounded-2xl p-5">
          <p className="text-xs text-[#3A7A8A] leading-relaxed italic">
            "Avance pas à pas, comme l'eau qui sculpte la pierre avec patience." 🌊
            <span className="not-italic text-[#7BA7BC] ml-1">— Sagesse Ghibli</span>
          </p>
        </div>
      </div>
    </div>
  )
}

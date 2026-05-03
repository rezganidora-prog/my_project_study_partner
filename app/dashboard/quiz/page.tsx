'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Course {
  id: string
  title: string
  subject: string
  created_at: string
}

interface Question {
  question: string
  choices: [string, string, string, string]
  correct: 0 | 1 | 2 | 3
}

type View = 'select' | 'generating' | 'play' | 'result'

// ─── Subjects map ─────────────────────────────────────────────────────────────

const SUBJECTS: Record<string, { label: string; color: string; bg: string }> = {
  maths:      { label: '📐 Mathématiques',    color: '#7BA7BC', bg: '#EBF4F7' },
  physics:    { label: '⚗️ Physique-Chimie',   color: '#8BAF76', bg: '#F0F7EB' },
  history:    { label: '📜 Histoire-Géo',      color: '#C4A882', bg: '#FDF5EB' },
  languages:  { label: '🌍 Langues',           color: '#B88BAF', bg: '#F7EBF7' },
  biology:    { label: '🌿 SVT / Biologie',    color: '#7AAF8B', bg: '#EBF7EF' },
  computer:   { label: '💻 Informatique',      color: '#8B9BAF', bg: '#EBF0F7' },
  literature: { label: '📖 Lettres',           color: '#AF8B8B', bg: '#F7EBEB' },
  philosophy: { label: '🧘 Philosophie',       color: '#AFA88B', bg: '#F7F5EB' },
  other:      { label: '✨ Autre',             color: '#8B6355', bg: '#F5EBE8' },
}

function getSubject(value: string) {
  return SUBJECTS[value] ?? SUBJECTS.other
}

function scoreEmoji(pct: number) {
  if (pct === 100) return '🏆'
  if (pct >= 80)   return '🌟'
  if (pct >= 60)   return '🌿'
  if (pct >= 40)   return '🌱'
  return '🍂'
}

function scoreLabel(pct: number) {
  if (pct === 100) return 'Parfait ! Tu maîtrises ce cours !'
  if (pct >= 80)   return 'Excellent ! Continue sur ta lancée !'
  if (pct >= 60)   return 'Beau travail, encore un petit effort !'
  if (pct >= 40)   return 'Pas mal, révise et réessaie !'
  return 'Courage, chaque tentative est un pas en avant 🌿'
}

// ─── Decorative leaf SVG ──────────────────────────────────────────────────────

function Leaf({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 60" fill="currentColor" className={className} aria-hidden>
      <path d="M20 58C20 58 2 40 2 22C2 10 10 2 20 2C30 2 38 10 38 22C38 40 20 58 20 58Z" />
      <line x1="20" y1="58" x2="20" y2="8" stroke="white" strokeWidth="1.5" />
    </svg>
  )
}

// ─── Animated dots loader ─────────────────────────────────────────────────────

function GeneratingLoader({ courseName }: { courseName: string }) {
  const steps = [
    '📖 Lecture du cours...',
    '🧠 Analyse du contenu...',
    '✍️ Rédaction des questions...',
    '🌿 Finalisation du quiz...',
  ]
  const [step, setStep] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setStep(s => (s + 1) % steps.length), 1400)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-8">
      <Leaf className="w-20 h-28 text-[#8BAF76] opacity-20 mb-6 animate-pulse" />
      <h2 className="text-2xl font-bold text-[#4A3728] mb-2">Claude génère ton quiz…</h2>
      <p className="text-[#8B6355] text-sm mb-8 max-w-xs">
        Sur le cours : <span className="font-semibold text-[#4A3728]">"{courseName}"</span>
      </p>

      {/* Animated step */}
      <div className="bg-[#FFFBF0] border border-[#E8D5B7] rounded-2xl px-6 py-4 mb-6 ghibli-card min-w-64">
        <p className="text-[#4A3728] font-medium text-sm transition-all">{steps[step]}</p>
      </div>

      {/* Bouncing dots */}
      <div className="flex gap-2 items-center">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-2.5 h-2.5 rounded-full bg-[#8BAF76] animate-bounce"
            style={{ animationDelay: `${i * 200}ms` }}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function QuizPage() {
  const supabase = createSupabaseBrowserClient()

  const [view, setView]           = useState<View>('select')
  const [courses, setCourses]     = useState<Course[]>([])
  const [loadingCourses, setLoadingCourses] = useState(true)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)

  // Quiz state
  const [questions, setQuestions] = useState<Question[]>([])
  const [genError, setGenError]   = useState<string | null>(null)

  // Play state
  const [qIndex, setQIndex]       = useState(0)
  const [chosen, setChosen]       = useState<(number | null)[]>([])
  const [confirmed, setConfirmed] = useState(false)

  // Result state
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)

  useEffect(() => { loadCourses() }, [])

  // ── Load courses from Supabase ────────────────────────────────────────────

  async function loadCourses() {
    setLoadingCourses(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoadingCourses(false); return }

    const { data } = await supabase
      .from('courses')
      .select('id, title, subject, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (data) setCourses(data)
    setLoadingCourses(false)
  }

  // ── Generate quiz via API ─────────────────────────────────────────────────

  async function generateQuiz(course: Course) {
    setSelectedCourse(course)
    setGenError(null)
    setView('generating')

    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseTitle: course.title,
          courseSubject: getSubject(course.subject).label,
        }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        setGenError(data.error ?? 'Erreur inconnue lors de la génération.')
        setView('select')
        return
      }

      const qs: Question[] = data.questions
      if (!Array.isArray(qs) || qs.length === 0) {
        setGenError('Claude n\'a pas pu générer de questions valides.')
        setView('select')
        return
      }

      setQuestions(qs)
      setQIndex(0)
      setChosen(new Array(qs.length).fill(null))
      setConfirmed(false)
      setSaved(false)
      setView('play')
    } catch (e) {
      setGenError(`Erreur réseau : ${e instanceof Error ? e.message : 'inconnue'}`)
      setView('select')
    }
  }

  // ── Play helpers ──────────────────────────────────────────────────────────

  function selectChoice(idx: number) {
    if (confirmed) return
    setChosen(prev => prev.map((v, i) => i === qIndex ? idx : v))
  }

  function confirm() {
    if (chosen[qIndex] === null) return
    setConfirmed(true)
  }

  function next() {
    setConfirmed(false)
    if (qIndex + 1 >= questions.length) {
      setView('result')
    } else {
      setQIndex(i => i + 1)
    }
  }

  // ── Save result to Supabase ───────────────────────────────────────────────

  async function saveResult() {
    if (!selectedCourse || saving || saved) return
    setSaving(true)

    const score = questions.reduce((acc, q, i) => acc + (chosen[i] === q.correct ? 1 : 0), 0)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    await supabase.from('quizzes').insert({
      user_id:      user.id,
      course_id:    selectedCourse.id,
      course_title: selectedCourse.title,
      score,
      total:        questions.length,
      questions,
    })

    setSaving(false)
    setSaved(true)
  }

  // ── Computed values ───────────────────────────────────────────────────────

  const score = questions.reduce((acc, q, i) => acc + (chosen[i] === q.correct ? 1 : 0), 0)
  const total = questions.length
  const pct   = total > 0 ? Math.round((score / total) * 100) : 0

  // ─── SELECT VIEW ──────────────────────────────────────────────────────────
  if (view === 'select') {
    return (
      <div className="p-8 relative min-h-full">
        <Leaf className="absolute top-6 right-10 w-14 h-20 text-[#8BAF76] opacity-15 rotate-12 pointer-events-none" />
        <Leaf className="absolute bottom-16 left-4 w-10 h-14 text-[#7BA7BC] opacity-20 -rotate-12 pointer-events-none" />

        <div className="mb-7">
          <h1 className="text-3xl font-bold text-[#4A3728]">Quiz IA 🧩</h1>
          <p className="text-[#8B6355] mt-1">
            Choisis un cours — Claude génère 5 questions sur mesure ✨
          </p>
        </div>

        {genError && (
          <div className="mb-5 bg-red-50 border border-red-200 rounded-2xl px-5 py-3 text-red-700 text-sm flex items-center gap-2">
            <span>🍂</span> {genError}
            <button onClick={() => setGenError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
          </div>
        )}

        {loadingCourses ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-3 animate-pulse">📚</div>
            <p className="text-[#A89080] text-sm">Chargement de ta bibliothèque...</p>
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-20 bg-[#FFFBF0] border border-[#E8D5B7] rounded-3xl ghibli-card">
            <div className="text-5xl mb-3">🌱</div>
            <p className="text-[#4A3728] font-bold text-lg">Aucun cours disponible</p>
            <p className="text-[#A89080] text-sm mt-1">
              Uploade un PDF dans{' '}
              <a href="/dashboard/courses" className="text-[#8BAF76] underline underline-offset-2">
                Mes Cours
              </a>{' '}
              pour commencer.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 max-w-2xl">
            {courses.map(course => {
              const subj = getSubject(course.subject)
              return (
                <button
                  key={course.id}
                  onClick={() => generateQuiz(course)}
                  className="bg-[#FFFBF0] border border-[#E8D5B7] hover:border-[#8BAF76] rounded-2xl p-5 flex items-center gap-4 text-left transition-all group ghibli-card hover:scale-[1.01]"
                >
                  {/* Subject icon */}
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: subj.bg, border: `1px solid ${subj.color}30` }}
                  >
                    {subj.label.split(' ')[0]}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[#4A3728] group-hover:text-[#8BAF76] transition-colors truncate">
                      {course.title}
                    </p>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-semibold mt-1 inline-block"
                      style={{ background: subj.bg, color: subj.color, border: `1px solid ${subj.color}30` }}
                    >
                      {subj.label}
                    </span>
                  </div>

                  {/* CTA */}
                  <div
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'linear-gradient(135deg, #8BAF76 0%, #7A9E65 100%)' }}
                  >
                    ✨ Générer
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* How it works */}
        <div
          className="mt-8 max-w-2xl rounded-2xl p-5 border"
          style={{ background: 'linear-gradient(135deg, #F0F7EB 0%, #EBF4F7 100%)', borderColor: '#C5DDB8' }}
        >
          <p className="text-xs font-bold text-[#5A8A4A] mb-2">✨ Comment ça marche ?</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { emoji: '📚', text: 'Tu choisis un cours' },
              { emoji: '🤖', text: 'Claude analyse et génère 5 questions' },
              { emoji: '🏆', text: 'Tu réponds et vois ton score' },
            ].map(s => (
              <div key={s.emoji}>
                <div className="text-2xl mb-1">{s.emoji}</div>
                <p className="text-xs text-[#5A8A4A]">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ─── GENERATING VIEW ──────────────────────────────────────────────────────
  if (view === 'generating') {
    return <GeneratingLoader courseName={selectedCourse?.title ?? ''} />
  }

  // ─── PLAY VIEW ────────────────────────────────────────────────────────────
  if (view === 'play' && questions.length > 0) {
    const q             = questions[qIndex]
    const selectedChoice = chosen[qIndex]
    const letters       = ['A', 'B', 'C', 'D']
    const progress      = ((qIndex + (confirmed ? 1 : 0)) / total) * 100
    const isCorrect     = confirmed && selectedChoice === q.correct
    const subj          = selectedCourse ? getSubject(selectedCourse.subject) : SUBJECTS.other

    return (
      <div className="p-8 flex flex-col items-center min-h-full relative">
        <Leaf className="absolute top-6 right-8 w-12 h-16 text-[#8BAF76] opacity-15 rotate-12 pointer-events-none" />

        <div className="w-full max-w-xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                style={{ background: subj.bg, border: `1px solid ${subj.color}30` }}
              >
                {subj.label.split(' ')[0]}
              </div>
              <div>
                <p className="font-bold text-[#4A3728] text-sm leading-tight truncate max-w-48">
                  {selectedCourse?.title}
                </p>
                <p className="text-xs text-[#8B6355]">
                  Question {qIndex + 1} / {total}
                </p>
              </div>
            </div>
            <button
              onClick={() => setView('select')}
              className="text-xs text-[#A89080] hover:text-[#8B6355] px-3 py-1.5 rounded-lg border border-[#E8D5B7] hover:bg-[#F5E6C8] transition"
            >
              ✕ Quitter
            </button>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2.5 bg-[#EDD9B0] rounded-full mb-6 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #8BAF76, #7BA7BC)',
              }}
            />
          </div>

          {/* Question card */}
          <div className="bg-[#FFFBF0] border border-[#E8D5B7] rounded-3xl p-7 ghibli-card mb-5">
            <p className="text-lg font-bold text-[#4A3728] leading-relaxed">{q.question}</p>
          </div>

          {/* Choices */}
          <div className="space-y-3 mb-6">
            {q.choices.map((choice, ci) => {
              const isSelected = selectedChoice === ci
              const isRight    = ci === q.correct

              let bg           = '#FFFBF0'
              let borderColor  = '#E8D5B7'
              let textColor    = '#4A3728'
              let letterBg     = '#F5E6C8'
              let letterColor  = '#8B6355'

              if (confirmed) {
                if (isRight) {
                  bg = '#F0F7EB'; borderColor = '#8BAF76'
                  letterBg = '#8BAF76'; letterColor = 'white'
                } else if (isSelected) {
                  bg = '#FDF0EC'; borderColor = '#E8A080'
                  letterBg = '#E8A080'; letterColor = 'white'
                } else {
                  textColor = '#C4A882'
                }
              } else if (isSelected) {
                bg = '#EBF4F7'; borderColor = '#7BA7BC'
                letterBg = '#7BA7BC'; letterColor = 'white'
              }

              return (
                <button
                  key={ci}
                  onClick={() => selectChoice(ci)}
                  disabled={confirmed}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all"
                  style={{ background: bg, borderColor, color: textColor }}
                >
                  <span
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all"
                    style={{ background: letterBg, color: letterColor }}
                  >
                    {letters[ci]}
                  </span>
                  <span className="text-sm font-medium flex-1">{choice}</span>
                  {confirmed && isRight    && <span className="ml-auto text-lg">✅</span>}
                  {confirmed && isSelected && !isRight && <span className="ml-auto text-lg">❌</span>}
                </button>
              )
            })}
          </div>

          {/* CTA */}
          {!confirmed ? (
            <button
              onClick={confirm}
              disabled={selectedChoice === null}
              className="w-full py-3.5 rounded-xl text-white font-bold text-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, #8BAF76 0%, #7A9E65 100%)',
                boxShadow: '0 2px 12px rgba(139,175,118,0.3)',
              }}
            >
              ✓ Valider ma réponse
            </button>
          ) : (
            <div>
              <div
                className="rounded-2xl px-5 py-4 mb-4 text-sm font-semibold"
                style={isCorrect
                  ? { background: '#F0F7EB', border: '1px solid #C5DDB8', color: '#5A8A4A' }
                  : { background: '#FDF0EC', border: '1px solid #E8C0A0', color: '#8B5020' }
                }
              >
                {isCorrect
                  ? '🌟 Bravo ! Bonne réponse !'
                  : `🍂 Pas cette fois... La bonne réponse était : "${q.choices[q.correct]}"`}
              </div>
              <button
                onClick={next}
                className="w-full py-3.5 rounded-xl text-white font-bold text-sm transition"
                style={{
                  background: 'linear-gradient(135deg, #7BA7BC 0%, #5A9AB8 100%)',
                  boxShadow: '0 2px 12px rgba(123,167,188,0.3)',
                }}
              >
                {qIndex + 1 < total ? '→ Question suivante' : '🏁 Voir mon score'}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─── RESULT VIEW ──────────────────────────────────────────────────────────
  if (view === 'result') {
    const circumference = 2 * Math.PI * 68

    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-full relative">
        <Leaf className="absolute top-6 right-10 w-14 h-20 text-[#8BAF76] opacity-15 rotate-12 pointer-events-none" />
        <Leaf className="absolute bottom-16 left-8 w-10 h-14 text-[#7BA7BC] opacity-20 -rotate-6 pointer-events-none" />

        <div className="w-full max-w-sm">
          {/* Score card */}
          <div
            className="bg-[#FFFBF0] border border-[#E8D5B7] rounded-3xl p-8 text-center ghibli-card mb-5"
            style={{ boxShadow: '0 8px 40px rgba(139,107,85,0.12)' }}
          >
            <div className="text-6xl mb-3">{scoreEmoji(pct)}</div>
            <h2 className="text-xl font-bold text-[#4A3728] mb-0.5">{selectedCourse?.title}</h2>
            <p className="text-[#8B6355] text-sm mb-6">{scoreLabel(pct)}</p>

            {/* Ring */}
            <div className="relative inline-flex items-center justify-center mb-6">
              <svg width="160" height="160" className="-rotate-90">
                <circle
                  cx="80" cy="80" r="68"
                  fill="none" stroke="#EDD9B0" strokeWidth="10"
                />
                <circle
                  cx="80" cy="80" r="68"
                  fill="none"
                  stroke={pct >= 60 ? '#8BAF76' : '#C4A882'}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - pct / 100)}
                  style={{ transition: 'stroke-dashoffset 1s ease' }}
                />
              </svg>
              <div className="absolute text-center">
                <div className="text-4xl font-bold text-[#4A3728]">{pct}%</div>
                <div className="text-sm text-[#8B6355]">{score}/{total}</div>
              </div>
            </div>

            {/* Per-question breakdown */}
            <div className="space-y-2 text-left">
              {questions.map((q, i) => {
                const ok = chosen[i] === q.correct
                return (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-xl text-sm"
                    style={{
                      background: ok ? '#F0F7EB' : '#FDF0EC',
                      border: `1px solid ${ok ? '#C5DDB8' : '#E8C0A0'}`,
                    }}
                  >
                    <span className="flex-shrink-0 mt-0.5">{ok ? '✅' : '❌'}</span>
                    <div className="min-w-0">
                      <p className="font-medium leading-snug" style={{ color: ok ? '#5A8A4A' : '#8B5020' }}>
                        Q{i + 1} : {q.question}
                      </p>
                      {!ok && (
                        <p className="text-xs mt-0.5" style={{ color: '#A07040' }}>
                          ✓ {q.choices[q.correct]}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Save confirmation */}
          {saved ? (
            <div
              className="rounded-2xl px-5 py-3 text-sm font-semibold text-center mb-4"
              style={{ background: '#F0F7EB', border: '1px solid #C5DDB8', color: '#5A8A4A' }}
            >
              🌿 Score sauvegardé dans ton historique !
            </div>
          ) : (
            <button
              onClick={saveResult}
              disabled={saving}
              className="w-full py-3 rounded-xl border border-[#C5DDB8] text-sm font-semibold mb-3 transition disabled:opacity-50"
              style={{ background: '#F0F7EB', color: '#5A8A4A' }}
            >
              {saving ? '🌿 Sauvegarde...' : '💾 Sauvegarder ce score'}
            </button>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => generateQuiz(selectedCourse!)}
              className="flex-1 py-3 rounded-xl text-white font-bold text-sm transition"
              style={{
                background: 'linear-gradient(135deg, #8BAF76 0%, #7A9E65 100%)',
                boxShadow: '0 2px 12px rgba(139,175,118,0.3)',
              }}
            >
              🔄 Nouveau quiz
            </button>
            <button
              onClick={() => setView('select')}
              className="flex-1 py-3 rounded-xl border border-[#E8D5B7] text-[#8B6355] font-semibold text-sm hover:bg-[#F5E6C8] transition"
            >
              📚 Choisir un cours
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

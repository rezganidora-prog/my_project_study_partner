'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'

interface Course {
  id: string
  title: string
  subject: string
  file_path: string
  file_name: string
  file_size: number
  created_at: string
}

const SUBJECTS = [
  { value: 'maths', label: '📐 Mathématiques', color: '#7BA7BC', bg: '#EBF4F7' },
  { value: 'physics', label: '⚗️ Physique-Chimie', color: '#8BAF76', bg: '#F0F7EB' },
  { value: 'history', label: '📜 Histoire-Géo', color: '#C4A882', bg: '#FDF5EB' },
  { value: 'languages', label: '🌍 Langues', color: '#B88BAF', bg: '#F7EBF7' },
  { value: 'biology', label: '🌿 SVT / Biologie', color: '#7AAF8B', bg: '#EBF7EF' },
  { value: 'computer', label: '💻 Informatique', color: '#8B9BAF', bg: '#EBF0F7' },
  { value: 'literature', label: '📖 Lettres', color: '#AF8B8B', bg: '#F7EBEB' },
  { value: 'philosophy', label: '🧘 Philosophie', color: '#AFA88B', bg: '#F7F5EB' },
  { value: 'other', label: '✨ Autre', color: '#8B6355', bg: '#F5EBE8' },
]

function getSubject(value: string) {
  return SUBJECTS.find(s => s.value === value) ?? SUBJECTS[SUBJECTS.length - 1]
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function CoursesPage() {
  const supabase = createSupabaseBrowserClient()

  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state
  const [formTitle, setFormTitle] = useState('')
  const [formSubject, setFormSubject] = useState('maths')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // Filter
  const [filterSubject, setFilterSubject] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadCourses() }, [])

  async function loadCourses() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (!error && data) setCourses(data)
    setLoading(false)
  }

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    if (file.type !== 'application/pdf') {
      setError('Seuls les fichiers PDF sont acceptés 🍂')
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('Fichier trop volumineux (max 50 Mo) 🍂')
      return
    }
    setSelectedFile(file)
    if (!formTitle) setFormTitle(file.name.replace(/\.pdf$/i, ''))
    setShowForm(true)
    setError(null)
  }, [formTitle])

  // Drag & drop handlers
  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragging(true)
  }
  function onDragLeave(e: React.DragEvent) {
    if (!dropZoneRef.current?.contains(e.relatedTarget as Node)) setDragging(false)
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  async function uploadCourse() {
    if (!selectedFile || !formTitle.trim()) return
    setUploading(true)
    setError(null)
    setUploadProgress(10)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setUploading(false); return }

    const timestamp = Date.now()
    const safeName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath = `${user.id}/${timestamp}_${safeName}`

    setUploadProgress(30)

    const { error: uploadError } = await supabase.storage
      .from('courses')
      .upload(filePath, selectedFile, { contentType: 'application/pdf', upsert: false })

    if (uploadError) {
      setError(`Erreur upload : ${uploadError.message}`)
      setUploading(false)
      setUploadProgress(0)
      return
    }

    setUploadProgress(70)

    const { error: dbError } = await supabase.from('courses').insert({
      user_id: user.id,
      title: formTitle.trim(),
      subject: formSubject,
      file_path: filePath,
      file_name: selectedFile.name,
      file_size: selectedFile.size,
    })

    if (dbError) {
      // rollback storage
      await supabase.storage.from('courses').remove([filePath])
      setError(`Erreur base de données : ${dbError.message}`)
      setUploading(false)
      setUploadProgress(0)
      return
    }

    setUploadProgress(100)
    setSuccess('Cours ajouté avec succès ! 🌿')
    setTimeout(() => setSuccess(null), 3000)
    resetForm()
    await loadCourses()
    setUploading(false)
    setUploadProgress(0)
  }

  async function deleteCourse(course: Course) {
    if (!confirm(`Supprimer "${course.title}" ? Cette action est irréversible 🍂`)) return

    await supabase.storage.from('courses').remove([course.file_path])
    await supabase.from('courses').delete().eq('id', course.id)
    setCourses(prev => prev.filter(c => c.id !== course.id))
    setSuccess('Cours supprimé 🍂')
    setTimeout(() => setSuccess(null), 2500)
  }

  async function viewCourse(course: Course) {
    const { data, error } = await supabase.storage
      .from('courses')
      .createSignedUrl(course.file_path, 60 * 60) // 1h

    if (error || !data) { setError('Impossible d\'ouvrir le fichier'); return }
    window.open(data.signedUrl, '_blank')
  }

  async function downloadCourse(course: Course) {
    const { data, error } = await supabase.storage
      .from('courses')
      .createSignedUrl(course.file_path, 300, { download: course.file_name })

    if (error || !data) { setError('Impossible de télécharger le fichier'); return }
    const a = document.createElement('a')
    a.href = data.signedUrl
    a.download = course.file_name
    a.click()
  }

  function resetForm() {
    setFormTitle('')
    setFormSubject('maths')
    setSelectedFile(null)
    setShowForm(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const filteredCourses = courses.filter(c => {
    const matchSubject = filterSubject === 'all' || c.subject === filterSubject
    const matchSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase())
    return matchSubject && matchSearch
  })

  const usedSubjects = [...new Set(courses.map(c => c.subject))]

  return (
    <div className="p-8 relative min-h-full">
      {/* Decorative leaves */}
      <svg className="absolute top-6 right-10 w-14 h-20 text-[#8BAF76] opacity-15 pointer-events-none rotate-12"
        viewBox="0 0 40 60" fill="currentColor" aria-hidden>
        <path d="M20 58 C20 58 2 40 2 22 C2 10 10 2 20 2 C30 2 38 10 38 22 C38 40 20 58 20 58Z" />
        <line x1="20" y1="58" x2="20" y2="8" stroke="white" strokeWidth="1.5" />
      </svg>
      <svg className="absolute bottom-16 left-4 w-10 h-14 text-[#7BA7BC] opacity-20 pointer-events-none -rotate-12"
        viewBox="0 0 40 60" fill="currentColor" aria-hidden>
        <path d="M20 58 C20 58 2 40 2 22 C2 10 10 2 20 2 C30 2 38 10 38 22 C38 40 20 58 20 58Z" />
      </svg>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#4A3728]">Mes Cours 📚</h1>
        <p className="text-[#8B6355] mt-1">Conserve tes PDFs comme des trésors dans ta bibliothèque 🌿</p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 rounded-2xl px-5 py-3 text-red-700 text-sm flex items-center gap-2">
          <span>🍂</span> {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}
      {success && (
        <div className="mb-5 rounded-2xl px-5 py-3 text-sm flex items-center gap-2"
          style={{ background: '#F0F7EB', border: '1px solid #C5DDB8', color: '#5A8A4A' }}>
          ✨ {success}
        </div>
      )}

      {/* Drop zone */}
      {!showForm && (
        <div
          ref={dropZoneRef}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className="mb-6 border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all select-none"
          style={{
            borderColor: dragging ? '#8BAF76' : '#C4A882',
            background: dragging
              ? 'linear-gradient(135deg, #F0F7EB 0%, #EBF4F7 100%)'
              : 'linear-gradient(135deg, #FFFBF0 0%, #FDF6E3 100%)',
            transform: dragging ? 'scale(1.01)' : 'scale(1)',
            boxShadow: dragging ? '0 4px 24px rgba(139,175,118,0.2)' : '0 2px 12px rgba(139,107,85,0.06)',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={e => handleFiles(e.target.files)}
          />
          <div className="text-5xl mb-3">{dragging ? '📂' : '📄'}</div>
          <p className="text-[#4A3728] font-bold text-lg">
            {dragging ? 'Dépose ton PDF ici !' : 'Glisse un PDF ou clique pour choisir'}
          </p>
          <p className="text-[#A89080] text-sm mt-1">Fichiers PDF uniquement · Max 50 Mo</p>
          <div className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold"
            style={{ background: 'linear-gradient(135deg, #8BAF76 0%, #7A9E65 100%)', boxShadow: '0 2px 10px rgba(139,175,118,0.3)' }}>
            🌿 Choisir un fichier
          </div>
        </div>
      )}

      {/* Upload form */}
      {showForm && (
        <div className="mb-6 bg-[#FFFBF0] border border-[#E8D5B7] rounded-3xl p-6 ghibli-card">
          <h2 className="text-lg font-bold text-[#4A3728] mb-4">🌱 Ajouter ce cours</h2>

          {/* Selected file info */}
          {selectedFile && (
            <div className="flex items-center gap-3 bg-[#F5E6C8] rounded-2xl px-4 py-3 mb-4 border border-[#E8D5B7]">
              <span className="text-2xl">📄</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#4A3728] truncate">{selectedFile.name}</p>
                <p className="text-xs text-[#8B6355]">{formatSize(selectedFile.size)}</p>
              </div>
              <button onClick={resetForm} className="text-[#A89080] hover:text-[#8B6355] transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[#4A3728] mb-1.5">Titre du cours</label>
              <input
                type="text"
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                placeholder="Ex : Chapitre 3 — Les fonctions dérivées"
                className="w-full bg-[#FDF6E3] border border-[#E8D5B7] rounded-xl px-4 py-3 text-[#4A3728] placeholder-[#C4A882] text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#4A3728] mb-1.5">Matière</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SUBJECTS.map(s => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setFormSubject(s.value)}
                    className="px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-left"
                    style={formSubject === s.value ? {
                      background: s.bg,
                      borderColor: s.color + '80',
                      color: s.color,
                    } : {
                      background: '#FFFBF0',
                      borderColor: '#E8D5B7',
                      color: '#7A6555',
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Upload progress */}
            {uploading && (
              <div>
                <div className="flex justify-between text-xs text-[#8B6355] mb-1">
                  <span>Upload en cours... 🌿</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 bg-[#E8D5B7] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${uploadProgress}%`, background: 'linear-gradient(90deg, #8BAF76, #7BA7BC)' }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={uploadCourse}
                disabled={uploading || !formTitle.trim() || !selectedFile}
                className="flex-1 py-3 rounded-xl text-white text-sm font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #8BAF76 0%, #7A9E65 100%)', boxShadow: '0 2px 12px rgba(139,175,118,0.3)' }}
              >
                {uploading ? '🌿 Upload...' : '📚 Sauvegarder le cours'}
              </button>
              <button
                onClick={resetForm}
                disabled={uploading}
                className="px-5 py-3 rounded-xl border border-[#E8D5B7] text-[#8B6355] text-sm font-semibold hover:bg-[#F5E6C8] transition"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter & search bar */}
      {courses.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="relative flex-1 min-w-48">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C4A882]"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher un cours..."
              className="w-full bg-[#FFFBF0] border border-[#E8D5B7] rounded-xl pl-9 pr-4 py-2.5 text-[#4A3728] placeholder-[#C4A882] text-sm"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilterSubject('all')}
              className="px-3 py-2 rounded-xl text-xs font-semibold border transition-all"
              style={filterSubject === 'all' ? {
                background: '#F5E6C8', borderColor: '#C4A882', color: '#4A3728'
              } : { background: '#FFFBF0', borderColor: '#E8D5B7', color: '#7A6555' }}
            >
              Tous
            </button>
            {usedSubjects.map(sv => {
              const s = getSubject(sv)
              return (
                <button
                  key={sv}
                  onClick={() => setFilterSubject(sv)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold border transition-all"
                  style={filterSubject === sv ? {
                    background: s.bg, borderColor: s.color + '80', color: s.color
                  } : { background: '#FFFBF0', borderColor: '#E8D5B7', color: '#7A6555' }}
                >
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Courses list */}
      {loading ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3 animate-pulse">📚</div>
          <p className="text-[#A89080] text-sm">Chargement de ta bibliothèque...</p>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="text-center py-16 bg-[#FFFBF0] border border-[#E8D5B7] rounded-3xl">
          <div className="text-5xl mb-3">🌿</div>
          <p className="text-[#4A3728] font-bold">
            {courses.length === 0 ? 'Ta bibliothèque est vide' : 'Aucun cours trouvé'}
          </p>
          <p className="text-[#A89080] text-sm mt-1">
            {courses.length === 0
              ? 'Dépose ton premier PDF pour commencer ton aventure !'
              : 'Essaie un autre filtre ou terme de recherche'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredCourses.map(course => {
            const subj = getSubject(course.subject)
            return (
              <div
                key={course.id}
                className="bg-[#FFFBF0] border border-[#E8D5B7] rounded-2xl p-4 flex items-center gap-4 ghibli-card hover:border-[#C4A882] transition-all group"
              >
                {/* PDF icon with subject color */}
                <div className="w-12 h-14 rounded-xl flex items-center justify-center flex-shrink-0 relative"
                  style={{ background: subj.bg, border: `1px solid ${subj.color}30` }}>
                  <svg className="w-6 h-7" fill="none" viewBox="0 0 24 28">
                    <rect x="1" y="1" width="16" height="20" rx="2" fill="white" stroke={subj.color} strokeWidth="1.5" />
                    <path d="M13 1v6h5" stroke={subj.color} strokeWidth="1.5" strokeLinejoin="round" />
                    <rect x="4" y="9" width="8" height="1.2" rx="0.6" fill={subj.color} opacity="0.5" />
                    <rect x="4" y="12" width="10" height="1.2" rx="0.6" fill={subj.color} opacity="0.5" />
                    <rect x="4" y="15" width="6" height="1.2" rx="0.6" fill={subj.color} opacity="0.5" />
                  </svg>
                  <span className="absolute -bottom-1 -right-1 text-xs">PDF</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-[#4A3728] truncate group-hover:text-[#8BAF76] transition-colors">
                    {course.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: subj.bg, color: subj.color, border: `1px solid ${subj.color}30` }}>
                      {subj.label}
                    </span>
                    <span className="text-xs text-[#A89080]">·</span>
                    <span className="text-xs text-[#A89080]">{formatSize(course.file_size)}</span>
                    <span className="text-xs text-[#A89080]">·</span>
                    <span className="text-xs text-[#A89080]">{formatDate(course.created_at)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => viewCourse(course)}
                    title="Voir le PDF"
                    className="w-9 h-9 rounded-xl border border-[#E8D5B7] flex items-center justify-center text-[#7BA7BC] hover:bg-[#EBF4F7] hover:border-[#7BA7BC] transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => downloadCourse(course)}
                    title="Télécharger"
                    className="w-9 h-9 rounded-xl border border-[#E8D5B7] flex items-center justify-center text-[#8BAF76] hover:bg-[#F0F7EB] hover:border-[#8BAF76] transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                  <button
                    onClick={() => deleteCourse(course)}
                    title="Supprimer"
                    className="w-9 h-9 rounded-xl border border-[#E8D5B7] flex items-center justify-center text-[#A89080] hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Stats footer */}
      {courses.length > 0 && (
        <div className="mt-6 flex items-center gap-2 text-xs text-[#A89080]">
          <span>📚 {courses.length} cours</span>
          <span>·</span>
          <span>💾 {formatSize(courses.reduce((a, c) => a + c.file_size, 0))} total</span>
        </div>
      )}
    </div>
  )
}

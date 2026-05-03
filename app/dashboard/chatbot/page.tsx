'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const SUGGESTIONS = [
  '🔭 Explique-moi la loi de Newton',
  '📐 Aide-moi à réviser les maths',
  '🧠 Comment mieux mémoriser ?',
  '🌿 Résume : la photosynthèse',
]

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: "Hibou est là pour toi ! 🦉✨ Pose-moi n'importe quelle question sur tes cours, je t'explique tout avec douceur et clarté !",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })

      const data = await res.json()
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply || "Je n'ai pas pu générer une réponse. Réessaie 🍃",
        timestamp: new Date(),
      }])
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Oups, une erreur s'est glissée par là 🍂 Vérifie ta connexion et réessaie.",
        timestamp: new Date(),
      }])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div className="flex flex-col h-full p-8 pb-0">
      {/* Header */}
      <div className="mb-5 flex-shrink-0 flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
          style={{ background: 'linear-gradient(135deg, #F5E6C8 0%, #EDD9B0 100%)', border: '1px solid #E8D5B7' }}>
          🦉
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]">Hibou, l'assistant magique</h1>
          <p className="text-[#8B6355] text-sm">Pose tes questions, je t'explique tout 🌿</p>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 bg-[#FFFBF0] border border-[#E8D5B7] rounded-3xl flex flex-col overflow-hidden mb-6 ghibli-card">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4"
          style={{ background: 'linear-gradient(180deg, #FFFBF0 0%, #FDF6E3 100%)' }}>
          {messages.map(msg => (
            <div key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {/* Avatar */}
              <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-base flex-shrink-0`}
                style={{
                  background: msg.role === 'assistant'
                    ? 'linear-gradient(135deg, #F5E6C8 0%, #EDD9B0 100%)'
                    : 'linear-gradient(135deg, #8BAF76 0%, #7A9E65 100%)',
                  border: msg.role === 'assistant' ? '1px solid #E8D5B7' : 'none',
                }}>
                {msg.role === 'assistant' ? '🦉' : '🌱'}
              </div>

              {/* Bubble */}
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed`}
                style={msg.role === 'user' ? {
                  background: 'linear-gradient(135deg, #8BAF76 0%, #7A9E65 100%)',
                  color: 'white',
                  borderRadius: '18px 4px 18px 18px',
                  boxShadow: '0 2px 10px rgba(139,175,118,0.25)',
                } : {
                  background: '#FFFBF0',
                  color: '#4A3728',
                  borderRadius: '4px 18px 18px 18px',
                  border: '1px solid #E8D5B7',
                  boxShadow: '0 1px 6px rgba(139,107,85,0.06)',
                }}>
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-base"
                style={{ background: 'linear-gradient(135deg, #F5E6C8 0%, #EDD9B0 100%)', border: '1px solid #E8D5B7' }}>
                🦉
              </div>
              <div className="bg-[#FFFBF0] border border-[#E8D5B7] rounded-2xl rounded-tl-sm px-5 py-3">
                <div className="flex gap-1.5 items-center h-4">
                  {[0, 150, 300].map(delay => (
                    <span key={delay} className="w-2 h-2 rounded-full animate-bounce"
                      style={{ background: '#C4A882', animationDelay: `${delay}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions */}
        {messages.length === 1 && (
          <div className="px-5 pb-4 flex flex-wrap gap-2 border-t border-[#E8D5B7] pt-3">
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => sendMessage(s)}
                className="text-xs px-3 py-1.5 rounded-full border border-[#E8D5B7] text-[#7A6555] hover:bg-[#F5E6C8] hover:text-[#4A3728] hover:border-[#C4A882] transition bg-white">
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="border-t border-[#E8D5B7] p-4 bg-[#FFFBF0]">
          <div className="flex gap-3">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Écris ta question ici... (Entrée pour envoyer) 🌿"
              rows={1}
              disabled={loading}
              className="flex-1 bg-[#FDF6E3] border border-[#E8D5B7] rounded-xl px-4 py-3 text-[#4A3728] placeholder-[#C4A882] resize-none text-sm transition disabled:opacity-50"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              className="w-12 h-12 rounded-xl flex items-center justify-center transition flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #8BAF76 0%, #7A9E65 100%)', boxShadow: '0 2px 10px rgba(139,175,118,0.3)' }}
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

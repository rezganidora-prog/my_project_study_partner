import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { messages } = await req.json()

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { reply: "Le chatbot IA n'est pas encore configuré. Ajoute ANTHROPIC_API_KEY dans .env.local pour l'activer." },
      { status: 200 }
    )
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system:
        "Tu es un assistant pédagogique pour étudiants. Tu expliques les concepts de cours de façon claire, simple et engageante. Tu utilises des exemples concrets et tu encourages l'étudiant. Réponds toujours en français.",
      messages,
    }),
  })

  if (!res.ok) {
    return NextResponse.json({ reply: "Erreur lors de la communication avec l'IA." }, { status: 500 })
  }

  const data = await res.json()
  const reply = data.content?.[0]?.text ?? "Pas de réponse disponible."

  return NextResponse.json({ reply })
}

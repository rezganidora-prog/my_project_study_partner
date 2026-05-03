import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { courseTitle, courseSubject } = await req.json()

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENROUTER_API_KEY manquant dans .env.local' },
      { status: 500 }
    )
  }

  const prompt = `Génère 5 questions QCM en français sur ce cours : "${courseTitle}" - ${courseSubject}.
Retourne UNIQUEMENT un JSON valide comme ceci :
[{ "question": "", "choices": ["", "", "", ""], "correct": 0 }]`

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'mistralai/mistral-7b-instruct:free',
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    return NextResponse.json({ error: `Erreur OpenRouter API: ${body}` }, { status: 500 })
  }

  const data = await res.json()
  const raw = data.choices?.[0]?.message?.content ?? ''

  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    return NextResponse.json({ error: 'Réponse invalide (JSON mal formé)', raw }, { status: 500 })
  }

  const questions = Array.isArray(parsed) ? parsed : (parsed as { questions: unknown[] }).questions
  return NextResponse.json({ questions })
}

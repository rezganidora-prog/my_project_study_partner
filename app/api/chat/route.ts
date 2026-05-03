import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { messages } = await req.json()

  const res = await fetch(
    'https://zdvxnwcpfchoqfbgoquc.supabase.co/functions/v1/dynamic-responder',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ messages }),
    }
  )

  const data = await res.json()
  return NextResponse.json({ reply: data.reply })
}
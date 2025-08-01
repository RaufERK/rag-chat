import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    openaiKey: process.env.OPENAI_API_KEY ? 'Set' : 'Not set',
    qdrantUrl: process.env.QDRANT_URL ? 'Set' : 'Not set',
    qdrantKey: process.env.QDRANT_API_KEY ? 'Set' : 'Not set',
    openaiKeyLength: process.env.OPENAI_API_KEY?.length || 0,
    qdrantUrlValue: process.env.QDRANT_URL || 'Not set',
  })
}

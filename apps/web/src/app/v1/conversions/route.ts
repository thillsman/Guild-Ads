import { NextResponse } from 'next/server'
import { readJSONBody, stringField } from '@/lib/sdk-api/common'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const body = await readJSONBody(request)
  const token = stringField(body, 'token')
  const event = stringField(body, 'event')

  if (!token || !event) {
    return NextResponse.json({ error: 'token and event are required' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}

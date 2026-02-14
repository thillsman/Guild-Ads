import { NextRequest, NextResponse } from 'next/server'

interface AppStoreResult {
  trackId: number
  trackName: string
  subtitle?: string
  artworkUrl512: string
  artworkUrl100: string
  bundleId: string
  trackViewUrl: string
  sellerName: string
}

interface ITunesLookupResponse {
  resultCount: number
  results: AppStoreResult[]
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const url = searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
  }

  // Extract App Store ID from URL
  // Formats:
  // https://apps.apple.com/us/app/app-name/id123456789
  // https://apps.apple.com/app/id123456789
  // https://itunes.apple.com/app/id123456789
  const appIdMatch = url.match(/\/id(\d+)/)

  if (!appIdMatch) {
    return NextResponse.json({ error: 'Invalid App Store URL. Could not find app ID.' }, { status: 400 })
  }

  const appStoreId = appIdMatch[1]

  try {
    const response = await fetch(`https://itunes.apple.com/lookup?id=${appStoreId}`, {
      next: { revalidate: 3600 } // Cache for 1 hour
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch from App Store' }, { status: 502 })
    }

    const data: ITunesLookupResponse = await response.json()

    if (data.resultCount === 0 || !data.results[0]) {
      return NextResponse.json({ error: 'App not found in App Store' }, { status: 404 })
    }

    const app = data.results[0]

    return NextResponse.json({
      appStoreId: String(app.trackId),
      name: app.trackName,
      subtitle: app.subtitle || null,
      iconUrl: app.artworkUrl512 || app.artworkUrl100,
      bundleIdentifier: app.bundleId,
      appStoreUrl: app.trackViewUrl,
      sellerName: app.sellerName,
    })
  } catch (error) {
    console.error('App Store lookup error:', error)
    return NextResponse.json({ error: 'Failed to lookup app' }, { status: 500 })
  }
}

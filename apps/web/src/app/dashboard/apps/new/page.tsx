'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MagnifyingGlass, SpinnerGap, Check } from '@phosphor-icons/react'

interface AppMetadata {
  appStoreId: string
  name: string
  subtitle: string | null
  iconUrl: string
  bundleIdentifier: string
  appStoreUrl: string
  sellerName: string
}

export default function AddAppPage() {
  const router = useRouter()
  const [appStoreUrl, setAppStoreUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [appData, setAppData] = useState<AppMetadata | null>(null)

  // Editable fields
  const [name, setName] = useState('')
  const [subtitle, setSubtitle] = useState('')

  const lookupApp = async () => {
    if (!appStoreUrl.trim()) {
      setError('Please enter an App Store URL')
      return
    }

    setLoading(true)
    setError(null)
    setAppData(null)

    try {
      const response = await fetch(`/api/appstore?url=${encodeURIComponent(appStoreUrl)}`)
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to lookup app')
        return
      }

      setAppData(data)
      setName(data.name)
      setSubtitle(data.subtitle || '')
    } catch (err) {
      setError('Failed to lookup app. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const saveApp = async () => {
    if (!appData) return

    setSaving(true)
    setError(null)

    try {
      const supabase = createClient()

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('You must be logged in to add an app.')
        return
      }

      const appPayload = {
        user_id: user.id,
        name: name.trim() || appData.name,
        subtitle: subtitle.trim() || null,
        bundle_identifier: appData.bundleIdentifier,
        app_store_id: appData.appStoreId,
        icon_url: appData.iconUrl,
        app_store_url: appData.appStoreUrl,
        status: 'active',
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingApps, error: existingError } = await (supabase as any)
        .from('apps')
        .select('app_id')
        .eq('user_id', user.id)
        .eq('bundle_identifier', appData.bundleIdentifier)
        .order('created_at', { ascending: true })

      if (existingError) {
        setError(existingError.message)
        return
      }

      const targetApp = existingApps?.[0]
      let writeError: { code?: string; message: string } | null = null

      if (targetApp?.app_id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: updateError } = await (supabase as any)
          .from('apps')
          .update(appPayload)
          .eq('app_id', targetApp.app_id)
          .eq('user_id', user.id)

        writeError = updateError
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: insertError } = await (supabase as any).from('apps').insert(appPayload)
        writeError = insertError
      }

      if (writeError) {
        if (writeError.code === '23505') {
          setError('This app has already been added to your account.')
        } else {
          setError(writeError.message)
        }
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError('Failed to save app. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="max-w-2xl">
      <h1 className="text-3xl font-bold mb-2">Add App</h1>
      <p className="text-muted-foreground mb-8">
          Enter your app&apos;s App Store URL to get started.
      </p>

        <Card>
          <CardHeader>
            <CardTitle>App Store URL</CardTitle>
            <CardDescription>
              Paste the URL from your app&apos;s App Store page
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="https://apps.apple.com/app/your-app/id123456789"
                value={appStoreUrl}
                onChange={(e) => setAppStoreUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && lookupApp()}
                disabled={loading}
              />
              <Button onClick={lookupApp} disabled={loading}>
                {loading ? (
                  <SpinnerGap className="h-4 w-4 animate-spin" />
                ) : (
                  <MagnifyingGlass className="h-4 w-4" />
                )}
              </Button>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </CardContent>
        </Card>

        {appData && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>App Details</CardTitle>
              <CardDescription>
                Review and customize your app&apos;s information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start gap-4">
                <img
                  src={appData.iconUrl}
                  alt={appData.name}
                  className="w-20 h-20 rounded-2xl"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">
                    {appData.sellerName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {appData.bundleIdentifier}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">App Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={appData.name}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subtitle">Subtitle (optional)</Label>
                  <Input
                    id="subtitle"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder={appData.subtitle || 'Add a subtitle'}
                  />
                </div>
              </div>

              <Button
                onClick={saveApp}
                disabled={saving}
                className="w-full"
              >
                {saving ? (
                  <>
                    <SpinnerGap className="h-4 w-4 mr-2 animate-spin" />
                    Adding App...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Add App
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
    </main>
  )
}

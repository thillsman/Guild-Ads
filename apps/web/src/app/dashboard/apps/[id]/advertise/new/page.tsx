'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, SpinnerGap, Check } from '@phosphor-icons/react'

interface AppData {
  app_id: string
  name: string
  subtitle: string | null
  icon_url: string | null
  app_store_url: string | null
}

export default function NewCampaignPage() {
  const router = useRouter()
  const params = useParams()
  const appId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [app, setApp] = useState<AppData | null>(null)

  // Form fields
  const [name, setName] = useState('')
  const [headline, setHeadline] = useState('')
  const [body, setBody] = useState('')
  const [destinationUrl, setDestinationUrl] = useState('')
  const [iconUrl, setIconUrl] = useState('')

  // Fetch app data on mount
  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()

      const { data: appData, error: appError } = await supabase
        .from('apps')
        .select('app_id, name, subtitle, icon_url, app_store_url')
        .eq('app_id', appId)
        .single<AppData>()

      if (appError || !appData) {
        setError('Could not load app data')
        setLoading(false)
        return
      }

      setApp(appData)
      setName(`${appData.name} Campaign`)
      setHeadline(appData.name)
      setBody(appData.subtitle || '')
      setDestinationUrl(appData.app_store_url || '')
      setIconUrl(appData.icon_url || '')
      setLoading(false)
    }
    fetchData()
  }, [appId])

  const createCampaign = async () => {
    if (!name.trim()) {
      setError('Please enter a campaign name')
      return
    }
    if (!headline.trim()) {
      setError('Please enter a headline')
      return
    }
    if (!destinationUrl.trim()) {
      setError('Please enter a destination URL')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('You must be logged in to create a campaign.')
        return
      }

      const { error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          user_id: user.id,
          app_id: appId,
          name: name.trim(),
          headline: headline.trim(),
          body: body.trim() || null,
          cta_text: 'View in App Store',
          destination_url: destinationUrl.trim(),
          status: 'draft',
        })

      if (campaignError) {
        setError(campaignError.message)
        return
      }

      router.push(`/dashboard/apps/${appId}/advertise`)
      router.refresh()
    } catch (err) {
      setError('Failed to create campaign. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <SpinnerGap className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <Link
            href={`/dashboard/apps/${appId}/advertise`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Campaigns
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold mb-2">Create Campaign</h1>
        <p className="text-muted-foreground mb-8">
          Create ad content for your app. You can book ad spots after creating.
        </p>

        <div className="space-y-6">
          {/* Campaign Details */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Details</CardTitle>
              <CardDescription>
                Give your campaign a name to identify it
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="name">Campaign Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Summer Launch Campaign"
                />
                <p className="text-xs text-muted-foreground">
                  This is for your reference only.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Ad Creative */}
          <Card>
            <CardHeader>
              <CardTitle>Ad Creative</CardTitle>
              <CardDescription>
                Pre-filled from your App Store listing. Customize as needed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="headline">Headline</Label>
                <Input
                  id="headline"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="Your app name"
                  maxLength={50}
                />
                <p className="text-xs text-muted-foreground">{headline.length}/50</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="body">Body Text (optional)</Label>
                <Input
                  id="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="A short description"
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground">{body.length}/100</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="url">App Store URL</Label>
                <Input
                  id="url"
                  type="url"
                  value={destinationUrl}
                  onChange={(e) => setDestinationUrl(e.target.value)}
                  placeholder="https://apps.apple.com/app/..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>How your ad will appear</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-xl p-4 bg-muted/30">
                <p className="text-xs text-muted-foreground mb-3">Sponsored</p>
                <div className="flex items-start gap-3">
                  {iconUrl ? (
                    <img src={iconUrl} alt={headline} className="w-14 h-14 rounded-xl flex-shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-muted flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{headline || 'Your app name'}</p>
                    {body && <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{body}</p>}
                    <Button size="sm" className="mt-2">View in App Store</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button onClick={createCampaign} disabled={saving} className="w-full" size="lg">
            {saving ? (
              <>
                <SpinnerGap className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Create Campaign
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  )
}

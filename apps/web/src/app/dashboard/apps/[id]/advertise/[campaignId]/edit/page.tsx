'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SpinnerGap, Check } from '@phosphor-icons/react'

interface CampaignData {
  campaign_id: string
  name: string
  headline: string | null
  body: string | null
  destination_url: string | null
  icon_url: string | null
}

interface AppData {
  icon_url: string | null
}

export default function EditCampaignPage() {
  const params = useParams()
  const router = useRouter()

  const appId = params.id as string
  const campaignId = params.campaignId as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [headline, setHeadline] = useState('')
  const [body, setBody] = useState('')
  const [destinationUrl, setDestinationUrl] = useState('')
  const [iconUrl, setIconUrl] = useState('')

  useEffect(() => {
    async function loadCampaign() {
      const supabase = createClient()

      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('campaign_id, name, headline, body, destination_url, icon_url')
        .eq('campaign_id', campaignId)
        .eq('app_id', appId)
        .single<CampaignData>()

      if (campaignError || !campaign) {
        setError('Could not load campaign.')
        setLoading(false)
        return
      }

      const { data: app } = await supabase
        .from('apps')
        .select('icon_url')
        .eq('app_id', appId)
        .single<AppData>()

      setName(campaign.name || '')
      setHeadline(campaign.headline || '')
      setBody(campaign.body || '')
      setDestinationUrl(campaign.destination_url || '')
      setIconUrl(campaign.icon_url || app?.icon_url || '')
      setLoading(false)
    }

    loadCampaign()
  }, [appId, campaignId])

  const saveCampaign = async () => {
    if (!headline.trim()) {
      setError('Please enter a title')
      return
    }

    if (!destinationUrl.trim()) {
      setError('Please enter a linked URL')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error: updateError } = await (supabase as any)
        .from('campaigns')
        .update({
          name: name.trim() || 'Campaign',
          headline: headline.trim(),
          body: body.trim() || null,
          destination_url: destinationUrl.trim(),
          icon_url: iconUrl.trim() || null,
        })
        .eq('campaign_id', campaignId)
        .eq('app_id', appId)

      if (updateError) {
        setError(updateError.message)
        return
      }

      router.push(`/dashboard/apps/${appId}/advertise`)
      router.refresh()
    } catch {
      setError('Failed to update campaign. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <SpinnerGap className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <main className="max-w-2xl">
      <h1 className="mb-2 text-3xl font-bold">Edit Campaign Creative</h1>
      <p className="mb-8 text-muted-foreground">
        Update the icon, title, subtitle, and linked URL shown in your campaign.
      </p>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Campaign Details</CardTitle>
            <CardDescription>
              Internal campaign label for your dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="campaign-name">Campaign Name</Label>
              <Input
                id="campaign-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Campaign name"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Creative</CardTitle>
            <CardDescription>
              What users see in the ad card.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="icon-url">Icon URL (optional)</Label>
              <Input
                id="icon-url"
                type="url"
                value={iconUrl}
                onChange={(event) => setIconUrl(event.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={headline}
                onChange={(event) => setHeadline(event.target.value)}
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subtitle">Subtitle (optional)</Label>
              <Input
                id="subtitle"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="linked-url">Linked URL</Label>
              <Input
                id="linked-url"
                type="url"
                value={destinationUrl}
                onChange={(event) => setDestinationUrl(event.target.value)}
                placeholder="https://apps.apple.com/app/..."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="mb-3 text-xs text-muted-foreground">Sponsored</p>
              <div className="flex items-start gap-3">
                {iconUrl ? (
                  <img src={iconUrl} alt={headline} className="h-14 w-14 flex-shrink-0 rounded-xl" />
                ) : (
                  <div className="h-14 w-14 flex-shrink-0 rounded-xl bg-muted" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{headline || 'Campaign title'}</p>
                  {body && <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{body}</p>}
                  <Button size="sm" className="mt-2">View in App Store</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button onClick={saveCampaign} disabled={saving} className="w-full" size="lg">
          {saving ? (
            <>
              <SpinnerGap className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </main>
  )
}

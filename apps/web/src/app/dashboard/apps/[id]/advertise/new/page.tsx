'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, SpinnerGap, Check } from '@phosphor-icons/react'

export default function NewCampaignPage() {
  const router = useRouter()
  const params = useParams()
  const appId = params.id as string

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form fields
  const [name, setName] = useState('')
  const [headline, setHeadline] = useState('')
  const [body, setBody] = useState('')
  const [ctaText, setCtaText] = useState('Learn More')
  const [destinationUrl, setDestinationUrl] = useState('')
  const [dailyBudget, setDailyBudget] = useState('5.00')

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

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('You must be logged in to create a campaign.')
        return
      }

      const { error: insertError } = await supabase.from('campaigns').insert({
        user_id: user.id,
        app_id: appId,
        name: name.trim(),
        headline: headline.trim(),
        body: body.trim() || null,
        cta_text: ctaText.trim() || 'Learn More',
        destination_url: destinationUrl.trim(),
        daily_budget_usd: parseFloat(dailyBudget) || 5.00,
        status: 'scheduled',
      })

      if (insertError) {
        setError(insertError.message)
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
          Set up your ad campaign to reach users of other indie apps.
        </p>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Details</CardTitle>
              <CardDescription>
                Basic information about your campaign
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Campaign Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Summer Launch Campaign"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget">Daily Budget (USD)</Label>
                <Input
                  id="budget"
                  type="number"
                  min="1"
                  step="0.01"
                  value={dailyBudget}
                  onChange={(e) => setDailyBudget(e.target.value)}
                  placeholder="5.00"
                />
                <p className="text-xs text-muted-foreground">
                  Your campaign will pause when the daily budget is reached.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ad Creative</CardTitle>
              <CardDescription>
                What users will see when your ad is shown
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="headline">Headline</Label>
                <Input
                  id="headline"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g., Discover Your New Favorite App"
                  maxLength={50}
                />
                <p className="text-xs text-muted-foreground">
                  {headline.length}/50 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="body">Body Text (optional)</Label>
                <Input
                  id="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="e.g., Join thousands of users who love our app."
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground">
                  {body.length}/100 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cta">Call to Action</Label>
                <Input
                  id="cta"
                  value={ctaText}
                  onChange={(e) => setCtaText(e.target.value)}
                  placeholder="Learn More"
                  maxLength={20}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="url">Destination URL</Label>
                <Input
                  id="url"
                  type="url"
                  value={destinationUrl}
                  onChange={(e) => setDestinationUrl(e.target.value)}
                  placeholder="https://apps.apple.com/app/your-app/id123456789"
                />
                <p className="text-xs text-muted-foreground">
                  Where users go when they tap your ad (usually your App Store page)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                How your ad will appear in other apps
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-4 bg-muted/30">
                <p className="text-xs text-muted-foreground mb-2">Sponsored</p>
                <p className="font-semibold">{headline || 'Your headline here'}</p>
                {body && <p className="text-sm text-muted-foreground mt-1">{body}</p>}
                <Button size="sm" className="mt-3">
                  {ctaText || 'Learn More'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button
            onClick={createCampaign}
            disabled={saving}
            className="w-full"
            size="lg"
          >
            {saving ? (
              <>
                <SpinnerGap className="h-4 w-4 mr-2 animate-spin" />
                Creating Campaign...
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

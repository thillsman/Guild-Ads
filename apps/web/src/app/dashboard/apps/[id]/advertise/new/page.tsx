'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, SpinnerGap, Check, CalendarCheck, Users, CurrencyDollar } from '@phosphor-icons/react'

interface AppData {
  app_id: string
  name: string
  subtitle: string | null
  icon_url: string | null
  app_store_url: string | null
}

interface WeekSlot {
  weekStart: string
  slotId: string
  basePriceCents: number
  totalUsersEstimate: number
  purchasedPercentage: number
  availablePercentage: number
  isNextWeek: boolean
  weeksFromNow: number
}

export default function NewCampaignPage() {
  const router = useRouter()
  const params = useParams()
  const appId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [app, setApp] = useState<AppData | null>(null)
  const [weeks, setWeeks] = useState<WeekSlot[]>([])

  // Form fields
  const [name, setName] = useState('')
  const [headline, setHeadline] = useState('')
  const [body, setBody] = useState('')
  const [destinationUrl, setDestinationUrl] = useState('')
  const [iconUrl, setIconUrl] = useState('')

  // Week selection
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0)
  const [percentage, setPercentage] = useState(10)

  // Fetch app data and weeks on mount
  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()

      // Fetch app
      const { data: appData, error: appError } = await supabase
        .from('apps')
        .select('app_id, name, subtitle, icon_url, app_store_url')
        .eq('app_id', appId)
        .single()

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

      // Fetch weeks
      const res = await fetch('/api/slots')
      if (res.ok) {
        const data = await res.json()
        setWeeks(data.weeks || [])
      }

      setLoading(false)
    }
    fetchData()
  }, [appId])

  const selectedWeek = weeks[selectedWeekIndex]
  const isNextWeek = selectedWeek?.isNextWeek ?? false
  const maxPercentage = selectedWeek ? Math.min(40, selectedWeek.availablePercentage) : 40

  // Price calculations
  const costCents = selectedWeek ? Math.round((selectedWeek.basePriceCents * percentage) / 100) : 0
  const costDollars = (costCents / 100).toFixed(2)
  const estimatedUsers = selectedWeek ? Math.round((selectedWeek.totalUsersEstimate * percentage) / 100) : 0

  // For future weeks, show price range (±10% based on demand)
  const minCostCents = selectedWeek ? Math.round((selectedWeek.basePriceCents * 0.9 * percentage) / 100) : 0
  const maxCostCents = selectedWeek ? Math.round((selectedWeek.basePriceCents * 1.1 * percentage) / 100) : 0
  const minCostDollars = (minCostCents / 100).toFixed(2)
  const maxCostDollars = (maxCostCents / 100).toFixed(2)

  const formatWeekDate = (weekStart: string) => {
    const date = new Date(weekStart + 'T00:00:00')
    const endDate = new Date(date)
    endDate.setDate(endDate.getDate() + 6)
    return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  }

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
    if (!selectedWeek) {
      setError('Please select a week')
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

      // Create campaign
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          user_id: user.id,
          app_id: appId,
          name: name.trim(),
          headline: headline.trim(),
          body: body.trim() || null,
          cta_text: 'View in App Store',
          destination_url: destinationUrl.trim(),
          status: 'scheduled',
        })
        .select()
        .single()

      if (campaignError) {
        setError(campaignError.message)
        return
      }

      // Create slot purchase
      const { error: purchaseError } = await supabase.from('slot_purchases').insert({
        slot_id: selectedWeek.slotId,
        user_id: user.id,
        campaign_id: campaign.campaign_id,
        percentage_purchased: percentage,
        price_cents: costCents,
        status: 'confirmed',
      })

      if (purchaseError) {
        setError(purchaseError.message)
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
          Book ad spots to reach users of other indie apps.
        </p>

        <div className="space-y-6">
          {/* Week Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarCheck className="h-5 w-5" />
                Select Week
              </CardTitle>
              <CardDescription>
                Choose which week to run your campaign
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {weeks.map((week, index) => (
                  <button
                    key={week.weekStart}
                    onClick={() => {
                      setSelectedWeekIndex(index)
                      setPercentage(Math.min(percentage, Math.min(40, week.availablePercentage)))
                    }}
                    className={`p-3 rounded-lg text-left transition-colors border ${
                      selectedWeekIndex === index
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-muted-foreground/30'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      {week.isNextWeek && (
                        <span className="text-[10px] bg-primary text-primary-foreground px-1 py-0.5 rounded">NEXT</span>
                      )}
                      <span className="text-xs font-medium">{formatWeekDate(week.weekStart).split(' - ')[0]}</span>
                    </div>
                    <div className="mt-1.5">
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary/50"
                          style={{ width: `${100 - week.availablePercentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{week.availablePercentage}% available</span>
                    </div>
                  </button>
                ))}
              </div>

              {selectedWeek && (
                <>
                  {/* Percentage slider */}
                  <div className="pt-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium">Network share</label>
                      <span className="text-sm text-muted-foreground">Max 40%</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={maxPercentage}
                      value={percentage}
                      onChange={(e) => setPercentage(parseInt(e.target.value))}
                      className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>1%</span>
                      <span className="font-bold text-foreground text-lg">{percentage}%</span>
                      <span>{maxPercentage}%</span>
                    </div>
                  </div>

                  {/* Cost summary */}
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CurrencyDollar className="h-6 w-6 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {isNextWeek ? 'Cost' : 'Est. Cost'}
                        </p>
                        {isNextWeek ? (
                          <p className="text-xl font-bold">${costDollars}</p>
                        ) : (
                          <p className="text-lg font-bold">${minCostDollars} - ${maxCostDollars}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Users className="h-6 w-6 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Est. Reach</p>
                        <p className="text-xl font-bold">{estimatedUsers.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  {/* Price adjustment explanation for future weeks */}
                  {!isNextWeek && (
                    <div className="text-xs text-muted-foreground p-3 bg-background rounded border">
                      <p className="font-medium text-foreground mb-1">Why a range?</p>
                      <p>Future week prices adjust based on demand:</p>
                      <ul className="mt-1 space-y-0.5">
                        <li>• ≥90% sold → +10%</li>
                        <li>• ≥70% sold → +5%</li>
                        <li>• &lt;50% sold → -5%</li>
                        <li>• &lt;30% sold → -10%</li>
                      </ul>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

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

          <Button onClick={createCampaign} disabled={saving || !selectedWeek} className="w-full" size="lg">
            {saving ? (
              <>
                <SpinnerGap className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : isNextWeek ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Create Campaign & Book {percentage}% for ${costDollars}
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Create Campaign & Reserve {percentage}% (~${minCostDollars}-${maxCostDollars})
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  )
}

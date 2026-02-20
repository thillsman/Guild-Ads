'use client'

import { type ElementType, useMemo, useState } from 'react'
import { Broadcast, ChartLine, Megaphone, Storefront } from '@phosphor-icons/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type ExampleAppName = 'App A' | 'App B' | 'App C' | 'App D'

type AppTheme = {
  label: string
  icon: ElementType
  iconContainerClass: string
  iconClass: string
  rowClass: string
  sliderClass: string
  chipClass: string
}

const APP_THEMES: Record<ExampleAppName, AppTheme> = {
  'App A': {
    label: 'Trail Notes',
    icon: Megaphone,
    iconContainerClass: 'bg-sky-500/15 ring-sky-500/30',
    iconClass: 'text-sky-700 dark:text-sky-300',
    rowClass: 'border-sky-500/30 bg-sky-500/[0.04]',
    sliderClass: 'accent-sky-500',
    chipClass: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  },
  'App B': {
    label: 'Echo Harbor',
    icon: Broadcast,
    iconContainerClass: 'bg-emerald-500/15 ring-emerald-500/30',
    iconClass: 'text-emerald-700 dark:text-emerald-300',
    rowClass: 'border-emerald-500/30 bg-emerald-500/[0.04]',
    sliderClass: 'accent-emerald-500',
    chipClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  },
  'App C': {
    label: 'Goal Grid',
    icon: ChartLine,
    iconContainerClass: 'bg-amber-500/15 ring-amber-500/30',
    iconClass: 'text-amber-700 dark:text-amber-300',
    rowClass: 'border-amber-500/30 bg-amber-500/[0.04]',
    sliderClass: 'accent-amber-500',
    chipClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  },
  'App D': {
    label: 'ShopSprint',
    icon: Storefront,
    iconContainerClass: 'bg-rose-500/15 ring-rose-500/30',
    iconClass: 'text-rose-700 dark:text-rose-300',
    rowClass: 'border-rose-500/30 bg-rose-500/[0.04]',
    sliderClass: 'accent-rose-500',
    chipClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
  },
}

const ALL_APPS: ExampleAppName[] = ['App A', 'App B', 'App C', 'App D']
const ADVERTISER_APPS: ExampleAppName[] = ['App A', 'App B', 'App C']
const PUBLISHER_APPS: ExampleAppName[] = ['App B', 'App C', 'App D']
const MIN_WEEKLY_COST = 1_000
const MAX_WEEKLY_COST = 100_000

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function rebalancePercentages(values: number[], updatedIndex: number, updatedValue: number): number[] {
  const nextValues = [...values]
  const clampedUpdated = clamp(Math.round(updatedValue), 0, 100)
  nextValues[updatedIndex] = clampedUpdated

  const otherIndices = values.map((_, index) => index).filter((index) => index !== updatedIndex)
  const remaining = 100 - clampedUpdated

  if (otherIndices.length === 0) {
    return [100]
  }

  const currentOthersTotal = otherIndices.reduce((sum, index) => sum + values[index], 0)
  if (currentOthersTotal === 0) {
    nextValues[otherIndices[0]] = remaining
    for (const index of otherIndices.slice(1)) {
      nextValues[index] = 0
    }
    return nextValues
  }

  const scaled = otherIndices.map((index) => (values[index] / currentOthersTotal) * remaining)
  const rounded = scaled.map((value) => Math.round(value))
  const roundedTotal = rounded.reduce((sum, value) => sum + value, 0)
  rounded[0] += remaining - roundedTotal

  otherIndices.forEach((index, position) => {
    nextValues[index] = clamp(rounded[position], 0, 100)
  })

  const finalTotal = nextValues.reduce((sum, value) => sum + value, 0)
  if (finalTotal !== 100) {
    nextValues[otherIndices[0]] += 100 - finalTotal
  }

  return nextValues
}

function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })
}

function AppIdentity({ name }: { name: ExampleAppName }) {
  const theme = APP_THEMES[name]
  const Icon = theme.icon

  return (
    <div className="flex items-center gap-3">
      <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl ring-1', theme.iconContainerClass)}>
        <Icon className={cn('h-5 w-5', theme.iconClass)} weight="duotone" />
      </div>
      <div>
        <p className="font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">{theme.label}</p>
      </div>
    </div>
  )
}

export function NetworkCalculator() {
  const [weeklyCost, setWeeklyCost] = useState(10_000)
  const [advertiserShares, setAdvertiserShares] = useState([40, 40, 20])
  const [publisherReach, setPublisherReach] = useState([30, 30, 40])

  const payoutPool = weeklyCost * 0.7

  const advertiserRows = useMemo(
    () =>
      ADVERTISER_APPS.map((name, index) => ({
        name,
        percent: advertiserShares[index],
        amount: weeklyCost * (advertiserShares[index] / 100),
      })),
    [advertiserShares, weeklyCost]
  )

  const publisherRows = useMemo(
    () =>
      PUBLISHER_APPS.map((name, index) => ({
        name,
        percent: publisherReach[index],
        amount: payoutPool * (publisherReach[index] / 100),
      })),
    [publisherReach, payoutPool]
  )

  const overlapRows = useMemo(() => {
    const advertiserByName = new Map(advertiserRows.map((row) => [row.name, row]))
    const publisherByName = new Map(publisherRows.map((row) => [row.name, row]))

    return ADVERTISER_APPS.filter((name) => publisherByName.has(name)).map((name) => {
      const spend = advertiserByName.get(name)?.amount ?? 0
      const payout = publisherByName.get(name)?.amount ?? 0
      return {
        name,
        spend,
        payout,
        net: payout - spend,
      }
    })
  }, [advertiserRows, publisherRows])

  const appB = overlapRows.find((row) => row.name === 'App B')
  const appC = overlapRows.find((row) => row.name === 'App C')

  function updateWeeklyCost(rawValue: number) {
    if (Number.isNaN(rawValue)) {
      return
    }
    setWeeklyCost(clamp(Math.round(rawValue), MIN_WEEKLY_COST, MAX_WEEKLY_COST))
  }

  return (
    <section className="border-y bg-muted/30">
      <div className="container mx-auto max-w-6xl px-4 py-16 md:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Weekly Network Calculator</h2>
            <p className="mx-auto mt-4 max-w-3xl text-muted-foreground">
              Tune advertiser share and publisher reach to see how money moves each week.
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {ALL_APPS.map((name) => {
              const theme = APP_THEMES[name]
              return (
                <div key={name} className={cn('rounded-lg border p-3', theme.rowClass)}>
                  <AppIdentity name={name} />
                </div>
              )
            })}
          </div>

          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Example Weekly Network Cost</CardTitle>
              <CardDescription>Adjust this to model larger or smaller weeks.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="weekly-cost">Weekly Network Cost</Label>
                <input
                  id="weekly-cost"
                  type="range"
                  min={MIN_WEEKLY_COST}
                  max={MAX_WEEKLY_COST}
                  step={500}
                  value={weeklyCost}
                  onChange={(event) => updateWeeklyCost(Number(event.target.value))}
                  className="h-2 w-full cursor-pointer accent-primary"
                />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Input
                  type="number"
                  min={MIN_WEEKLY_COST}
                  max={MAX_WEEKLY_COST}
                  step={500}
                  value={weeklyCost}
                  onChange={(event) => updateWeeklyCost(Number(event.target.value))}
                  className="w-full sm:max-w-xs"
                />
                <p className="text-lg font-semibold">{formatCurrency(weeklyCost)}</p>
              </div>
            </CardContent>
          </Card>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Advertisers (Buy Weekly Share)</CardTitle>
                <CardDescription>
                  If an app buys 40% of the network, it pays 40% of weekly network cost.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {advertiserRows.map((row, index) => (
                  <div key={row.name} className={cn('space-y-3 rounded-lg border p-3', APP_THEMES[row.name].rowClass)}>
                    <div className="flex items-center justify-between gap-3">
                      <AppIdentity name={row.name} />
                      <p className={cn('rounded-md px-2 py-1 text-sm tabular-nums', APP_THEMES[row.name].chipClass)}>
                        {row.percent}% - {formatCurrency(row.amount)}
                      </p>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={row.percent}
                      onChange={(event) =>
                        setAdvertiserShares((current) =>
                          rebalancePercentages(current, index, Number(event.target.value))
                        )
                      }
                      className={cn('h-2 w-full cursor-pointer', APP_THEMES[row.name].sliderClass)}
                    />
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(weeklyCost)} * {row.percent}% = {formatCurrency(row.amount)}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Publishers (Reach Share)</CardTitle>
                <CardDescription>
                  70% of weekly network cost is split by each app&apos;s share of users reached.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {publisherRows.map((row, index) => (
                  <div key={row.name} className={cn('space-y-3 rounded-lg border p-3', APP_THEMES[row.name].rowClass)}>
                    <div className="flex items-center justify-between gap-3">
                      <AppIdentity name={row.name} />
                      <p className={cn('rounded-md px-2 py-1 text-sm tabular-nums', APP_THEMES[row.name].chipClass)}>
                        {row.percent}% - {formatCurrency(row.amount)}
                      </p>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={row.percent}
                      onChange={(event) =>
                        setPublisherReach((current) =>
                          rebalancePercentages(current, index, Number(event.target.value))
                        )
                      }
                      className={cn('h-2 w-full cursor-pointer', APP_THEMES[row.name].sliderClass)}
                    />
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(payoutPool)} * {row.percent}% = {formatCurrency(row.amount)}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card className="mt-8 border-primary/30">
            <CardHeader>
              <CardTitle>What Happens When Apps Both Advertise and Publish?</CardTitle>
              <CardDescription>
                When a publisher is also an advertiser, payout offsets ad spend.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>
                Publisher payout pool: <span className="font-semibold text-foreground">{formatCurrency(payoutPool)}</span>{' '}
                ({formatCurrency(weeklyCost)} * 70%)
              </p>

              <div className="grid gap-3 md:grid-cols-2">
                {overlapRows.map((row) => {
                  const theme = APP_THEMES[row.name]
                  return (
                    <div key={row.name} className={cn('rounded-lg border p-3', theme.rowClass)}>
                      <AppIdentity name={row.name} />
                      <p className="mt-1">Ad spend: {formatCurrency(row.spend)}</p>
                      <p>Payout: {formatCurrency(row.payout)}</p>
                      <p className="mt-1">
                        Net:{' '}
                        <span className="font-semibold text-foreground">
                          {row.net >= 0
                            ? `${formatCurrency(row.net)} received`
                            : `${formatCurrency(Math.abs(row.net))} owed`}
                        </span>
                      </p>
                    </div>
                  )
                })}
              </div>

              {appB && appC ? (
                <p className="rounded-lg border bg-background p-3 text-foreground">
                  In this scenario, <span className="font-semibold">App B</span>{' '}
                  {appB.net >= 0
                    ? `receives ${formatCurrency(appB.net)} after offsetting spend.`
                    : `only pays the difference: ${formatCurrency(Math.abs(appB.net))}.`}{' '}
                  <span className="font-semibold">App C</span>{' '}
                  {appC.net >= 0
                    ? `gets paid out ${formatCurrency(appC.net)} after covering ad spend.`
                    : `pays the remaining ${formatCurrency(Math.abs(appC.net))} after payout offset.`}
                </p>
              ) : null}

              <p className="text-xs">
                Distinct users are counted within each app to avoid cross-app tracking.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}

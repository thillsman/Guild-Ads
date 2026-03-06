export const dynamic = 'force-dynamic'
export const revalidate = 0

import Link from 'next/link'
import Image from 'next/image'
import { unstable_noStore as noStore } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Broadcast, Megaphone, ChartLine, Storefront, ShieldCheck } from '@phosphor-icons/react/dist/ssr'
import { NetworkCalculator } from '@/components/home/network-calculator'
import { FramedAdPreview } from '@/components/home/framed-ad-preview'
import { getLiveNetworkStats } from '@/lib/network/live-network-stats'

export default async function Home() {
  noStore()

  const supabase = createAdminClient()
  const liveNetworkStats = await getLiveNetworkStats(supabase)
  const hasLiveNetworkStats = Boolean(
    liveNetworkStats &&
      (liveNetworkStats.advertiserAppsCount > 0 ||
        liveNetworkStats.publisherAppsCount > 0 ||
        liveNetworkStats.trailing7dUsers > 0)
  )

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto max-w-6xl flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.svg"
              alt="Guild Ads"
              width={24}
              height={28}
              className="dark:hidden"
            />
            <Image
              src="/logo-white.svg"
              alt="Guild Ads"
              width={24}
              height={28}
              className="hidden dark:block"
            />
            <span className="text-xl font-bold">Guild Ads</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/faq" className="text-sm text-muted-foreground hover:text-foreground">
              FAQ
            </Link>
            <Button variant="ghost" asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/#choose-your-path">Get Started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="border-b bg-gradient-to-b from-primary/10 via-background to-background">
          <div className="container mx-auto max-w-6xl px-4 py-20 md:py-24">
            <div className="grid gap-10 lg:grid-cols-[1.05fr,0.95fr] lg:items-center">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
                  Privacy-Friendly Ad Network For Indie iOS Apps
                </p>
                <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                  Acquire users or monetize with ads that fit the app.
                </h1>
                <p className="mt-6 text-lg text-muted-foreground">
                  Guild Ads helps indie iOS app teams grow from either side of the marketplace.
                  Advertisers buy predictable weekly reach across other indie apps. Publishers add one
                  tasteful ad placement, earn weekly payouts, and keep a clean upgrade path
                  without cross-app tracking.
                </p>
                <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                  <Button size="lg" asChild>
                    <Link href="/login?role=advertiser">Advertise Your App</Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link href="/login?role=publisher">Monetize Your App</Link>
                  </Button>
                </div>
                <div className="mt-6 flex flex-wrap gap-2 text-sm text-muted-foreground">
                  <span className="rounded-full border bg-background px-3 py-1">Static ad format</span>
                  <span className="rounded-full border bg-background px-3 py-1">Weekly share pricing</span>
                  <span className="rounded-full border bg-background px-3 py-1">No device IDs</span>
                  <span className="rounded-full border bg-background px-3 py-1">No cross-app tracking</span>
                </div>
              </div>

              <div className="space-y-4 lg:pt-10 xl:pt-12">
                <FramedAdPreview />

                {hasLiveNetworkStats && liveNetworkStats && (
                  <Card className="border-primary/20 bg-background/90">
                    <CardHeader className="pb-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                        Live Network Snapshot
                      </p>
                      <CardTitle className="text-xl leading-tight">
                        Active marketplace signal for both sides.
                      </CardTitle>
                      <CardDescription>
                        Current advertisers and trailing 7-day publisher reach, summed within each app.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Advertisers</p>
                        <p className="mt-1 text-3xl font-bold">
                          {liveNetworkStats.advertiserAppsCount.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">Confirmed this week</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Publisher apps</p>
                        <p className="mt-1 text-3xl font-bold">
                          {liveNetworkStats.publisherAppsCount.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">Active in the last 7 days</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Publisher users</p>
                        <p className="mt-1 text-3xl font-bold">
                          {liveNetworkStats.trailing7dUsers.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Summed app uniques, last {liveNetworkStats.trailingDays} days
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </section>

        <section id="choose-your-path" className="container mx-auto max-w-6xl px-4 py-16 md:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Choose the side that fits your growth model
            </h2>
            <p className="mt-4 text-muted-foreground">
              Start as an advertiser, a publisher, or both. The product is built so an indie team can
              acquire users, earn revenue, and reinvest without switching tools.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <Card className="h-full border-primary/20">
              <CardHeader>
                <CardTitle className="text-2xl">For Advertisers</CardTitle>
                <CardDescription className="text-base">
                  Put your app in front of users inside other indie iOS apps with predictable weekly share.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex h-full flex-col justify-between gap-6">
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li>Buy weekly reach instead of managing noisy auction campaigns.</li>
                  <li>Use lightweight ad creative that matches the product style of the network.</li>
                  <li>Show up in apps where users are already engaged, without surveillance-style targeting.</li>
                </ul>
                <Button asChild>
                  <Link href="/login?role=advertiser">Create Advertiser Account</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="h-full border-primary/20">
              <CardHeader>
                <CardTitle className="text-2xl">For Publishers</CardTitle>
                <CardDescription className="text-base">
                  Add one tasteful ad placement, earn weekly payouts, and keep a clean path to ad-free upgrades.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex h-full flex-col justify-between gap-6">
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li>Monetize with a static, clearly labeled format instead of cluttering your app with ad-tech baggage.</li>
                  <li>Earn a share of weekly cash spend based on the users your app reaches that week.</li>
                  <li>Use bonus credits to reinvest in growth and close the loop on your own user acquisition.</li>
                </ul>
                <Button variant="outline" asChild>
                  <Link href="/login?role=publisher">Create Publisher Account</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="border-y bg-muted/30">
          <div className="container mx-auto max-w-6xl px-4 py-16 md:py-20">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Why Guild Ads feels different from ad tech
              </h2>
              <p className="mt-4 text-muted-foreground">
                The product promise is simple: one classy format, clear weekly math, and privacy constraints
                that stay visible in the business model.
              </p>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              <Card className="h-full">
                <CardHeader>
                  <Megaphone className="h-9 w-9 text-primary" weight="duotone" />
                  <CardTitle className="mt-3 text-lg">One clean ad format</CardTitle>
                  <CardDescription>
                    Static, lightweight placements with a clear label and one CTA. No popups, interstitials, or surprise takeovers.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="h-full">
                <CardHeader>
                  <ShieldCheck className="h-9 w-9 text-primary" weight="duotone" />
                  <CardTitle className="mt-3 text-lg">Privacy by design</CardTitle>
                  <CardDescription>
                    No device IDs, no behavioral profiles, and no cross-app tracking. Reporting stays aggregate and easier to defend.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="h-full">
                <CardHeader>
                  <ChartLine className="h-9 w-9 text-primary" weight="duotone" />
                  <CardTitle className="mt-3 text-lg">Weekly market math</CardTitle>
                  <CardDescription>
                    Advertisers buy share of the week. Publishers earn from the weekly cash pool. Pricing and payouts follow posted rules.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        <section className="container mx-auto max-w-6xl px-4 py-16 md:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              How the network works each week
            </h2>
            <p className="mt-4 text-muted-foreground">
              Enough detail to reduce uncertainty, without turning the homepage into a pricing policy document.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader>
                <Megaphone className="h-9 w-9 text-primary" weight="duotone" />
                <CardTitle className="mt-3 text-lg">1. Add your app</CardTitle>
                <CardDescription>
                  Connect your App Store listing so Guild Ads can set up your advertiser or publisher workflow.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <ChartLine className="h-9 w-9 text-primary" weight="duotone" />
                <CardTitle className="mt-3 text-lg">2. Advertisers book weekly share</CardTitle>
                <CardDescription>
                  Buy a percentage of next week&apos;s network inventory instead of juggling bids across auctions.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Broadcast className="h-9 w-9 text-primary" weight="duotone" />
                <CardTitle className="mt-3 text-lg">3. Publishers serve ads</CardTitle>
                <CardDescription>
                  Add one or more placements with the SDK and keep the format lightweight, labeled, and easy on users.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Storefront className="h-9 w-9 text-primary" weight="duotone" />
                <CardTitle className="mt-3 text-lg">4. The week closes cleanly</CardTitle>
                <CardDescription>
                  Payouts, credits, and next-week pricing are all derived from the closed week using visible rules.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>

        <NetworkCalculator />

        <section className="border-y bg-muted/30">
          <div className="container mx-auto max-w-6xl px-4 py-16 md:py-20">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Clear economics for both sides
              </h2>
              <p className="mt-4 text-muted-foreground">
                Advertisers get predictable exposure. Publishers get a visible cash pool plus credits that can be turned back into growth.
              </p>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Advertiser floor</CardTitle>
                  <CardDescription>
                    Book a share of the week and expect that share of delivered inventory, with upside when the week is undersold.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Publisher payout pool</CardTitle>
                  <CardDescription>
                    70% of advertiser cash spend is paid to publishers based on their share of counted users reached that week.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="h-full border-primary/30">
                <CardHeader>
                  <ShieldCheck className="h-9 w-9 text-primary" weight="duotone" />
                  <CardTitle className="mt-3">Publisher bonus credits</CardTitle>
                  <CardDescription>
                    Finalized publisher earnings also generate a permanent 10% bonus credit, making reinvestment part of the product loop.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        <section className="border-t">
          <div className="container mx-auto max-w-6xl px-4 py-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Build a cleaner app growth loop
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Start with the side you need today. Promote your app, monetize your audience, or do both and
              use the upside to fund ad-free upgrades for your most engaged users.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/login?role=advertiser">Start as Advertiser</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login?role=publisher">Start as Publisher</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              App Store URLs only for now. Guild Ads is currently built for iOS apps.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground">
          <div className="mb-3 flex flex-wrap items-center justify-center gap-4">
            <Link href="/faq" className="hover:text-foreground">FAQ</Link>
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
          </div>
          <p>&copy; {new Date().getFullYear()} Guild Ads. Built for indie developers.</p>
        </div>
      </footer>
    </div>
  )
}

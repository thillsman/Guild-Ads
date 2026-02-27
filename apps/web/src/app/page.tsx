import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Broadcast, Megaphone, ChartLine, Storefront, ShieldCheck } from '@phosphor-icons/react/dist/ssr'
import { NetworkCalculator } from '@/components/home/network-calculator'

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto max-w-6xl flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
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
          </div>
          <nav className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/login">Get Started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="border-b bg-gradient-to-b from-primary/10 via-background to-background">
          <div className="container mx-auto max-w-6xl px-4 py-20 md:py-24">
            <div className="mx-auto max-w-5xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
                Built for Indie Apps
              </p>
              <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                Grow downloads, earn revenue, and give users a clean upgrade path.
              </h1>
              <p className="mx-auto mt-6 max-w-3xl text-lg text-muted-foreground">
                Guild Ads is an easy, privacy-friendly ad network for indie apps. Run good-looking ads in
                other apps to get installs. Show ads in your own app to earn weekly payouts. Do both and build
                a simple growth loop without cross-app tracking.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button size="lg" asChild>
                  <Link href="/login?role=advertiser">Advertise Your App</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/login?role=publisher">Monetize Your App</Link>
                </Button>
              </div>
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-3">
              <Card className="border-primary/20 bg-background/80">
                <CardHeader>
                  <CardTitle className="text-base">Make money as a publisher</CardTitle>
                  <CardDescription>
                    Show clean, native-feeling ads in your app and earn weekly payouts from network spend.
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card className="border-primary/20 bg-background/80">
                <CardHeader>
                  <CardTitle className="text-base">Get downloads as an advertiser</CardTitle>
                  <CardDescription>
                    Put your app in front of users in other indie apps and buy weekly share for predictable delivery.
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card className="border-primary/20 bg-background/80">
                <CardHeader>
                  <CardTitle className="text-base">Use both sides for a flywheel</CardTitle>
                  <CardDescription>
                    Earn from your audience, reinvest in ads, and fund ad-free subscription upgrades for your power users.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="container mx-auto max-w-6xl px-4 py-16 md:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">How The Network Works Each Week</h2>
            <p className="mt-4 text-muted-foreground">
              Simple market mechanics, clear math, and transparent payout rules.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader>
                <Megaphone className="h-9 w-9 text-primary" weight="duotone" />
                <CardTitle className="mt-3 text-lg">1. Advertisers Buy Share</CardTitle>
                <CardDescription>
                  Advertisers purchase a percentage of all ad spots across the network for the week.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <ChartLine className="h-9 w-9 text-primary" weight="duotone" />
                <CardTitle className="mt-3 text-lg">2. Price Resets Weekly</CardTitle>
                <CardDescription>
                  Next week&apos;s price is set from last week&apos;s inventory and demand.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Broadcast className="h-9 w-9 text-primary" weight="duotone" />
                <CardTitle className="mt-3 text-lg">3. Publishers Show Ads</CardTitle>
                <CardDescription>
                  Add one or more placements with the SDK and start serving ads in your app.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Storefront className="h-9 w-9 text-primary" weight="duotone" />
                <CardTitle className="mt-3 text-lg">4. Weekly Payout Distribution</CardTitle>
                <CardDescription>
                  70% of advertiser spend is paid to publishers based on their share of network app-users reached.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>

        <NetworkCalculator />

        {/* Advertiser + Publisher Math */}
        <section className="border-y bg-muted/30">
          <div className="container mx-auto max-w-6xl grid gap-6 px-4 py-16 md:grid-cols-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>For Advertisers</CardTitle>
                <CardDescription>Clear weekly reach with share-based delivery.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <p>
                  You buy a share of the network for a week. If you buy <span className="font-semibold text-foreground">30%</span>,
                  your ad should appear about <span className="font-semibold text-foreground">30%</span> of the time.
                </p>
                <p>
                  This is designed for indie teams that want predictable exposure without surveillance-style targeting.
                </p>
              </CardContent>
            </Card>

            <Card className="h-full">
              <CardHeader>
                <CardTitle>For Publishers</CardTitle>
                <CardDescription>
                  Earn weekly ad revenue and keep a clear path to ad-free subscriptions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <p>
                  If your app accounts for <span className="font-semibold text-foreground">30%</span> of the network&apos;s app-users reached that week,
                  you receive <span className="font-semibold text-foreground">30%</span> of the publisher payout pool.
                </p>
                <p>
                  Distinct users are counted <span className="font-semibold text-foreground">within each app</span> to avoid cross-app tracking, so you can monetize responsibly.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="container mx-auto max-w-6xl px-4 py-12">
          <Card className="mx-auto max-w-4xl border-primary/30">
            <CardHeader>
              <ShieldCheck className="h-10 w-10 text-primary" weight="duotone" />
              <CardTitle className="mt-4 text-2xl">Publisher Credits + Bonus</CardTitle>
              <CardDescription className="text-base">
                Apply publisher payout to future ads and get a limited-time <span className="font-semibold text-foreground">10% bonus</span>.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>
                This gives indie teams a fast loop: earn from placements, then reinvest in growth across the network.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* CTA */}
        <section className="border-t">
          <div className="container mx-auto max-w-6xl px-4 py-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight">Grow and Monetize Without Creepy Tracking</h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Guild Ads helps indie teams grow in both directions: advertise to get users, publish to earn,
              and use the upside to fund upgrades that remove ads for your most engaged customers.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/login?role=publisher">Start as Publisher</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login?role=advertiser">Start as Advertiser</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Guild Ads. Built for indie developers.</p>
        </div>
      </footer>
    </div>
  )
}

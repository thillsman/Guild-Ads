import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Broadcast, Storefront, ShieldCheck } from '@phosphor-icons/react/dist/ssr'

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
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

      {/* Hero */}
      <section className="container mx-auto px-4 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          Privacy-friendly sponsor cards
          <br />
          <span className="text-primary">for indie apps</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          A tasteful ad network that respects your users. No tracking, no behavioral profiling,
          no creepy auctions. Just clean, contextual sponsorships.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Button size="lg" asChild>
            <Link href="/login?role=advertiser">Advertise Your App</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login?role=publisher">Monetize Your App</Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid gap-8 md:grid-cols-3">
          <Card>
            <CardHeader>
              <ShieldCheck className="h-10 w-10 text-primary" weight="duotone" />
              <CardTitle className="mt-4">Privacy-First</CardTitle>
              <CardDescription>
                No device identifiers, no third-party tracking, no behavioral profiles.
                Only aggregate reporting with privacy thresholds.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Broadcast className="h-10 w-10 text-primary" weight="duotone" />
              <CardTitle className="mt-4">Classy by Default</CardTitle>
              <CardDescription>
                Static sponsor cards only. No animations, no audio, no popups,
                no interstitials. Just tasteful, lightweight placements.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Storefront className="h-10 w-10 text-primary" weight="duotone" />
              <CardTitle className="mt-4">Simple Marketplace</CardTitle>
              <CardDescription>
                Time-based slots, curated bundles, transparent pricing.
                Buy weekly or daily slots with predictable costs.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Guild Ads. Built for indie developers.</p>
        </div>
      </footer>
    </div>
  )
}

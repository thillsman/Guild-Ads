import Link from 'next/link'
import Image from 'next/image'
import type { ReactNode } from 'react'

interface PublicPageShellProps {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
}

export function PublicPageShell({
  eyebrow,
  title,
  description,
  children,
}: PublicPageShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
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
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/faq" className="hover:text-foreground">FAQ</Link>
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link href="/login" className="hover:text-foreground">Login</Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-16">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
          <p className="mt-4 text-lg text-muted-foreground">{description}</p>
        </div>

        <div className="mt-12 space-y-10">
          {children}
        </div>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-4 px-4 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <Link href="/faq" className="hover:text-foreground">FAQ</Link>
          <Link href="/terms" className="hover:text-foreground">Terms</Link>
          <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
        </div>
      </footer>
    </div>
  )
}

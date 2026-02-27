'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'

interface DashboardSidebarProps {
  defaultAppId: string | null
}

interface NavItem {
  label: string
  href: string
  active: boolean
}

export function DashboardSidebar({ defaultAppId }: DashboardSidebarProps) {
  const pathname = usePathname()
  const [hash, setHash] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const syncHash = () => setHash(window.location.hash)
    syncHash()
    window.addEventListener('hashchange', syncHash)
    return () => window.removeEventListener('hashchange', syncHash)
  }, [])

  const routeAppId = useMemo(() => {
    const match = pathname.match(/^\/dashboard\/apps\/([^/]+)/)
    return match?.[1] ?? null
  }, [pathname])

  const activeAppId = routeAppId ?? defaultAppId
  const hasApp = !!activeAppId

  const advertisePath = hasApp ? `/dashboard/apps/${activeAppId}/advertise` : '/dashboard/apps/new'
  const publishPath = hasApp ? `/dashboard/apps/${activeAppId}/publish` : '/dashboard/apps/new'

  const isOverview = pathname === '/dashboard'
  const isAdvertise = /^\/dashboard\/apps\/[^/]+\/advertise/.test(pathname)
  const isPublish = /^\/dashboard\/apps\/[^/]+\/publish/.test(pathname)
  const isAdPerformanceAnchor = hash === '#ad-performance'
  const isPublisherPerformanceAnchor = hash === '#publisher-performance'

  const topItems: NavItem[] = [
    {
      label: 'App Overview',
      href: '/dashboard',
      active: isOverview,
    },
  ]

  const advertiseItems: NavItem[] = [
    {
      label: 'Advertise View + Payment',
      href: hasApp ? `${advertisePath}#advertise-payment` : advertisePath,
      active: isAdvertise && !isAdPerformanceAnchor,
    },
    {
      label: 'Ad Performance',
      href: hasApp ? `${advertisePath}#ad-performance` : advertisePath,
      active: isAdvertise && isAdPerformanceAnchor,
    },
  ]

  const publishItems: NavItem[] = [
    {
      label: 'Earn Money / Publish + Payout Account',
      href: hasApp ? `${publishPath}#publish-payout` : publishPath,
      active: isPublish && !isPublisherPerformanceAnchor,
    },
    {
      label: 'Publisher Performance',
      href: hasApp ? `${publishPath}#publisher-performance` : publishPath,
      active: isPublish && isPublisherPerformanceAnchor,
    },
  ]

  return (
    <nav className="rounded-xl border bg-card p-3 lg:sticky lg:top-6">
      <ul className="space-y-1">
        {topItems.map((item) => (
          <li key={item.label}>
            <Link
              href={item.href}
              className={cn(
                'block rounded-lg px-3 py-2 text-sm transition-colors',
                item.active
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>

      <div className="my-3 border-t" />

      <ul className="space-y-1">
        {advertiseItems.map((item) => (
          <li key={item.label}>
            <Link
              href={item.href}
              className={cn(
                'block rounded-lg px-3 py-2 text-sm transition-colors',
                item.active
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>

      <div className="my-3 border-t" />

      <ul className="space-y-1">
        {publishItems.map((item) => (
          <li key={item.label}>
            <Link
              href={item.href}
              className={cn(
                'block rounded-lg px-3 py-2 text-sm transition-colors',
                item.active
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>

      {!hasApp && (
        <p className="mt-3 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          Add an app to enable app-specific sections.
        </p>
      )}
    </nav>
  )
}

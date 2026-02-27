'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { type ChangeEvent, useMemo } from 'react'
import { cn } from '@/lib/utils'

interface SidebarApp {
  app_id: string
  name: string
}

interface DashboardSidebarProps {
  apps: SidebarApp[]
  defaultAppId: string | null
}

interface NavItem {
  label: string
  href: string
  active: boolean
}

type AppSection = 'overview' | 'advertise' | 'ad-performance' | 'publish' | 'publisher-performance'

function getCurrentSection(pathname: string): AppSection {
  if (pathname === '/dashboard') {
    return 'overview'
  }

  if (/^\/dashboard\/apps\/[^/]+\/ad-performance(?:\/|$)/.test(pathname)) {
    return 'ad-performance'
  }

  if (/^\/dashboard\/apps\/[^/]+\/publisher-performance(?:\/|$)/.test(pathname)) {
    return 'publisher-performance'
  }

  if (/^\/dashboard\/apps\/[^/]+\/publish(?:\/|$)/.test(pathname)) {
    return 'publish'
  }

  if (/^\/dashboard\/apps\/[^/]+\/advertise(?:\/|$)/.test(pathname)) {
    return 'advertise'
  }

  return 'overview'
}

function routeForSection(appId: string, section: AppSection): string {
  switch (section) {
    case 'ad-performance':
      return `/dashboard/apps/${appId}/ad-performance`
    case 'publish':
      return `/dashboard/apps/${appId}/publish`
    case 'publisher-performance':
      return `/dashboard/apps/${appId}/publisher-performance`
    case 'advertise':
      return `/dashboard/apps/${appId}/advertise`
    case 'overview':
    default:
      return `/dashboard/apps/${appId}/advertise`
  }
}

export function DashboardSidebar({ apps, defaultAppId }: DashboardSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const routeAppId = useMemo(() => {
    const match = pathname.match(
      /^\/dashboard\/apps\/([^/]+)\/(?:advertise|ad-performance|publish|publisher-performance)(?:\/|$)/,
    )
    return match?.[1] ?? null
  }, [pathname])

  const activeAppId = routeAppId ?? defaultAppId
  const hasApp = !!activeAppId
  const currentSection = getCurrentSection(pathname)

  const advertisePath = hasApp ? `/dashboard/apps/${activeAppId}/advertise` : '/dashboard/apps/new'
  const adPerformancePath = hasApp ? `/dashboard/apps/${activeAppId}/ad-performance` : '/dashboard/apps/new'
  const publishPath = hasApp ? `/dashboard/apps/${activeAppId}/publish` : '/dashboard/apps/new'
  const publisherPerformancePath = hasApp ? `/dashboard/apps/${activeAppId}/publisher-performance` : '/dashboard/apps/new'

  const onSelectApp = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value
    if (value === '__new__') {
      router.push('/dashboard/apps/new')
      return
    }

    if (!value) {
      return
    }

    router.push(routeForSection(value, currentSection))
  }

  const topItems: NavItem[] = [
    {
      label: 'App Overview',
      href: '/dashboard',
      active: pathname === '/dashboard',
    },
  ]

  const advertiseItems: NavItem[] = [
    {
      label: 'Advertise',
      href: advertisePath,
      active: /^\/dashboard\/apps\/[^/]+\/advertise(?:\/|$)/.test(pathname),
    },
    {
      label: 'Ad Performance',
      href: adPerformancePath,
      active: /^\/dashboard\/apps\/[^/]+\/ad-performance(?:\/|$)/.test(pathname),
    },
  ]

  const publishItems: NavItem[] = [
    {
      label: 'Publish and Earn',
      href: publishPath,
      active: /^\/dashboard\/apps\/[^/]+\/publish(?:\/|$)/.test(pathname),
    },
    {
      label: 'Publisher Performance',
      href: publisherPerformancePath,
      active: /^\/dashboard\/apps\/[^/]+\/publisher-performance(?:\/|$)/.test(pathname),
    },
  ]

  return (
    <nav className="rounded-xl border bg-card p-3 lg:sticky lg:top-6">
      <div className="mb-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">App</p>
        <select
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          onChange={onSelectApp}
          value={activeAppId ?? ''}
        >
          {apps.length === 0 ? (
            <option value="">No apps yet</option>
          ) : (
            apps.map((app) => (
              <option key={app.app_id} value={app.app_id}>
                {app.name}
              </option>
            ))
          )}
          <option value="__new__">+ Add new app</option>
        </select>
      </div>

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

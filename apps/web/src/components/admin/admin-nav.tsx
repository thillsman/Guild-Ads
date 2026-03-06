'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const ADMIN_ITEMS = [
  { label: 'Overview', href: '/dashboard/admin' },
  { label: 'All Users', href: '/dashboard/admin/users' },
]

function isActive(pathname: string, href: string): boolean {
  if (href === '/dashboard/admin') {
    return pathname === href
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AdminNav() {
  const pathname = usePathname()

  return (
    <div className="flex flex-wrap gap-2">
      {ADMIN_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'rounded-lg border px-3 py-2 text-sm transition-colors',
            isActive(pathname, item.href)
              ? 'border-primary/30 bg-primary/10 text-primary font-semibold'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          {item.label}
        </Link>
      ))}
    </div>
  )
}

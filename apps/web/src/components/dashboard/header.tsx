'use client'

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Broadcast, SignOut, User } from '@phosphor-icons/react'

interface DashboardHeaderProps {
  user: {
    id: string
    email: string
  }
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <header className="border-b">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Broadcast className="h-6 w-6 text-primary" weight="duotone" />
          <span className="text-xl font-bold">Guild Ads</span>
        </Link>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">{user.email}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <SignOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>
      </div>
    </header>
  )
}

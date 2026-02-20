'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EnvelopeSimple, Lock } from '@phosphor-icons/react'
import Link from 'next/link'
import Image from 'next/image'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        })

        if (error) {
          setError(error.message)
          setLoading(false)
          return
        }

        if (data.user && !data.session) {
          setError('Check your email for confirmation link (or disable email confirmation in Supabase dashboard)')
          setLoading(false)
          return
        }

        setSuccess(true)
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          setError(error.message)
          setLoading(false)
          return
        }

        setSuccess(true)
      }
    } catch (err) {
      console.error('Auth error:', err)
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  // Redirect after success state is set
  if (success) {
    if (typeof window !== 'undefined') {
      window.location.href = '/dashboard'
    }
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Redirecting...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.svg"
              alt="Guild Ads"
              width={32}
              height={37}
              className="dark:hidden"
            />
            <Image
              src="/logo-white.svg"
              alt="Guild Ads"
              width={32}
              height={37}
              className="hidden dark:block"
            />
            <span className="text-2xl font-bold">Guild Ads</span>
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>{mode === 'signin' ? 'Welcome back' : 'Create account'}</CardTitle>
            <CardDescription>
              {mode === 'signin'
                ? 'Sign in to your account'
                : 'Enter your email to create an account'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <EnvelopeSimple className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    disabled={loading}
                    minLength={6}
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading
                  ? (mode === 'signin' ? 'Signing in...' : 'Creating account...')
                  : (mode === 'signin' ? 'Sign in' : 'Create account')}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm">
              {mode === 'signin' ? (
                <p className="text-muted-foreground">
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('signup'); setError(null) }}
                    className="text-primary hover:underline"
                  >
                    Sign up
                  </button>
                </p>
              ) : (
                <p className="text-muted-foreground">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('signin'); setError(null) }}
                    className="text-primary hover:underline"
                  >
                    Sign in
                  </button>
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  )
}

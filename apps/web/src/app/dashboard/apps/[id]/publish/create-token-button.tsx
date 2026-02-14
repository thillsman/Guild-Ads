'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, SpinnerGap, Copy, Check, Warning } from '@phosphor-icons/react'

interface Props {
  appId: string
}

export function CreateTokenButton({ appId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('Default')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newToken, setNewToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const generateToken = () => {
    // Generate a secure random token
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
  }

  const hashToken = async (token: string) => {
    // Hash the token using SHA-256
    const encoder = new TextEncoder()
    const data = encoder.encode(token)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join('')
  }

  const createToken = async () => {
    setLoading(true)
    setError(null)

    try {
      const token = generateToken()
      const tokenHash = await hashToken(token)

      const supabase = createClient()

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('You must be logged in to create a token.')
        return
      }

      const { error: insertError } = await supabase.from('app_tokens').insert({
        app_id: appId,
        user_id: user.id,
        name: name.trim() || 'Default',
        token_hash: tokenHash,
      })

      if (insertError) {
        setError(insertError.message)
        return
      }

      setNewToken(token)
      router.refresh()
    } catch (err) {
      setError('Failed to create token. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const copyToken = async () => {
    if (!newToken) return
    await navigator.clipboard.writeText(newToken)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleClose = () => {
    setOpen(false)
    setNewToken(null)
    setName('Default')
    setError(null)
    setCopied(false)
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => isOpen ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Token
        </Button>
      </DialogTrigger>
      <DialogContent>
        {newToken ? (
          <>
            <DialogHeader>
              <DialogTitle>Token Created</DialogTitle>
              <DialogDescription>
                Copy your token now. You won&apos;t be able to see it again.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-start gap-2">
                <Warning className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Make sure to copy your token now. For security, we only store a hash and cannot show it again.
                </p>
              </div>
              <div className="flex gap-2">
                <Input
                  value={newToken}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button variant="outline" size="icon" onClick={copyToken}>
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Create SDK Token</DialogTitle>
              <DialogDescription>
                Create a new token to authenticate your app with the Guild Ads SDK.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="token-name">Token Name</Label>
                <Input
                  id="token-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Production, Development"
                />
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={createToken} disabled={loading}>
                {loading ? (
                  <>
                    <SpinnerGap className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Token'
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

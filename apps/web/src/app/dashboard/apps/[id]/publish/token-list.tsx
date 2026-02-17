'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Key, Trash } from '@phosphor-icons/react'

interface Token {
  token_id: string
  name: string
  created_at: string
  last_used_at: string | null
  revoked_at: string | null
}

interface Props {
  tokens: Token[]
  appId: string
}

export function TokenList({ tokens, appId }: Props) {
  const router = useRouter()
  const [revoking, setRevoking] = useState<string | null>(null)

  const revokeToken = async (tokenId: string) => {
    setRevoking(tokenId)

    try {
      const supabase = createClient()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('app_tokens')
        .update({ revoked_at: new Date().toISOString() })
        .eq('token_id', tokenId)

      router.refresh()
    } finally {
      setRevoking(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-3">
      {tokens.map((token) => (
        <Card key={token.token_id}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <Key className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">{token.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Created {formatDate(token.created_at)}
                    {token.last_used_at && (
                      <> · Last used {formatDate(token.last_used_at)}</>
                    )}
                  </p>
                </div>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Revoke Token</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to revoke &quot;{token.name}&quot;? Any apps using this token will no longer be able to authenticate.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => revokeToken(token.token_id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Revoke Token
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

import { createClient, getAuthUser } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Key, Copy, Plus } from '@phosphor-icons/react/dist/ssr'
import { CreateTokenButton } from './create-token-button'
import { TokenList } from './token-list'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AppPublishPage({ params }: Props) {
  const { id } = await params
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const supabase = await createClient()

  // Fetch app
  const { data: app, error } = await supabase
    .from('apps')
    .select(`
      app_id,
      name,
      subtitle,
      bundle_identifier,
      icon_url
    `)
    .eq('app_id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !app) {
    notFound()
  }

  // Fetch tokens for this app
  const { data: tokens } = await supabase
    .from('app_tokens')
    .select('token_id, name, created_at, last_used_at, revoked_at')
    .eq('app_id', id)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-start gap-4 mb-8">
          {app.icon_url ? (
            <img
              src={app.icon_url}
              alt={app.name}
              className="w-16 h-16 rounded-xl"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-muted" />
          )}
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{app.name}</h1>
            {app.subtitle && (
              <p className="text-muted-foreground">{app.subtitle}</p>
            )}
            <p className="text-sm text-muted-foreground mt-1">
              {app.bundle_identifier}
            </p>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>SDK Integration</CardTitle>
            <CardDescription>
              Use these tokens to authenticate your app with the Guild Ads SDK
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted rounded-lg p-4 font-mono text-sm">
              <pre className="overflow-x-auto">
{`import GuildAds

// Initialize in your App's init
GuildAds.configure(token: "YOUR_SDK_TOKEN")`}
              </pre>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">SDK Tokens</h2>
          <CreateTokenButton appId={id} />
        </div>

        {tokens && tokens.length > 0 ? (
          <TokenList tokens={tokens} appId={id} />
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" weight="duotone" />
              <h3 className="text-lg font-semibold mb-2">No tokens yet</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Create an SDK token to start displaying sponsor cards in your app.
              </p>
              <CreateTokenButton appId={id} />
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}

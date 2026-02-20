export const dynamic = 'force-dynamic'

import { createAdminClient, getAuthUser } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Key, ChartLine, CheckCircle, XCircle } from '@phosphor-icons/react/dist/ssr'
import { CreateTokenButton } from './create-token-button'
import { TokenList } from './token-list'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AppPublishPage({ params }: Props) {
  const { id } = await params
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const supabase = createAdminClient()

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

  // Fetch recent ad requests for this app
  const { data: recentRequests } = await supabase
    .from('ad_requests')
    .select('request_id, response_type, sdk_version, os_version, locale, clicked, created_at')
    .eq('app_id', id)
    .order('created_at', { ascending: false })
    .limit(50)

  // Calculate stats
  const totalRequests = recentRequests?.length ?? 0
  const filledRequests = recentRequests?.filter(r => r.response_type === 'ad').length ?? 0
  const fillRate = totalRequests > 0 ? Math.round((filledRequests / totalRequests) * 100) : 0
  const clickedRequests = recentRequests?.filter(r => r.clicked).length ?? 0

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

        {/* SDK Activity */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChartLine className="h-5 w-5" />
              SDK Activity
            </CardTitle>
            <CardDescription>
              Recent ad requests from your app (last 50 requests)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {totalRequests > 0 ? (
              <>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{totalRequests}</p>
                    <p className="text-sm text-muted-foreground">Total Requests</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{fillRate}%</p>
                    <p className="text-sm text-muted-foreground">Fill Rate</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{clickedRequests}</p>
                    <p className="text-sm text-muted-foreground">Clicks</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium mb-3">Recent Requests</p>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {recentRequests?.slice(0, 10).map((request) => (
                      <div
                        key={request.request_id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg text-sm"
                      >
                        <div className="flex items-center gap-3">
                          {request.response_type === 'ad' ? (
                            <CheckCircle className="h-4 w-4 text-green-500" weight="fill" />
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground" weight="fill" />
                          )}
                          <span className={request.response_type === 'ad' ? 'text-foreground' : 'text-muted-foreground'}>
                            {request.response_type === 'ad' ? 'Ad served' : 'No fill'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-muted-foreground">
                          {request.sdk_version && (
                            <span className="text-xs">v{request.sdk_version}</span>
                          )}
                          <span className="text-xs">
                            {new Date(request.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ChartLine className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No SDK requests yet</p>
                <p className="text-sm mt-1">Integrate the SDK and make your first request</p>
              </div>
            )}
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

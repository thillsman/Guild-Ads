import { createHash } from 'node:crypto'
import type { Context } from 'hono'
import { supabase } from './supabase.js'

export type JsonObject = Record<string, unknown>

export interface PublisherApp {
  appId: string
  bundleIdentifier: string
}

interface ResolvePublisherAppInput {
  token: string | null
  appIDHint: string | null
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function readJSONBody(c: Context): Promise<JsonObject> {
  try {
    const body = await c.req.json()
    if (typeof body === 'object' && body !== null && !Array.isArray(body)) {
      return body as JsonObject
    }
  } catch {
    // fall through
  }

  return {}
}

export function stringField(body: JsonObject, key: string): string | null {
  const value = body[key]
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function extractToken(c: Context, body: JsonObject): string | null {
  const bodyToken = stringField(body, 'app_token')
  if (bodyToken) {
    return bodyToken
  }

  const headerToken = c.req.header('x-guildads-token')?.trim()
  if (headerToken) {
    return headerToken
  }

  const authorization = c.req.header('authorization')
  if (authorization?.toLowerCase().startsWith('bearer ')) {
    const bearerToken = authorization.slice(7).trim()
    return bearerToken.length > 0 ? bearerToken : null
  }

  return null
}

export function hashValue(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

export async function resolvePublisherApp(input: ResolvePublisherAppInput): Promise<PublisherApp | null> {
  if (input.token) {
    const tokenHash = hashValue(input.token)

    const { data: tokenRecord, error: tokenError } = await supabase
      .from('app_tokens')
      .select('app_id')
      .eq('token_hash', tokenHash)
      .is('revoked_at', null)
      .maybeSingle()

    if (tokenError) {
      throw tokenError
    }

    if (!tokenRecord) {
      return null
    }

    const { error: touchTokenError } = await supabase
      .from('app_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('token_hash', tokenHash)
      .is('revoked_at', null)

    if (touchTokenError) {
      console.error('[api] failed to update app token last_used_at', touchTokenError)
    }

    const { data: appByToken, error: appError } = await supabase
      .from('apps')
      .select('app_id, bundle_identifier')
      .eq('app_id', tokenRecord.app_id)
      .maybeSingle()

    if (appError) {
      throw appError
    }

    if (!appByToken) {
      return null
    }

    return {
      appId: appByToken.app_id,
      bundleIdentifier: appByToken.bundle_identifier,
    }
  }

  if (!input.appIDHint) {
    return null
  }

  const appHint = input.appIDHint

  if (UUID_PATTERN.test(appHint)) {
    const { data: appByID, error: appError } = await supabase
      .from('apps')
      .select('app_id, bundle_identifier')
      .eq('app_id', appHint)
      .maybeSingle()

    if (appError) {
      throw appError
    }

    if (!appByID) {
      return null
    }

    return {
      appId: appByID.app_id,
      bundleIdentifier: appByID.bundle_identifier,
    }
  }

  const { data: appByBundle, error: bundleError } = await supabase
    .from('apps')
    .select('app_id, bundle_identifier')
    .eq('bundle_identifier', appHint)
    .maybeSingle()

  if (bundleError) {
    throw bundleError
  }

  if (!appByBundle) {
    return null
  }

  return {
    appId: appByBundle.app_id,
    bundleIdentifier: appByBundle.bundle_identifier,
  }
}

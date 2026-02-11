import { Hono } from 'hono'
import { supabase } from '../lib/supabase.js'

export const eventsRoutes = new Hono()

/**
 * POST /v1/impression
 * Logs a render event (deduplicated)
 */
eventsRoutes.post('/impression', async (c) => {
  const body = await c.req.json()
  const { ad_id, app_id, placement_id, nonce, ts } = body

  if (!ad_id || !nonce) {
    return c.json({ error: 'ad_id and nonce are required' }, 400)
  }

  // TODO: Implement impression logging
  // 1. Validate nonce signature and expiry
  // 2. Check for duplicate (nonce-based or ad+placement+time bucket)
  // 3. Insert raw event
  // 4. Return success

  return c.json({ ok: true })
})

/**
 * POST /v1/conversions
 * Optional aggregate conversion ping via ephemeral token
 */
eventsRoutes.post('/conversions', async (c) => {
  const body = await c.req.json()
  const { token, event, value_cents } = body

  if (!token || !event) {
    return c.json({ error: 'token and event are required' }, 400)
  }

  // TODO: Implement conversion tracking
  // 1. Validate ephemeral token
  // 2. Record conversion event
  // 3. Return success

  return c.json({ ok: true })
})

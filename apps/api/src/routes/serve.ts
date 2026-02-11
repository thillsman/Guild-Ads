import { Hono } from 'hono'
import { supabase } from '../lib/supabase.js'

export const serveRoutes = new Hono()

/**
 * POST /v1/serve
 * Returns an eligible sponsor card for a given placement
 */
serveRoutes.post('/serve', async (c) => {
  const body = await c.req.json()
  const { app_id, placement_id, sdk_version, os, os_major, locale, theme } = body

  if (!app_id || !placement_id) {
    return c.json({ error: 'app_id and placement_id are required' }, 400)
  }

  // TODO: Implement ad selection logic
  // 1. Look up placement and its bundle memberships
  // 2. Find active campaigns for those bundles in current time window
  // 3. Apply policy filters (exclusions, creative approval status)
  // 4. Select campaign (round-robin or weighted for v1)
  // 5. Generate signed nonce for event validation
  // 6. Return creative + reporting URLs

  // Placeholder: return 204 No Content (no eligible ad)
  return c.body(null, 204)
})

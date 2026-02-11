import { Hono } from 'hono'
import { supabase } from '../lib/supabase.js'

export const redirectRoutes = new Hono()

/**
 * GET /r/:ad_id
 * Click redirect - logs click and redirects to destination
 */
redirectRoutes.get('/r/:ad_id', async (c) => {
  const adId = c.req.param('ad_id')
  const placementId = c.req.query('p')
  const nonce = c.req.query('n')

  if (!adId) {
    return c.json({ error: 'Invalid ad_id' }, 400)
  }

  // TODO: Implement click tracking and redirect
  // 1. Look up ad/campaign by ad_id
  // 2. Validate nonce if provided
  // 3. Record click event (with rate limiting and burst detection)
  // 4. Optionally mint ephemeral token for conversion tracking
  // 5. Redirect to destination URL

  // Placeholder: return 404 until implemented
  return c.json({ error: 'Ad not found' }, 404)
})

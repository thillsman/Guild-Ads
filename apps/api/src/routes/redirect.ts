import { Hono } from 'hono'
import { HARD_CODED_PURCHASE_ID, fetchHardcodedAd } from '../lib/hardcoded-ad.js'

export const redirectRoutes = new Hono()

/**
 * GET /r/:ad_id
 * Click redirect - logs click and redirects to destination
 */
redirectRoutes.get('/r/:ad_id', async (c) => {
  const adId = c.req.param('ad_id')

  if (!adId) {
    return c.json({ error: 'Invalid ad_id' }, 400)
  }

  if (adId !== HARD_CODED_PURCHASE_ID) {
    return c.json({ error: 'Ad not found' }, 404)
  }

  try {
    const hardcodedAd = await fetchHardcodedAd()
    if (!hardcodedAd) {
      return c.json({ error: 'Ad not found' }, 404)
    }

    return c.redirect(hardcodedAd.destinationURL, 302)
  } catch (error) {
    console.error('[api] /r/:ad_id failed', error)
    return c.json({ error: 'Redirect failed' }, 500)
  }
})

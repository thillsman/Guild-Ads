import { Hono } from 'hono'
import { logAdRequest } from '../lib/ad-requests.js'
import { buildServeResponse, fetchHardcodedAd } from '../lib/hardcoded-ad.js'
import { extractToken, readJSONBody, resolvePublisherApp, stringField } from '../lib/sdk.js'

export const serveRoutes = new Hono()

/**
 * POST /v1/serve
 * Returns an eligible sponsor card for a given placement
 */
serveRoutes.post('/serve', async (c) => {
  const body = await readJSONBody(c)
  const appIDHint = stringField(body, 'app_id')
  const placementID = stringField(body, 'placement_id')
  const sdkVersion = stringField(body, 'sdk_version')
  const locale = stringField(body, 'locale')
  const osVersion = stringField(body, 'os_version')
  const userID = stringField(body, 'user_id')
  const token = extractToken(c, body)

  if (!placementID) {
    return c.json({ error: 'placement_id is required' }, 400)
  }

  try {
    const publisherApp = await resolvePublisherApp({ token, appIDHint })
    if (!publisherApp) {
      return c.json({ error: 'Invalid app token or app_id' }, 401)
    }

    const hardcodedAd = await fetchHardcodedAd()
    if (!hardcodedAd) {
      await logAdRequest({
        appID: publisherApp.appId,
        campaignID: null,
        responseType: 'no_fill',
        sdkVersion,
        osVersion,
        locale,
        deviceIdentifier: userID,
      })
      return c.body(null, 204)
    }

    await logAdRequest({
      appID: publisherApp.appId,
      campaignID: hardcodedAd.campaignID,
      responseType: 'ad',
      sdkVersion,
      osVersion,
      locale,
      deviceIdentifier: userID,
    })

    const origin = new URL(c.req.url).origin
    const ad = buildServeResponse({
      ad: hardcodedAd,
      origin,
      placementID,
    })

    return c.json(ad)
  } catch (error) {
    console.error('[api] /v1/serve failed', error)
    return c.json({ error: 'Failed to serve ad' }, 500)
  }
})

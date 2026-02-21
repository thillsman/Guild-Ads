import { Hono } from 'hono'
import { logAdRequest, markLatestRequestClicked } from '../lib/ad-requests.js'
import { buildServeResponse, fetchHardcodedAd } from '../lib/hardcoded-ad.js'
import { extractToken, readJSONBody, resolvePublisherApp, resolveRequestOrigin, stringField } from '../lib/sdk.js'

export const eventsRoutes = new Hono()

eventsRoutes.post('/events/launch', async (c) => {
  const body = await readJSONBody(c)
  const token = extractToken(c, body)
  const appIDHint = stringField(body, 'app_id')
  const sdkVersion = stringField(body, 'sdk_version')
  const locale = stringField(body, 'locale')
  const osVersion = stringField(body, 'os_version')
  const userID = stringField(body, 'user_id')

  try {
    const publisherApp = await resolvePublisherApp({ token, appIDHint })
    if (!publisherApp) {
      return c.json({ error: 'Invalid app token or app_id' }, 401)
    }

    await logAdRequest({
      appID: publisherApp.appId,
      campaignID: null,
      placementID: 'default',
      responseType: 'no_fill',
      sdkVersion,
      osVersion,
      locale,
      deviceIdentifier: userID,
    })

    return c.json({ ok: true, ads: {} })
  } catch (error) {
    console.error('[api] /v1/events/launch failed', error)
    return c.json({ error: 'Failed to process launch event' }, 500)
  }
})

/**
 * POST /v1/impression
 * Logs a render event (deduplicated)
 */
eventsRoutes.post('/impression', async (c) => {
  const body = await readJSONBody(c)
  const token = extractToken(c, body)
  const appIDHint = stringField(body, 'app_id')
  const adID = stringField(body, 'ad_id')
  const placementID = stringField(body, 'placement_id') ?? 'default'
  const sdkVersion = stringField(body, 'sdk_version')
  const locale = stringField(body, 'locale')
  const osVersion = stringField(body, 'os_version')
  const userID = stringField(body, 'user_id')

  if (!adID) {
    return c.json({ error: 'ad_id is required' }, 400)
  }

  try {
    const publisherApp = await resolvePublisherApp({ token, appIDHint })
    if (!publisherApp) {
      return c.json({ error: 'Invalid app token or app_id' }, 401)
    }

    const hardcodedAd = await fetchHardcodedAd()
    if (!hardcodedAd || hardcodedAd.adID !== adID) {
      return c.json({ error: 'Unknown ad_id' }, 404)
    }

    await logAdRequest({
      appID: publisherApp.appId,
      campaignID: hardcodedAd.campaignID,
      placementID,
      responseType: 'ad',
      sdkVersion,
      osVersion,
      locale,
      deviceIdentifier: userID,
    })

    const origin = resolveRequestOrigin(c)
    const ad = buildServeResponse({
      ad: hardcodedAd,
      origin,
      placementID,
    })

    return c.json({ ok: true, ad })
  } catch (error) {
    console.error('[api] /v1/impression failed', error)
    return c.json({ error: 'Failed to log impression' }, 500)
  }
})

eventsRoutes.post('/events/click', async (c) => {
  const body = await readJSONBody(c)
  const token = extractToken(c, body)
  const appIDHint = stringField(body, 'app_id')
  const adID = stringField(body, 'ad_id')
  const placementID = stringField(body, 'placement_id')

  if (!adID) {
    return c.json({ error: 'ad_id is required' }, 400)
  }

  try {
    const publisherApp = await resolvePublisherApp({ token, appIDHint })
    if (!publisherApp) {
      return c.json({ error: 'Invalid app token or app_id' }, 401)
    }

    const hardcodedAd = await fetchHardcodedAd()
    if (!hardcodedAd || hardcodedAd.adID !== adID) {
      return c.json({ error: 'Unknown ad_id' }, 404)
    }

    await markLatestRequestClicked({
      appID: publisherApp.appId,
      campaignID: hardcodedAd.campaignID,
      placementID,
    })

    return c.json({ ok: true })
  } catch (error) {
    console.error('[api] /v1/events/click failed', error)
    return c.json({ error: 'Failed to log click' }, 500)
  }
})

/**
 * POST /v1/conversions
 * Optional aggregate conversion ping via ephemeral token
 */
eventsRoutes.post('/conversions', async (c) => {
  const body = await readJSONBody(c)
  const token = stringField(body, 'token')
  const event = stringField(body, 'event')

  if (!token || !event) {
    return c.json({ error: 'token and event are required' }, 400)
  }

  // TODO: Implement conversion tracking
  // 1. Validate ephemeral token
  // 2. Record conversion event
  // 3. Return success

  return c.json({ ok: true })
})

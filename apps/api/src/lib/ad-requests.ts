import { hashValue } from './sdk.js'
import { supabase } from './supabase.js'

type ResponseType = 'ad' | 'no_fill' | 'error'

interface LogAdRequestInput {
  appID: string
  campaignID: string | null
  placementID: string | null
  responseType: ResponseType
  sdkVersion: string | null
  osVersion: string | null
  locale: string | null
  deviceIdentifier: string | null
}

interface MarkClickedInput {
  appID: string
  campaignID: string
  placementID?: string | null
}

export async function logAdRequest(input: LogAdRequestInput): Promise<void> {
  const deviceHash = input.deviceIdentifier ? hashValue(input.deviceIdentifier) : null

  const { error } = await supabase.from('ad_requests').insert({
    app_id: input.appID,
    campaign_id: input.campaignID,
    placement_id: input.placementID ?? 'default',
    response_type: input.responseType,
    sdk_version: input.sdkVersion,
    os_version: input.osVersion,
    locale: input.locale,
    device_id_hash: deviceHash,
  })

  if (error) {
    console.error('[api] failed to log ad request', error)
  }
}

export async function markLatestRequestClicked(input: MarkClickedInput): Promise<void> {
  let query = supabase
    .from('ad_requests')
    .select('request_id')
    .eq('app_id', input.appID)
    .eq('campaign_id', input.campaignID)
    .eq('clicked', false)

  if (input.placementID) {
    query = query.eq('placement_id', input.placementID)
  }

  const { data: requestRow, error: requestError } = await query
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (requestError) {
    console.error('[api] failed to read latest ad request for click', requestError)
    return
  }

  if (!requestRow) {
    return
  }

  const { error: updateError } = await supabase
    .from('ad_requests')
    .update({ clicked: true, clicked_at: new Date().toISOString() })
    .eq('request_id', requestRow.request_id)

  if (updateError) {
    console.error('[api] failed to mark click on ad request', updateError)
  }
}

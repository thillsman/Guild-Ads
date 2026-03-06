import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@guild-ads/shared'
import { hashValue } from './common'

type ServeAttemptEndpoint = 'serve' | 'launch'
type ServeAttemptResponseType = 'ad' | 'no_fill' | 'error'

interface LogServeAttemptInput {
  appID: string
  campaignID: string | null
  slotPurchaseID?: string | null
  placementID: string | null
  endpoint: ServeAttemptEndpoint
  responseType: ServeAttemptResponseType
  decisionReason: string
  sdkVersion: string | null
  osVersion: string | null
  locale: string | null
  deviceIdentifier: string | null
}

export async function logServeAttempts(
  supabase: SupabaseClient<Database>,
  attempts: LogServeAttemptInput[]
): Promise<void> {
  if (attempts.length === 0) {
    return
  }

  const rows = attempts.map((attempt) => ({
    app_id: attempt.appID,
    campaign_id: attempt.campaignID,
    slot_purchase_id: attempt.slotPurchaseID ?? null,
    placement_id: attempt.placementID ?? 'default',
    endpoint: attempt.endpoint,
    response_type: attempt.responseType,
    decision_reason: attempt.decisionReason,
    sdk_version: attempt.sdkVersion,
    os_version: attempt.osVersion,
    locale: attempt.locale,
    device_id_hash: attempt.deviceIdentifier ? hashValue(attempt.deviceIdentifier) : null,
  }))

  const { error } = await (supabase as any).from('serve_attempts').insert(rows)

  if (error) {
    console.error('[sdk-api] failed to log serve attempts', error)
  }
}

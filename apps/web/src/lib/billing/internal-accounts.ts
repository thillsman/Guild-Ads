import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@guild-ads/shared'

export interface InternalAccountPolicy {
  active: boolean
  canBypassCheckout: boolean
  noFillExempt: boolean
  canManageInternal: boolean
}

const DEFAULT_POLICY: InternalAccountPolicy = {
  active: false,
  canBypassCheckout: false,
  noFillExempt: false,
  canManageInternal: false,
}

export async function getInternalAccountPolicy(
  supabase: SupabaseClient<Database>,
  userID: string | null | undefined
): Promise<InternalAccountPolicy> {
  if (!userID) {
    return DEFAULT_POLICY
  }

  const { data, error } = await (supabase as any)
    .from('internal_account_policies')
    .select('active, can_bypass_checkout, no_fill_exempt, can_manage_internal')
    .eq('user_id', userID)
    .maybeSingle()

  if (error || !data || data.active !== true) {
    return DEFAULT_POLICY
  }

  return {
    active: true,
    canBypassCheckout: data.can_bypass_checkout === true,
    noFillExempt: data.no_fill_exempt === true,
    canManageInternal: data.can_manage_internal === true,
  }
}


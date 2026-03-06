import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@guild-ads/shared'
import { isHardcodedAdminUser } from '@/lib/admin/access'

export async function canManageInternalAccounts(
  supabase: SupabaseClient<Database>,
  userID: string
): Promise<boolean> {
  if (isHardcodedAdminUser(userID)) {
    return true
  }

  const { data, error } = await (supabase as any)
    .from('internal_account_policies')
    .select('active, can_manage_internal')
    .eq('user_id', userID)
    .maybeSingle()

  if (error || !data) {
    return false
  }

  return data.active === true && data.can_manage_internal === true
}

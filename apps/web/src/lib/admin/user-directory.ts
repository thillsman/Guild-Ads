import type { User } from '@supabase/supabase-js'
import type { Database } from '@guild-ads/shared'
import type { SupabaseClient } from '@supabase/supabase-js'

interface AppRow {
  app_id: string
  user_id: string | null
  name: string
  bundle_identifier: string
  icon_url: string | null
  created_at: string
}

interface CampaignRow {
  campaign_id: string
  app_id: string | null
}

interface SlotPurchaseRow {
  campaign_id: string | null
  price_cents: number
  refunded_at: string | null
  status: string
}

interface PublisherWeeklyEarningsRow {
  converted_cents: number
  earning_id: string
  gross_earnings_cents: number
  hold_until: string
  paid_at: string | null
  payout_status: string
  publisher_app_id: string
  user_id: string
  week_start: string
}

interface PublisherConnectAccountRow {
  charges_enabled: boolean
  details_submitted: boolean
  payouts_enabled: boolean
  stripe_account_id: string
  user_id: string
}

export interface AdminUserDirectoryApp {
  advertiserSpendCents: number
  appId: string
  bundleIdentifier: string
  iconUrl: string | null
  name: string
  publisherEarningsCents: number
}

export interface AdminUserDirectoryPayout {
  appId: string
  appName: string
  convertedCents: number
  earningId: string
  grossEarningsCents: number
  holdUntil: string
  netPayoutCents: number
  paidAt: string | null
  payoutStatus: string
  weekStart: string
}

export interface AdminUserDirectoryUser {
  apps: AdminUserDirectoryApp[]
  connectAccount: {
    chargesEnabled: boolean
    detailsSubmitted: boolean
    payoutsEnabled: boolean
    stripeAccountId: string
  } | null
  createdAt: string | null
  email: string
  lastSignInAt: string | null
  payoutRows: AdminUserDirectoryPayout[]
  totals: {
    advertiserSpendCents: number
    appCount: number
    paidOutCents: number
    publisherEarningsCents: number
    unpaidPayoutCents: number
  }
  userId: string
}

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

async function listAllAuthUsers(supabase: SupabaseClient<Database>): Promise<User[]> {
  const users: User[] = []
  const perPage = 200
  let page = 1

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    })

    if (error) {
      throw error
    }

    const currentPageUsers = data.users ?? []
    users.push(...currentPageUsers)

    if (currentPageUsers.length < perPage) {
      break
    }

    page += 1
  }

  return users
}

export async function getAdminUserDirectory(
  supabase: SupabaseClient<Database>
): Promise<AdminUserDirectoryUser[]> {
  const nowISO = new Date().toISOString()
  const [authUsers, appsResult, campaignsResult, purchasesResult, earningsResult, connectAccountsResult] = await Promise.all([
    listAllAuthUsers(supabase),
    supabase
      .from('apps')
      .select('app_id, user_id, name, bundle_identifier, icon_url, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('campaigns')
      .select('campaign_id, app_id'),
    (supabase as any)
      .from('slot_purchases')
      .select('campaign_id, price_cents, refunded_at, status')
      .in('status', ['confirmed', 'completed']),
    (supabase as any)
      .from('publisher_weekly_earnings')
      .select('earning_id, week_start, publisher_app_id, user_id, gross_earnings_cents, converted_cents, payout_status, hold_until, paid_at')
      .order('week_start', { ascending: false }),
    (supabase as any)
      .from('publisher_connect_accounts')
      .select('user_id, stripe_account_id, payouts_enabled, details_submitted, charges_enabled'),
  ])

  if (appsResult.error) {
    throw appsResult.error
  }

  if (campaignsResult.error) {
    throw campaignsResult.error
  }

  if (purchasesResult.error) {
    throw purchasesResult.error
  }

  if (earningsResult.error) {
    throw earningsResult.error
  }

  if (connectAccountsResult.error) {
    throw connectAccountsResult.error
  }

  const apps = (appsResult.data ?? []) as AppRow[]
  const campaigns = (campaignsResult.data ?? []) as CampaignRow[]
  const purchases = (purchasesResult.data ?? []) as SlotPurchaseRow[]
  const earnings = (earningsResult.data ?? []) as PublisherWeeklyEarningsRow[]
  const connectAccounts = (connectAccountsResult.data ?? []) as PublisherConnectAccountRow[]

  const appById = new Map(apps.map((app) => [app.app_id, app]))
  const campaignToAppId = new Map(
    campaigns
      .filter((campaign): campaign is CampaignRow & { app_id: string } => typeof campaign.app_id === 'string')
      .map((campaign) => [campaign.campaign_id, campaign.app_id])
  )
  const advertiserSpendByApp = new Map<string, number>()
  const publisherEarningsByApp = new Map<string, number>()
  const payoutRowsByUser = new Map<string, AdminUserDirectoryPayout[]>()
  const connectAccountByUser = new Map(connectAccounts.map((account) => [account.user_id, account]))

  for (const purchase of purchases) {
    if (purchase.refunded_at) {
      continue
    }

    const appId = purchase.campaign_id ? campaignToAppId.get(purchase.campaign_id) : null
    if (!appId) {
      continue
    }

    advertiserSpendByApp.set(appId, (advertiserSpendByApp.get(appId) ?? 0) + toNumber(purchase.price_cents))
  }

  for (const earning of earnings) {
    const gross = toNumber(earning.gross_earnings_cents)
    const converted = toNumber(earning.converted_cents)
    const net = Math.max(0, gross - converted)
    publisherEarningsByApp.set(
      earning.publisher_app_id,
      (publisherEarningsByApp.get(earning.publisher_app_id) ?? 0) + gross
    )

    const app = appById.get(earning.publisher_app_id)
    const rows = payoutRowsByUser.get(earning.user_id) ?? []
    rows.push({
      appId: earning.publisher_app_id,
      appName: app?.name ?? 'Unknown App',
      convertedCents: converted,
      earningId: earning.earning_id,
      grossEarningsCents: gross,
      holdUntil: earning.hold_until,
      netPayoutCents: net,
      paidAt: earning.paid_at,
      payoutStatus: earning.payout_status,
      weekStart: earning.week_start,
    })
    payoutRowsByUser.set(earning.user_id, rows)
  }

  const userSummaries = authUsers.map((user) => {
    const userApps = apps
      .filter((app) => app.user_id === user.id)
      .map((app) => ({
        advertiserSpendCents: advertiserSpendByApp.get(app.app_id) ?? 0,
        appId: app.app_id,
        bundleIdentifier: app.bundle_identifier,
        iconUrl: app.icon_url,
        name: app.name,
        publisherEarningsCents: publisherEarningsByApp.get(app.app_id) ?? 0,
      }))

    const payoutRows = (payoutRowsByUser.get(user.id) ?? []).sort((left, right) => {
      if (left.weekStart === right.weekStart) {
        return left.appName.localeCompare(right.appName)
      }

      return left.weekStart < right.weekStart ? 1 : -1
    })

    const totals = payoutRows.reduce((accumulator, row) => {
      accumulator.publisherEarningsCents += row.grossEarningsCents

      if (row.payoutStatus === 'paid') {
        accumulator.paidOutCents += row.netPayoutCents
      } else {
        accumulator.unpaidPayoutCents += row.netPayoutCents
      }

      return accumulator
    }, {
      advertiserSpendCents: userApps.reduce((sum, app) => sum + app.advertiserSpendCents, 0),
      appCount: userApps.length,
      paidOutCents: 0,
      publisherEarningsCents: 0,
      unpaidPayoutCents: 0,
    })

    const connectAccount = connectAccountByUser.get(user.id)

    return {
      apps: userApps,
      connectAccount: connectAccount
        ? {
            chargesEnabled: connectAccount.charges_enabled === true,
            detailsSubmitted: connectAccount.details_submitted === true,
            payoutsEnabled: connectAccount.payouts_enabled === true,
            stripeAccountId: connectAccount.stripe_account_id,
          }
        : null,
      createdAt: user.created_at ?? null,
      email: user.email ?? 'No email',
      lastSignInAt: user.last_sign_in_at ?? null,
      payoutRows,
      totals,
      userId: user.id,
    } satisfies AdminUserDirectoryUser
  })

  return userSummaries.sort((left, right) => {
    if (left.totals.appCount !== right.totals.appCount) {
      return right.totals.appCount - left.totals.appCount
    }

    const leftActivity = left.totals.advertiserSpendCents + left.totals.publisherEarningsCents
    const rightActivity = right.totals.advertiserSpendCents + right.totals.publisherEarningsCents
    if (leftActivity !== rightActivity) {
      return rightActivity - leftActivity
    }

    if (left.lastSignInAt && right.lastSignInAt && left.lastSignInAt !== right.lastSignInAt) {
      return left.lastSignInAt < right.lastSignInAt ? 1 : -1
    }

    if (left.createdAt && right.createdAt && left.createdAt !== right.createdAt) {
      return left.createdAt < right.createdAt ? 1 : -1
    }

    return left.email.localeCompare(right.email)
  }).map((user) => ({
    ...user,
    payoutRows: user.payoutRows.map((row) => ({
      ...row,
      payoutStatus:
        row.payoutStatus === 'accrued' && row.holdUntil <= nowISO
          ? 'eligible'
          : row.payoutStatus,
    })),
  }))
}

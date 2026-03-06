export const HARD_CODED_ADMIN_USER_ID = 'd6ed936c-953c-484a-818f-d63aba9c3786'

export function isHardcodedAdminUser(userID: string | null | undefined): boolean {
  return userID === HARD_CODED_ADMIN_USER_ID
}

export function formatDateUTC(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function getNextSundayDateUTC(now: Date = new Date()): Date {
  const dayOfWeek = now.getUTCDay()
  const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek
  const nextSunday = new Date(now)
  nextSunday.setUTCDate(now.getUTCDate() + daysUntilSunday)
  nextSunday.setUTCHours(0, 0, 0, 0)
  return nextSunday
}

export function getNextSundayUTC(now: Date = new Date()): string {
  return formatDateUTC(getNextSundayDateUTC(now))
}

export function isNextSundayUTC(weekStart: string, now: Date = new Date()): boolean {
  return weekStart === getNextSundayUTC(now)
}


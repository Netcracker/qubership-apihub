import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone.js'
import utc from 'dayjs/plugin/utc.js'

const DEFAULT_DATE_FORMAT = 'DD MMM, YYYY'

dayjs.extend(utc)
dayjs.extend(timezone)

/**
 * Formats a date to the UI format: 'DD MMM, YYYY' (e.g., "15 Jan, 2025")
 * Matches the implementation in qubership-apihub-ui/packages/shared/src/utils/date.ts
 * @param date - Date object or ISO date string
 * @returns Formatted date string in the format 'DD MMM, YYYY'
 */
export function formatDateToUI(date: Date | string): string {
  const userTimeZone = dayjs.tz.guess()
  return dayjs(date).utc().tz(userTimeZone).format(DEFAULT_DATE_FORMAT)
}

/**
 * Formats a duration in milliseconds as `mm:ss (mm:ss)`.
 * Values below 1 second are rounded up to 1 second; zero or negative values become `00:00`.
 */
export function millisecondsToMmSs(durationMs: number): string {
  if (durationMs <= 0) {
    return '00:00 (mm:ss)'
  }
  if (durationMs < 1000) {
    return '00:01 (mm:ss)'
  }
  const totalSeconds = Math.ceil(durationMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} (mm:ss)`
}

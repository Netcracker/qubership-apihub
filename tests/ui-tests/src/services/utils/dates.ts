import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone.js'
import utc from 'dayjs/plugin/utc.js'

const DEFAULT_DATE_FORMAT = 'DD MMM, YYYY'

dayjs.extend(utc)
dayjs.extend(timezone)

const userTimeZone = dayjs.tz.guess()

/**
 * Formats a date to the UI format: 'DD MMM, YYYY' (e.g., "15 Jan, 2025")
 * Matches the implementation in qubership-apihub-ui/packages/shared/src/utils/date.ts
 * @param date - Date object or ISO date string
 * @returns Formatted date string in the format 'DD MMM, YYYY'
 */
export function formatDateToUI(date: Date | string): string {
  return dayjs(date).utc().tz(userTimeZone).format(DEFAULT_DATE_FORMAT)
}

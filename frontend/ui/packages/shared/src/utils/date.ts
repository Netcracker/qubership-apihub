import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

const DEFAULT_DATE_FORMAT = 'DD MMM, YYYY'

dayjs.extend(utc)
dayjs.extend(timezone)

const userTimeZone = dayjs.tz.guess()

export function toTimezone(dateTo: string | Date): Date {
  return dayjs(dateTo).utc().tz(userTimeZone).toDate()
}

export function toDateFormat(dateTo?: string | Date, format?: string): string {
  return dateTo ? dayjs(dateTo).format(format ?? DEFAULT_DATE_FORMAT) : ''
}

export function toStartOfDay(date: Date): Date {
  if (!date) {
    return date
  }
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function toEndOfDay(date: Date): Date {
  if (!date) {
    return date
  }
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

export function toISODateRange(start: Date, end: Date): [string, string] {
  return [
    toStartOfDay(start)?.toISOString(),
    toEndOfDay(end)?.toISOString(),
  ]
}

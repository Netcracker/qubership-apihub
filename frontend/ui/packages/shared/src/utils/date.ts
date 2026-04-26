/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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

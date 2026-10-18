import { expect, test } from '@playwright/test'
import { formatDateToUI, millisecondsToMmSs } from './dates'

test.describe('formatDateToUI unit tests', () => {
  test.beforeAll(() => {
    process.env.TZ = 'UTC'
  })

  test('formats dates to DD MMM, YYYY', () => {
    expect.soft(formatDateToUI('2025-01-15T10:30:00.000Z')).toBe('15 Jan, 2025')
    expect.soft(formatDateToUI(new Date('2025-06-20T00:00:00.000Z'))).toBe('20 Jun, 2025')
    expect.soft(formatDateToUI('2024-12-31T12:00:00.000Z')).toBe('31 Dec, 2024')
  })
})

test.describe('millisecondsToMmSs unit tests', () => {
  test('formats milliseconds as mm:ss', () => {
    expect.soft(millisecondsToMmSs(125_000)).toBe('02:05 (mm:ss)')
    expect.soft(millisecondsToMmSs(0)).toBe('00:00 (mm:ss)')
    expect.soft(millisecondsToMmSs(500)).toBe('00:01 (mm:ss)')
  })
})

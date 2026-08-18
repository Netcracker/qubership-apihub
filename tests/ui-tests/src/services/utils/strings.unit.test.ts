import { expect, test } from '@playwright/test'
import { nthPostfix } from './strings'

test.describe('nthPostfix unit tests', () => {
  const ST = 'st'
  const ND = 'nd'
  const RD = 'rd'
  const TH = 'th'

  test('should correctly generate ordinal suffixes', () => {
    // Basic cases: 1st, 2nd, 3rd
    expect.soft(nthPostfix(1)).toBe(ST)
    expect.soft(nthPostfix(2)).toBe(ND)
    expect.soft(nthPostfix(3)).toBe(RD)

    // Default case
    expect.soft(nthPostfix(4)).toBe(TH)

    // Special exceptions: 11th, 12th, 13th (not 11st, 12nd, 13rd)
    expect.soft(nthPostfix(11)).toBe(TH)
    expect.soft(nthPostfix(12)).toBe(TH)
    expect.soft(nthPostfix(13)).toBe(TH)
    expect.soft(nthPostfix(111)).toBe(TH)
    expect.soft(nthPostfix(112)).toBe(TH)
    expect.soft(nthPostfix(113)).toBe(TH)
    expect.soft(nthPostfix(1011)).toBe(TH)
    expect.soft(nthPostfix(1012)).toBe(TH)
    expect.soft(nthPostfix(1013)).toBe(TH)
    expect.soft(nthPostfix(1111)).toBe(TH)
    expect.soft(nthPostfix(1112)).toBe(TH)
    expect.soft(nthPostfix(1113)).toBe(TH)

    // Back to normal pattern after exceptions
    expect.soft(nthPostfix(21)).toBe(ST)
    expect.soft(nthPostfix(102)).toBe(ND)
    expect.soft(nthPostfix(1003)).toBe(RD)

    // Edge case
    expect.soft(nthPostfix(0)).toBe(TH)
  })
})

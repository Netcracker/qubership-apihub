import { ADDRESS_VALUE_FONT_SIZE, AddressValueFit } from "../src/utils/common/address-value-fit"

const { base, min } = ADDRESS_VALUE_FONT_SIZE

describe('AddressValueFit', () => {
  it('keeps the base size when the value fits', () => {
    expect(AddressValueFit.fitSize({ natural: 300, available: 400 })).toBe(base)
    expect(AddressValueFit.fitSize({ natural: 400, available: 400 })).toBe(base)
  })

  it('shrinks the size in proportion to the overflow', () => {
    expect(AddressValueFit.fitSize({ natural: 900, available: 600 })).toBe(12)
    expect(AddressValueFit.fitSize({ natural: 720, available: 600 })).toBe(15)
  })

  it('rounds the fitted size down so the value never overflows', () => {
    const size = AddressValueFit.fitSize({ natural: 700, available: 600 })
    expect(size).toBeLessThanOrEqual(base * 600 / 700)
    expect(size).toBeGreaterThan(base * 600 / 700 - 0.25)
  })

  it('never goes below the minimum size', () => {
    expect(AddressValueFit.fitSize({ natural: 3000, available: 600 })).toBe(min)
    expect(AddressValueFit.fitSize({ natural: 3000, available: 0 })).toBe(min)
  })

  it('shares the smallest fitted size between the sides', () => {
    expect(AddressValueFit.sharedSize([{ natural: 300, available: 600 }, { natural: 720, available: 600 }])).toBe(15)
    expect(AddressValueFit.sharedSize([undefined, { natural: 300, available: 600 }])).toBe(base)
    expect(AddressValueFit.sharedSize([])).toBe(base)
  })

  it('wraps only a value that overflows at the given size', () => {
    expect(AddressValueFit.wraps({ natural: 3000, available: 600 }, min)).toBe(true)
    expect(AddressValueFit.wraps({ natural: 720, available: 600 }, 15)).toBe(false)
    expect(AddressValueFit.wraps({ natural: 300, available: 600 }, base)).toBe(false)
    expect(AddressValueFit.wraps(undefined, base)).toBe(false)
  })
})

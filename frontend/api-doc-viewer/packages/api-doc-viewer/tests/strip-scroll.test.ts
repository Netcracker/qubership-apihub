import { resolveStripScrollState, resolveStripScrollTarget } from "../src/utils/common/strip-scroll"

const items = [
  { left: 0, width: 100 },
  { left: 108, width: 100 },
  { left: 216, width: 100 },
  { left: 324, width: 100 },
]

describe("strip-scroll", () => {
  it("disables the left arrow at the left edge and the right one at the right edge", () => {
    expect(resolveStripScrollState(0, 250, 424)).toEqual({ canScrollLeft: false, canScrollRight: true })
    expect(resolveStripScrollState(174, 250, 424)).toEqual({ canScrollLeft: true, canScrollRight: false })
    expect(resolveStripScrollState(0, 500, 424)).toEqual({ canScrollLeft: false, canScrollRight: false })
  })

  it("scrolls right by exactly one option: the first cut option is aligned to the right edge", () => {
    expect(resolveStripScrollTarget(items, 0, 250, "right")).toBe(66)
    expect(resolveStripScrollTarget(items, 66, 250, "right")).toBe(174)
    expect(resolveStripScrollTarget(items, 174, 250, "right")).toBeUndefined()
  })

  it("scrolls left by exactly one option: the last cut option is aligned to the left edge", () => {
    expect(resolveStripScrollTarget(items, 174, 250, "left")).toBe(108)
    expect(resolveStripScrollTarget(items, 108, 250, "left")).toBe(0)
    expect(resolveStripScrollTarget(items, 0, 250, "left")).toBeUndefined()
  })

  it("aligns an option wider than the strip to its start, then scrolls through the rest of it", () => {
    expect(resolveStripScrollTarget([{ left: 0, width: 50 }, { left: 58, width: 400 }], 0, 200, "right")).toBe(58)
    expect(resolveStripScrollTarget([{ left: 0, width: 50 }, { left: 58, width: 400 }], 58, 200, "right")).toBe(258)
  })
})

describe("strip-scroll at the first / last option", () => {
  // 424px of options plus 9px of room after the last one: the strip scrolls up to 183.
  it("scrolls to the very end to reveal the last option, then the right arrow has nothing left", () => {
    expect(resolveStripScrollTarget(items, 66, 250, "right", 0, 183)).toBe(183)
    expect(resolveStripScrollTarget(items, 183, 250, "right", 0, 183)).toBeUndefined()
  })

  it("scrolls to the end when only the room after the last option is hidden", () => {
    expect(resolveStripScrollTarget(items, 174, 250, "right", 0, 183)).toBe(183)
  })

  it("scrolls to the very start to reveal the first option, also when only the room before it is hidden", () => {
    expect(resolveStripScrollTarget(items, 50, 250, "left")).toBe(0)
    expect(resolveStripScrollTarget([{ left: 6, width: 100 }, ...items.slice(1)], 3, 250, "left", 6)).toBe(0)
  })
})

describe("strip-scroll with an edge inset", () => {
  it("keeps room for option markers at both edges", () => {
    expect(resolveStripScrollTarget(items, 0, 250, "right", 6)).toBe(72)
    expect(resolveStripScrollTarget(items, 180, 250, "left", 6)).toBe(102)
  })
})

import { getVisibleCount } from './useIncrementalList'

describe('getVisibleCount', () => {
  it('starts a new list with the first step', () => {
    expect(getVisibleCount({ itemCount: 250, shownCount: undefined, step: 100, keepVisibleIndex: -1 })).toBe(100)
  })

  it('keeps the items shown for the same list and never exceeds the list', () => {
    expect(getVisibleCount({ itemCount: 250, shownCount: 200, step: 100, keepVisibleIndex: -1 })).toBe(200)
    expect(getVisibleCount({ itemCount: 250, shownCount: 300, step: 100, keepVisibleIndex: -1 })).toBe(250)
  })

  it('grows in whole steps to include the kept index', () => {
    expect(getVisibleCount({ itemCount: 791, shownCount: 100, step: 100, keepVisibleIndex: 500 })).toBe(600)
    expect(getVisibleCount({ itemCount: 791, shownCount: undefined, step: 100, keepVisibleIndex: 99 })).toBe(100)
  })
})

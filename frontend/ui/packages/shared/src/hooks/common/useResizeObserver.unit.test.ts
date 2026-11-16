import { containerWidthOf } from './useResizeObserver'

describe('containerWidthOf', () => {
  it('rounds a fractional content width down, so the columns sized from it fit the container', () => {
    expect(containerWidthOf({ contentRect: { width: 620.71 } })).toBe(620)
  })

  it('keeps a whole content width', () => {
    expect(containerWidthOf({ contentRect: { width: 800 } })).toBe(800)
  })
})

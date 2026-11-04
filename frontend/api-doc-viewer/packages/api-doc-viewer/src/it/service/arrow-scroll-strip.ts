import { ElementHandle, Page } from 'puppeteer'
import { ViewComponent } from './view-component'

/**
 * Screenshot steps for an `ArrowScrollStrip` (design: docs/design/shared/features/arrow-scroll-strip.md
 * -> "Tests"). Arrows are clicked in the DOM, not with the mouse, so no hover background is captured.
 */
export type ArrowScrollStripTarget = {
  /** The strip's test-id prefix: `security-toolbar`, `response-codes`. */
  readonly testIdPrefix: string
  /** Which strip with that prefix, in document order: `0` = the only one / the origin side, `1` = the changed side. */
  readonly index?: number
}

/** Whether each arrow is enabled. */
export type ArrowScrollStripArrows = {
  readonly left: boolean
  readonly right: boolean
}

/** Clicks needed for the longest strip of the suites (65 response codes) plus headroom. */
const MAX_CLICKS = 100

async function findStrip(page: Page, { testIdPrefix, index = 0 }: ArrowScrollStripTarget): Promise<ElementHandle<Element>> {
  const strips = await page.$$(`[data-testid="${testIdPrefix}-strip"]`)
  const strip = strips[index]
  if (!strip) {
    throw new Error(`No strip #${index} with test id ${testIdPrefix}-strip (found ${strips.length})`)
  }
  return strip
}

/** Enabled state of both arrows of the strip. */
export async function readArrowScrollStripArrows(page: Page, target: ArrowScrollStripTarget): Promise<ArrowScrollStripArrows> {
  const strip = await findStrip(page, target)
  return strip.evaluate((element, testIdPrefix) => {
    const isEnabled = (direction: string): boolean => {
      const arrow = element.parentElement?.querySelector(`[data-testid="${testIdPrefix}-arrow-${direction}"]`)
      return arrow instanceof HTMLButtonElement && !arrow.disabled
    }
    return { left: isEnabled('left'), right: isEnabled('right') }
  }, target.testIdPrefix)
}

/** One right-arrow click, then waits until the smooth scroll has settled; `false` when the arrow is disabled. */
async function clickRightArrow(strip: ElementHandle<Element>, testIdPrefix: string): Promise<boolean> {
  return strip.evaluate(async (element, prefix) => {
    const arrow = element.parentElement?.querySelector(`[data-testid="${prefix}-arrow-right"]`)
    if (!(arrow instanceof HTMLButtonElement) || arrow.disabled) {
      return false
    }
    const nextFrame = (): Promise<number> => new Promise(resolve => requestAnimationFrame(resolve))
    const start = element.scrollLeft
    arrow.click()
    // Bounded waits: the scroll starts within a few frames, then runs until it stops moving.
    for (let frame = 0; frame < 30 && element.scrollLeft === start; frame++) {
      await nextFrame()
    }
    let last = element.scrollLeft
    for (let frame = 0, stableFrames = 0; frame < 300 && stableFrames < 5; frame++) {
      await nextFrame()
      stableFrames = element.scrollLeft === last ? stableFrames + 1 : 0
      last = element.scrollLeft
    }
    return true
  }, testIdPrefix)
}

/** Whether the median option (number ⌊n / 2⌋ + 1 of the n options) has reached the strip's centre. */
async function isMedianOptionCentered(strip: ElementHandle<Element>): Promise<boolean> {
  return strip.evaluate(element => {
    // strip > inset > options line > options
    const options = Array.from(element.firstElementChild?.firstElementChild?.children ?? [])
    const median = options[Math.floor(options.length / 2)]
    if (!median) {
      return true
    }
    const stripBox = element.getBoundingClientRect()
    const box = median.getBoundingClientRect()
    return box.left + box.width / 2 <= stripBox.left + stripBox.width / 2 + 1
  })
}

/** Right-arrow clicks until `isDone` or the right edge. */
async function scrollRightUntil(page: Page, target: ArrowScrollStripTarget, isDone: (strip: ElementHandle<Element>) => Promise<boolean>): Promise<void> {
  const strip = await findStrip(page, target)
  for (let click = 0; click < MAX_CLICKS && !await isDone(strip); click++) {
    if (!await clickRightArrow(strip, target.testIdPrefix)) {
      return
    }
  }
}

/**
 * Captures an overflowing strip in its three states, asserting the arrows of each: left edge
 * (initial), middle (the median option scrolled to the strip's centre), right edge (the right arrow disabled).
 */
export async function expectArrowScrollStripStates(page: Page, component: ViewComponent, target: ArrowScrollStripTarget): Promise<void> {
  expect(await readArrowScrollStripArrows(page, target)).toEqual({ left: false, right: true })
  expect(await component.captureScreenshot()).toMatchImageSnapshot()

  await scrollRightUntil(page, target, isMedianOptionCentered)
  expect(await readArrowScrollStripArrows(page, target)).toEqual({ left: true, right: true })
  expect(await component.captureScreenshot()).toMatchImageSnapshot()

  await scrollRightUntil(page, target, async () => false)
  expect(await readArrowScrollStripArrows(page, target)).toEqual({ left: true, right: false })
  expect(await component.captureScreenshot()).toMatchImageSnapshot()
}

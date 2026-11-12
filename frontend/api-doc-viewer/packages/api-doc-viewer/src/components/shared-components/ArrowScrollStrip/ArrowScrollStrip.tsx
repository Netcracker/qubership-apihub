import { cn } from "@apihub/utils/common/cn"
import { resolveStripScrollState, resolveStripScrollTarget, StripItemBox, StripScrollState } from "@apihub/utils/common/strip-scroll"
import { ReactElement, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { ChevronIcon } from "../../kit/icons/ChevronIcon"
import "./ArrowScrollStrip.css"

type ArrowScrollStripProps = {
  /** One element whose direct children are the options (e.g. a `Selector` with `noWrap`). */
  children: ReactElement
  /** Test ids `<prefix>-strip`, `<prefix>-arrow-left`, `<prefix>-arrow-right`. */
  testIdPrefix: string
  /** Px kept around the options: diff round markers and border shadows overhang an option by up to 5px. */
  decorationInset?: number
  /**
   * The vertical inset overhangs the row instead of growing it (negative block margins): a strip in a
   * title row's subheader keeps the row's height. Omitted = the inset is part of the row (toolbar row).
   */
  overhangVertically?: boolean
}

type ArrowDirection = 'left' | 'right'

const DEFAULT_DECORATION_INSET = 6

/**
 * `‹ [option] [option] … ›`: a line of options in a horizontally scrolling strip with a hidden
 * scrollbar. The arrows are shown only when the options overflow the room the strip has; each arrow
 * then scrolls by exactly one option and is disabled at its edge. The strip is as wide as its options,
 * up to the rest of the row it is placed in, and the arrows sit right next to it. Knows nothing about
 * selectors or API types (security toolbar, response codes, …).
 * Design: docs/design/shared/features/arrow-scroll-strip.md
 */
export function ArrowScrollStrip(props: ArrowScrollStripProps): ReactElement {
  const { children, testIdPrefix, decorationInset = DEFAULT_DECORATION_INSET, overhangVertically = false } = props
  const wrapperRef = useRef<HTMLDivElement>(null)
  const stripRef = useRef<HTMLDivElement>(null)
  const [scrollState, setScrollState] = useState<StripScrollState>({ overflows: false, canScrollLeft: false, canScrollRight: false })

  const updateScrollState = useCallback(() => {
    const wrapper = wrapperRef.current
    const strip = stripRef.current
    if (!wrapper || !strip) {
      return
    }
    // The wrapper takes the rest of the row whether the arrows are shown or not. Without arrows the strip
    // also takes the start inset (its negative start margin): that is the room without arrows.
    const availableWidth = wrapper.clientWidth + decorationInset
    const next = resolveStripScrollState(strip.scrollLeft, strip.clientWidth, strip.scrollWidth, availableWidth)
    // Skipped when nothing changed: it runs after every render.
    setScrollState(previous => (
      previous.overflows === next.overflows && previous.canScrollLeft === next.canScrollLeft && previous.canScrollRight === next.canScrollRight
        ? previous
        : next
    ))
  }, [decorationInset])

  // After every render: options may have been added, removed, or re-labelled.
  useLayoutEffect(updateScrollState)

  useEffect(() => {
    const wrapper = wrapperRef.current
    const strip = stripRef.current
    if (!wrapper || !strip || typeof ResizeObserver === 'undefined') {
      return
    }
    // The wrapper resizes with the row; the strip resizes with its options (a late font load included).
    const observer = new ResizeObserver(updateScrollState)
    observer.observe(wrapper)
    observer.observe(strip)
    return () => observer.disconnect()
  }, [updateScrollState])

  const scrollByOneOption = (direction: ArrowDirection): void => {
    const strip = stripRef.current
    // strip > inset > options line > options
    const options = strip?.firstElementChild?.firstElementChild?.children
    if (!strip || !options) {
      return
    }
    const items: StripItemBox[] = Array.from(options)
      .filter((option): option is HTMLElement => option instanceof HTMLElement)
      .map(option => ({ left: option.offsetLeft, width: option.offsetWidth }))
    const target = resolveStripScrollTarget(items, strip.scrollLeft, strip.clientWidth, direction, decorationInset, strip.scrollWidth - strip.clientWidth)
    if (target !== undefined) {
      strip.scrollTo({ left: target, behavior: 'smooth' })
    }
  }

  return (
    <div ref={wrapperRef} className={cn("arrow-scroll-strip flex min-w-0 flex-1 items-center gap-1")}>
      {scrollState.overflows && (
        <StripArrow testIdPrefix={testIdPrefix} direction="left" enabled={scrollState.canScrollLeft} onClick={scrollByOneOption} />
      )}
      {/* As wide as its options (`flex: 0 1 auto`), shrunk to the room left by the arrows. Without
          arrows, a negative start margin moves the start inset out of the row, so the first option
          starts at the row's start and its diff marker paints into the space before the strip. */}
      <div
        ref={stripRef}
        data-testid={`${testIdPrefix}-strip`}
        onScroll={updateScrollState}
        className={cn("arrow-scroll-strip-viewport relative min-w-0 flex-initial overflow-x-auto")}
        style={{
          ...(overhangVertically ? { marginBlock: -decorationInset } : {}),
          ...(scrollState.overflows ? {} : { marginInlineStart: -decorationInset }),
        }}
      >
        {/* Inset: decorations overhanging the options would be clipped at the strip edges. A block
            wrapper, so an option's max-width (100%) is the strip's width; the room after the last
            option is the line's gap before a spacer (ArrowScrollStrip.css). */}
        <div style={{ padding: `${decorationInset}px 0 ${decorationInset}px ${decorationInset}px` }}>
          {children}
        </div>
      </div>
      {scrollState.overflows && (
        <StripArrow testIdPrefix={testIdPrefix} direction="right" enabled={scrollState.canScrollRight} onClick={scrollByOneOption} />
      )}
    </div>
  )
}

type StripArrowProps = {
  testIdPrefix: string
  direction: ArrowDirection
  enabled: boolean
  onClick: (direction: ArrowDirection) => void
}

/** An icon button (`icon-button`, shared-styles/colors/icon-buttons.css): blue, gray when disabled. */
function StripArrow(props: StripArrowProps): ReactElement {
  const { testIdPrefix, direction, enabled, onClick } = props
  return (
    <button
      type="button"
      data-testid={`${testIdPrefix}-arrow-${direction}`}
      aria-label={direction === 'left' ? 'Scroll left' : 'Scroll right'}
      disabled={!enabled}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onClick(direction)
      }}
      className={cn("icon-button arrow-scroll-strip-arrow")}
    >
      <ChevronIcon direction={direction} />
    </button>
  )
}

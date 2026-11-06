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
 * scrollbar. Each arrow scrolls by exactly one option and is disabled at its edge; both arrows are
 * always shown, so the row never jumps. It takes the rest of the row it is placed in. Knows nothing
 * about selectors or API types (security toolbar, response codes, …).
 * Design: docs/design/shared/features/arrow-scroll-strip.md
 */
export function ArrowScrollStrip(props: ArrowScrollStripProps): ReactElement {
  const { children, testIdPrefix, decorationInset = DEFAULT_DECORATION_INSET, overhangVertically = false } = props
  const stripRef = useRef<HTMLDivElement>(null)
  const [scrollState, setScrollState] = useState<StripScrollState>({ canScrollLeft: false, canScrollRight: false })

  const updateScrollState = useCallback(() => {
    const strip = stripRef.current
    if (!strip) {
      return
    }
    const next = resolveStripScrollState(strip.scrollLeft, strip.clientWidth, strip.scrollWidth)
    // Skipped when nothing changed: it runs after every render.
    setScrollState(previous => (
      previous.canScrollLeft === next.canScrollLeft && previous.canScrollRight === next.canScrollRight ? previous : next
    ))
  }, [])

  // After every render: options may have been added, removed, or re-labelled.
  useLayoutEffect(updateScrollState)

  useEffect(() => {
    const strip = stripRef.current
    if (!strip || typeof ResizeObserver === 'undefined') {
      return
    }
    const observer = new ResizeObserver(updateScrollState)
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
    <div className={cn("arrow-scroll-strip flex min-w-0 flex-1 items-center gap-1")}>
      <StripArrow testIdPrefix={testIdPrefix} direction="left" enabled={scrollState.canScrollLeft} onClick={scrollByOneOption} />
      <div
        ref={stripRef}
        data-testid={`${testIdPrefix}-strip`}
        onScroll={updateScrollState}
        className={cn("arrow-scroll-strip-viewport relative min-w-0 flex-1 overflow-x-auto")}
        style={overhangVertically ? { marginBlock: -decorationInset } : undefined}
      >
        {/* Inset: decorations overhanging the options would be clipped at the strip edges. A block
            wrapper, so an option's max-width (100%) is the strip's width; the room after the last
            option is the line's gap before a spacer (ArrowScrollStrip.css). */}
        <div style={{ padding: `${decorationInset}px 0 ${decorationInset}px ${decorationInset}px` }}>
          {children}
        </div>
      </div>
      <StripArrow testIdPrefix={testIdPrefix} direction="right" enabled={scrollState.canScrollRight} onClick={scrollByOneOption} />
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

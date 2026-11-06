import { FC, memo } from "react"

type ChevronIconProps = {
  direction: 'left' | 'right'
}

/** Chevron in `currentColor`, so the button decides the color (shared-styles/colors/icon-buttons.css). */
export const ChevronIcon: FC<ChevronIconProps> = memo<ChevronIconProps>(({ direction }) => (
  <svg
    width="8"
    height="12"
    viewBox="0 0 8 12"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ transform: direction === 'left' ? 'rotate(180deg)' : undefined }}
    aria-hidden="true"
  >
    <path d="M1.5 1L6.5 6L1.5 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
))

import { FC, memo } from "react"

/** External-link arrow pointing to the top-right corner; inherits the text color. */
export const ArrowUpRightIcon: FC = memo(() => {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M2.25 1.5H8.5V7.75M8.5 1.5L1.5 8.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
})

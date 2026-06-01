import { keyframes, styled } from '@mui/material/styles'
import Typography from '@mui/material/Typography'
import { type FC, memo } from 'react'

export type ThinkingIndicatorProps = {
  visible: boolean
}

/** 1 -> 2 -> 3 dots, then all hide; CSS-only (no React re-renders). */
const THINKING_DOTS = {
  cycleS: 1.8,
  hideAtPercent: 80,
  appearAtPercent: [15, 35, 55],
} as const

export const ThinkingIndicator: FC<ThinkingIndicatorProps> = memo(({ visible }) => {
  if (!visible) {
    return null
  }
  return (
    <Typography variant="body2" color="text.secondary" data-testid="ThinkingIndicator">
      Thinking
      <ThinkingDots aria-hidden>
        {THINKING_DOTS.appearAtPercent.map((_, index) => <span key={index}>.</span>)}
      </ThinkingDots>
    </Typography>
  )
})

ThinkingIndicator.displayName = 'ThinkingIndicator'

const thinkingDotKeyframes = THINKING_DOTS.appearAtPercent.map((appearAt) => {
  const { hideAtPercent } = THINKING_DOTS
  return keyframes`
    0%, ${appearAt - 1}% {
      opacity: 0;
    }
    ${appearAt}%, ${hideAtPercent - 1}% {
      opacity: 1;
    }
    ${hideAtPercent}%, 100% {
      opacity: 0;
    }
  `
})

const thinkingDotSpanStyles = Object.fromEntries(
  thinkingDotKeyframes.map((animationName, index) => [
    `& > span:nth-of-type(${index + 1})`,
    { animationName },
  ]),
)

const ThinkingDots = styled('span')({
  '& > span': {
    opacity: 0,
    animationDuration: `${THINKING_DOTS.cycleS}s`,
    animationTimingFunction: 'linear',
    animationIterationCount: 'infinite',
  },
  ...thinkingDotSpanStyles,
})

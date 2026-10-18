import type { Theme } from '@mui/material/styles'

/** Set on the composer shell; read in {@link readComposerActionReservePx}. */
export const COMPOSER_ACTION_RESERVE_CSS_VAR = '--composer-action-reserve'

export const COMPOSER_SEND_BUTTON_SIZE_SPACING = 5
const COMPOSER_SEND_BUTTON_GAP_SPACING = 1

export function composerActionReserve(theme: Theme): string {
  return `calc(${theme.spacing(COMPOSER_SEND_BUTTON_SIZE_SPACING)} + ${
    theme.spacing(COMPOSER_SEND_BUTTON_GAP_SPACING)
  })`
}

/*
 * Single-line vs multiline composer layout cannot be derived from MUI or CSS alone:
 *
 * - TextField multiline uses TextareaAutosize for height only; it has no wrap/layout signal.
 *   onHeightChange is total height, not wrap at the narrower single-line width.
 * - Pure CSS cannot detect soft wrap while also moving the button to the next row.
 * - Changing grid-column span changes textarea width, fights TextareaAutosize, and loops re-renders.
 *
 * We keep a stable grid (field always spans both columns) and detect overflow at single-line
 * text width by measuring scrollHeight with the same right padding as in single-line mode.
 */

export function readComposerActionReservePx(shell: HTMLElement): number {
  const reserve = getComputedStyle(shell).getPropertyValue(COMPOSER_ACTION_RESERVE_CSS_VAR).trim()
  if (!reserve) {
    return 0
  }
  const probe = document.createElement('div')
  probe.style.position = 'absolute'
  probe.style.visibility = 'hidden'
  probe.style.width = reserve
  shell.appendChild(probe)
  const width = probe.offsetWidth
  shell.removeChild(probe)
  return width
}

export function isComposerMultilineLayout(
  textarea: HTMLTextAreaElement,
  draft: string,
  actionReservePx: number,
): boolean {
  if (draft.includes('\n')) {
    return true
  }
  const singleLineHeight = readSingleLineContentHeight(textarea)
  if (singleLineHeight === undefined) {
    return false
  }
  return measureScrollHeightAtSingleLineWidth(textarea, actionReservePx) > singleLineHeight + 1
}

function readSingleLineContentHeight(textarea: HTMLTextAreaElement): number | undefined {
  const styles = getComputedStyle(textarea)
  const lineHeight = Number.parseFloat(styles.lineHeight)
  if (!Number.isFinite(lineHeight)) {
    return undefined
  }
  const paddingTop = Number.parseFloat(styles.paddingTop)
  const paddingBottom = Number.parseFloat(styles.paddingBottom)
  return lineHeight + paddingTop + paddingBottom
}

/**
 * In multiline mode the field has no right padding; in single-line mode padding reserves space
 * for the button. We apply that padding only for this measurement so scrollHeight reflects
 * wrapping beside the button, without flipping React layout state (which caused thrashing).
 */
function measureScrollHeightAtSingleLineWidth(
  textarea: HTMLTextAreaElement,
  actionReservePx: number,
): number {
  const previousPaddingRight = textarea.style.paddingRight
  textarea.style.paddingRight = actionReservePx > 0 ? `${actionReservePx}px` : ''
  const { scrollHeight } = textarea
  textarea.style.paddingRight = previousPaddingRight
  return scrollHeight
}

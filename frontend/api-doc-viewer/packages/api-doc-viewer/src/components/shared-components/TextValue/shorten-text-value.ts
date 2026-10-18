import { ArrayUtils } from "@apihub/utils/common/arrays"
import { TextValueVariant } from "./types"

export const OVERFLOW_LINES_AMOUNT = 5
export const OVERFLOW_CHARACTERS_AMOUNT = 300

/** Shared by TextValue and MarkdownTextValue - a value overflows when it's too long by either measure. */
export function isExpandable(value: string | undefined): boolean {
  if (!value) {
    return false
  }
  return (
    value.length > OVERFLOW_CHARACTERS_AMOUNT ||
    ArrayUtils.trim(value.split('\n')).length > OVERFLOW_LINES_AMOUNT
  )
}

/** Callers decide whether to shorten (e.g. `expanded ? value : shortenValue(value)`) - this always truncates when overflowing. */
export function shortenValue(value: string | undefined): string | undefined {
  if (!value) {
    return undefined
  }
  if (value.length > OVERFLOW_CHARACTERS_AMOUNT) {
    return value.slice(0, OVERFLOW_CHARACTERS_AMOUNT) + '...'
  }
  const lines = ArrayUtils.trim(value.split('\n'))
  if (lines.length > OVERFLOW_LINES_AMOUNT) {
    return lines.slice(0, OVERFLOW_LINES_AMOUNT).join('\n') + '...'
  }
  return value
}

export function getExpanderFontSizeClass(variant: TextValueVariant | undefined): string {
  switch (variant) {
    case TextValueVariant.h1:
      return 'text-value-expander--h1'
    case TextValueVariant.h2:
      return 'text-value-expander--h2'
    case TextValueVariant.h3:
      return 'text-value-expander--h3'
    case TextValueVariant.h4:
      return 'text-value-expander--h4'
    case TextValueVariant.h5:
      return 'text-value-expander--h5'
    case TextValueVariant.h6:
      return 'text-value-expander--h6'
    case TextValueVariant.body1:
      return 'text-value-expander--body1'
    case TextValueVariant.body2:
      return 'text-value-expander--body2'
    default:
      return 'text-value-expander--body2'
  }
}

/**
 * Prefix of every CSS class the library renders. The build half of CSS isolation
 * (`postcss/css-isolation.cjs`) applies the same prefix to the class selectors of the stylesheets.
 * Design: docs/design/shared/features/css-isolation.md
 */
export const CSS_CLASS_PREFIX = 'api-doc-viewer-'

export type ClassValue = string | number | boolean | null | undefined | ReadonlyArray<ClassValue>

/**
 * Joins plain class names into the `className` of an element, prefixing every token with
 * {@link CSS_CLASS_PREFIX}: `cn('flex px-4', isSelected && 'selected')` →
 * `'api-doc-viewer-flex api-doc-viewer-px-4 api-doc-viewer-selected'`. Strings may hold several
 * whitespace-separated tokens; non-string values other than arrays are skipped. Idempotent: an
 * already prefixed token is kept, so a forwarded `className` can pass through `cn()` again.
 */
export function cn(...values: ClassValue[]): string {
  const tokens: string[] = []
  collectClassTokens(values, tokens)
  return tokens.join(' ')
}

function collectClassTokens(values: ReadonlyArray<ClassValue>, tokens: string[]): void {
  for (const value of values) {
    if (typeof value === 'string') {
      for (const token of value.split(/\s+/)) {
        if (token) {
          tokens.push(token.startsWith(CSS_CLASS_PREFIX) ? token : `${CSS_CLASS_PREFIX}${token}`)
        }
      }
    } else if (Array.isArray(value)) {
      collectClassTokens(value, tokens)
    }
  }
}

/**
 * Text colours that components receive as values (`TextRow` / `TextValue` `textColor`, `labelColor`
 * end up in an inline `style`), so they cannot be CSS classes of `colors/*.css`. The single place to
 * change them.
 */
export class TextColors {
  /** Secondary text: the operation ID row, the address text. */
  public static readonly SECONDARY = '#626D82'
  /** Muted text: the unresolved security scheme row. */
  public static readonly MUTED = '#8F9EB4'
}

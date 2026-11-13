/**
 * Font families for inline styles. The library's `@font-face` families are renamed to
 * `api-doc-viewer <family>` by the CSS isolation PostCSS plugin (`postcss/css-isolation.cjs`), so an
 * inline style must use the renamed family. Design: docs/design/shared/features/css-isolation.md
 */
export const FONT_FAMILY_INTER_NAME = 'api-doc-viewer Inter'

/** {@link FONT_FAMILY_INTER_NAME} quoted for a CSS `font-family` value. */
export const FONT_FAMILY_INTER = `"${FONT_FAMILY_INTER_NAME}"`

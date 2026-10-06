import { FC, memo } from "react"
import "./JsonSchemaTypeValueText.css"
import { JSON_SCHEMA_TYPE_VALUE_DEFAULT_COLOR } from "./json-schema-type-value-colors"

export type JsonSchemaTypeValueTextProps = {
  text: string
  /**
   * Omitted -> defaults to {@link JSON_SCHEMA_TYPE_VALUE_DEFAULT_COLOR} (title row's color).
   * `null` -> no inline color is set, so an ambient CSS color (e.g. a combiner-selector
   * button's own selected/unselected text color) applies instead. A string -> used as-is.
   */
  color?: string | null
  className?: string
}

/**
 * Leaf: draws type-value text only. No diff awareness, no visibility gate - callers decide
 * whether to render it at all.
 *
 * `className` (diff/highlighter classes) is applied to an INNER span, not the outer one, so it
 * never becomes a direct flex item of an ancestor `inline-flex` container (e.g.
 * `.json-schema-type-value-segments`). A flex item's `display` is CSS-blockified - an `inline`
 * box becomes `block` - which makes `line-height` (not font metrics) determine the painted
 * height of a highlighter background, rendering it ~1px taller than legacy's equivalent
 * (`NodeType.tsx`'s `.inline` divs, which stay genuinely inline because they're nested one level
 * below their `inline-flex` ancestor). Keeping the highlighted element on a non-flex-item
 * descendant reproduces legacy's inline box-painting exactly.
 */
export const JsonSchemaTypeValueText: FC<JsonSchemaTypeValueTextProps> = memo<JsonSchemaTypeValueTextProps>((props) => {
  const { text, color: colorProp, className } = props
  const color = colorProp === undefined ? JSON_SCHEMA_TYPE_VALUE_DEFAULT_COLOR : colorProp

  return (
    <span
      className="json-schema-type-value-text"
      style={color ? { color } : undefined}
    >
      {className ? <span className={className}>{text}</span> : text}
    </span>
  )
})

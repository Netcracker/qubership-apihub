import { LayoutSide, ORIGIN_LAYOUT_SIDE } from "@apihub/types/internal/LayoutSide"
import { isDiffAdd, isDiffRemove, isDiffReplace } from "@netcracker/qubership-apihub-api-diff"
import { DiffsClassesBuilder } from "@netcracker/qubership-apihub-next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/utilities"
import { ChangedPropertyMetaData } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { FC, memo, ReactNode, useCallback, useMemo, useState } from "react"
import ReactMarkdown, { Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import { TextRowUsage } from "../TextRow/types"
import { getExpanderFontSizeClass, isExpandable, shortenValue } from "./shorten-text-value"
import { TextValueVariant } from "./types"
import "../MarkdownTextRow/MarkdownTextRow.css"

const JSON_SCHEMA_DESCRIPTION_MARKDOWN_CLASS = "markdown-text-row__json-schema-description"
const JSON_SCHEMA_DESCRIPTION_EXPANDER_CLASS = "markdown-text-row__json-schema-expander"

type MarkdownTextValueProps = {
  value: string
  variant?: TextValueVariant
  usage?: TextRowUsage
  layoutSide: LayoutSide
  diff?: ChangedPropertyMetaData
}

type MarkdownExpanderProps = {
  isExpandable: boolean
  expanded: boolean
  onToggle: () => void
  expanderClassName: string
}

const MarkdownExpander: FC<MarkdownExpanderProps> = (props) => {
  const { isExpandable, expanded, onToggle, expanderClassName } = props

  if (!isExpandable) {
    return null
  }

  return (
    <div className="mt-1">
      <a
        className={`${expanderClassName} text-blue-600 hover:text-blue-500 hover:cursor-pointer`.trim()}
        onClick={onToggle}
      >
        {!expanded ? "Show more" : "Show less"}
      </a>
    </div>
  )
}

function resolveSideAwareMarkdownValue(
  value: string,
  diff: ChangedPropertyMetaData | undefined,
  layoutSide: LayoutSide,
): { resolvedValue: string; isInvisible: boolean } {
  if (!diff) {
    return { resolvedValue: value, isInvisible: false }
  }

  const { data } = diff
  const isOrigin = layoutSide === ORIGIN_LAYOUT_SIDE

  if (isDiffAdd(data)) {
    if (isOrigin) {
      return { resolvedValue: "", isInvisible: true }
    }
    return {
      resolvedValue: typeof data.afterValue === "string" ? data.afterValue : value,
      isInvisible: false,
    }
  }

  if (isDiffRemove(data)) {
    if (!isOrigin) {
      return { resolvedValue: "", isInvisible: true }
    }
    return {
      resolvedValue: typeof data.beforeValue === "string" ? data.beforeValue : value,
      isInvisible: false,
    }
  }

  if (isDiffReplace(data)) {
    const resolvedValue = isOrigin
      ? (typeof data.beforeValue === "string" ? data.beforeValue : value)
      : (typeof data.afterValue === "string" ? data.afterValue : value)
    return { resolvedValue, isInvisible: false }
  }

  return { resolvedValue: value, isInvisible: false }
}

function getMarkdownFontSizeClass(variant: TextValueVariant): string {
  switch (variant) {
    case TextValueVariant.body1:
      return "text-value-body1"
    case TextValueVariant.h1:
    case TextValueVariant.h2:
    case TextValueVariant.h3:
    case TextValueVariant.h4:
    case TextValueVariant.h5:
    case TextValueVariant.h6:
      return "text-value-body2"
    case TextValueVariant.body2:
    default:
      return "text-value-body2"
  }
}

function resolveMarkdownTypography(
  usage: TextRowUsage | undefined,
  variant: TextValueVariant,
): { markdownClassName: string; expanderClassName: string } {
  if (usage === TextRowUsage.JsonSchemaDescription) {
    return {
      markdownClassName: JSON_SCHEMA_DESCRIPTION_MARKDOWN_CLASS,
      expanderClassName: JSON_SCHEMA_DESCRIPTION_EXPANDER_CLASS,
    }
  }

  return {
    markdownClassName: ["text-slate-700", getMarkdownFontSizeClass(variant)].join(" "),
    expanderClassName: `text-value-expander ${getExpanderFontSizeClass(variant)}`.trim(),
  }
}

export const MarkdownTextValue: FC<MarkdownTextValueProps> = memo<MarkdownTextValueProps>((props) => {
  const { value, variant = TextValueVariant.body2, usage, layoutSide, diff } = props
  const [expanded, setExpanded] = useState(false)

  const { resolvedValue, isInvisible } = useMemo(
    () => resolveSideAwareMarkdownValue(value, diff, layoutSide),
    [diff, layoutSide, value],
  )

  const displayValue = useMemo(
    () => expanded ? resolvedValue : shortenValue(resolvedValue),
    [expanded, resolvedValue],
  )

  const isValueExpandable = useMemo(
    () => isExpandable(resolvedValue),
    [resolvedValue],
  )

  const typography = useMemo(
    () => resolveMarkdownTypography(usage, variant),
    [usage, variant],
  )

  const diffsStyleClasses = useMemo(() => {
    if (!diff?.data) {
      return []
    }
    const styles = layoutSide === ORIGIN_LAYOUT_SIDE ? diff.styles.before : diff.styles.after
    const classes: string[] = []
    if (styles.textHighlighterColor) {
      classes.push(DiffsClassesBuilder.highlighter(styles.textHighlighterColor))
    }
    return classes
  }, [diff, layoutSide])

  // `diffsStyleClasses` (background-color only, see DiffsClassesBuilder.highlighter) must NOT
  // land on this className: ReactMarkdown always wraps its output in a `<div>` when `className`
  // is set, and a block box always paints its background as one bounding rectangle - even once
  // it shrinks to content width - so a wrapped multi-line value still highlights the whole
  // width/height block instead of hugging each line. Typography-only classes are safe here since
  // they don't need per-line painting.
  const markdownClassName = useMemo(() => {
    return [
      "markdown",
      typography.markdownClassName,
    ].filter(Boolean).join(" ")
  }, [typography.markdownClassName])

  // Wrap the paragraph's children in an inline <span> carrying the highlighter class, keeping the
  // <p> itself as-is: background-color on a genuinely inline element paints per line box (the
  // actual "marker" look), not as one rectangle spanning the block.
  //
  // The <p> must stay the direct child of `.markdown` - NOT be replaced by the span itself.
  // `.markdown-text-row .markdown > * { all: revert }` (MarkdownTextRow.css) targets direct
  // children of `.markdown` with specificity (0,2,0); `all` is a shorthand that resets every
  // longhand property including `background-color`, and (0,2,0) beats the single-class
  // `.diffs-highlighter_*` rule's (0,1,0) - so a span placed directly under `.markdown` has its
  // background-color reverted to transparent regardless of the highlighter class (this is exactly
  // what broke highlighting entirely on the first attempt at this fix). One level deeper (a child
  // of the still-reverted <p>, not of `.markdown` itself) is outside that selector's reach, so the
  // highlighter class applies uncontested.
  //
  // Scoped to `p` only: it's the element CommonMark wraps plain description/value text in, which
  // covers the realistic content for this component; block structures like lists/tables/headings
  // keep their own layout and aren't part of this fix.
  const markdownComponents = useMemo<Components>(() => ({
    p: ({ children }: { children?: ReactNode }) => (
      <p>
        {/* <span className={diffsStyleClasses.join(" ")}>{children}</span> */}
        {children}
      </p>
    ),
  }), [])

  const onToggleExpanded = useCallback(() => {
    setExpanded(prev => !prev)
  }, [])

  if (isInvisible || !displayValue) {
    return null
  }

  return (
    <div className={`markdown-text-row flex min-w-0 flex-col items-start gap-1 ${diffsStyleClasses.join(" ")}`}>
      <ReactMarkdown className={markdownClassName} remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {displayValue}
      </ReactMarkdown>
      <MarkdownExpander
        isExpandable={isValueExpandable}
        expanded={expanded}
        onToggle={onToggleExpanded}
        expanderClassName={typography.expanderClassName}
      />
    </div>
  )
})

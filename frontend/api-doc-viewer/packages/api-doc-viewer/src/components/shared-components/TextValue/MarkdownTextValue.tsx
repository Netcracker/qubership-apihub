import { cn } from "@apihub/utils/common/cn"
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
    <div className={cn("mt-1")}>
      <a
        className={cn(`${expanderClassName} text-blue-600 hover:text-blue-500 hover:cursor-pointer`.trim())}
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

type TextBlockProps = { children?: ReactNode }

/** Markdown text blocks whose children are wrapped in an inline highlighter span (see `MarkdownTextValue`). */
function buildHighlightedTextBlocks(highlighterClass: string): Components {
  const highlight = (children: ReactNode): ReactNode => <span className={cn(highlighterClass)}>{children}</span>
  return {
    p: ({ children }: TextBlockProps) => <p>{highlight(children)}</p>,
    li: ({ children }: TextBlockProps) => <li>{highlight(children)}</li>,
    h1: ({ children }: TextBlockProps) => <h1>{highlight(children)}</h1>,
    h2: ({ children }: TextBlockProps) => <h2>{highlight(children)}</h2>,
    h3: ({ children }: TextBlockProps) => <h3>{highlight(children)}</h3>,
    h4: ({ children }: TextBlockProps) => <h4>{highlight(children)}</h4>,
    h5: ({ children }: TextBlockProps) => <h5>{highlight(children)}</h5>,
    h6: ({ children }: TextBlockProps) => <h6>{highlight(children)}</h6>,
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

  const highlighterClass = useMemo(() => {
    if (!diff?.data) {
      return ''
    }
    const styles = layoutSide === ORIGIN_LAYOUT_SIDE ? diff.styles.before : diff.styles.after
    return DiffsClassesBuilder.highlighter(styles.textHighlighterColor)
  }, [diff, layoutSide])

  // The highlighter class (background-color only, see DiffsClassesBuilder.highlighter) must NOT
  // land on this className or on the outer `.markdown-text-row` div: ReactMarkdown wraps its output
  // in a `<div>` when `className` is set, and a block box paints its background as one bounding
  // rectangle - even once it shrinks to content width - so a wrapped multi-line value would
  // highlight the whole block instead of each line. Typography-only classes are safe here.
  const markdownClassName = useMemo(() => {
    return [
      "markdown",
      typography.markdownClassName,
    ].filter(Boolean).join(" ")
  }, [typography.markdownClassName])

  // The highlighter goes on an inline <span> around the children of each text block (paragraph,
  // list item, heading): background-color on an inline element paints per line box (the "marker"
  // look), so only the space under the text is filled.
  //
  // The span sits inside the block element, never directly under `.markdown`:
  // `.markdown-text-row .markdown > * { all: revert }` (MarkdownTextRow.css, specificity (0,2,0))
  // resets `background-color` of every direct child of `.markdown` and outranks the single-class
  // `.diffs-highlighter_*` rule.
  const markdownComponents = useMemo<Components>(
    () => highlighterClass ? buildHighlightedTextBlocks(highlighterClass) : {},
    [highlighterClass],
  )

  const onToggleExpanded = useCallback(() => {
    setExpanded(prev => !prev)
  }, [])

  if (isInvisible || !displayValue) {
    return null
  }

  return (
    <div className={cn("markdown-text-row flex min-w-0 flex-col items-start gap-1")}>
      <ReactMarkdown className={cn(markdownClassName)} remarkPlugins={[remarkGfm]} components={markdownComponents}>
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

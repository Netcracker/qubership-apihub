import { X_AXIS_PADDING_ROWS_ASYNC_API, X_AXIS_PADDING_ROWS_DDL_API_PROPERTIES, X_AXIS_PADDING_ROWS_JSO } from "@apihub/components/shared-styles/tailwind-classnames"
import { useEffectiveLevel } from "@apihub/contexts/AsyncLevelContext/useEffectiveLevel"
import { CHANGED_LAYOUT_SIDE, ORIGIN_LAYOUT_SIDE } from "@apihub/types/internal/LayoutSide"
import { DiffsClassesBuilder } from "@netcracker/qubership-apihub-next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/utilities"
import { DdlApiRowDiffs } from "@netcracker/qubership-apihub-next-data-model/model/ddlapi/tree-with-diffs/property-row-diffs"
import { FC, memo, useMemo } from "react"
import "../../shared-styles/preceded-by.css"
import { LevelIndicator } from "../LevelIndicator"
import { JsonSchemaRootExpanderOffset } from "../JsonSchemaExpanderColumn/JsonSchemaExpanderColumn"
import { TextRowUsage } from "../TextRow/types"
import { TextValueVariant } from "../TextValue/types"
import { ATTRIBUTE_PRECEDED_BY } from "../WithPrecededByProps"
import { MarkdownTextValue } from "../TextValue/MarkdownTextValue"
import type { MarkdownTextRowContentProps } from "./types"

const MARKDOWN_TEXT_ROW_X_AXIS_PADDING_BY_USAGE: Partial<Record<TextRowUsage, string>> = {
  [TextRowUsage.DdlApiProperty]: X_AXIS_PADDING_ROWS_DDL_API_PROPERTIES,
  [TextRowUsage.JsonSchemaDescription]: X_AXIS_PADDING_ROWS_JSO,
}

const MARKDOWN_TEXT_ROW_ADDITIONAL_CLASSES_BY_USAGE: Partial<Record<TextRowUsage, string[]>> = {
  [TextRowUsage.DdlApiProperty]: ["min-h-[26px]"],
}

function getMarkdownTextRowClassesByUsage(usage: TextRowUsage): string {
  const xAxisPaddingClass = MARKDOWN_TEXT_ROW_X_AXIS_PADDING_BY_USAGE[usage] ?? X_AXIS_PADDING_ROWS_ASYNC_API
  const additionalClasses = MARKDOWN_TEXT_ROW_ADDITIONAL_CLASSES_BY_USAGE[usage] ?? []
  return [xAxisPaddingClass, ...additionalClasses].join(" ")
}

function isMarkdownSideContentVisible(
  diff: MarkdownTextRowContentProps["diff"],
  layoutSide: MarkdownTextRowContentProps["layoutSide"],
  usage: TextRowUsage,
): boolean {
  if (usage === TextRowUsage.DdlApiProperty) {
    return DdlApiRowDiffs.PropertyRow.isContentVisible(diff, layoutSide)
  }
  if (!diff?.data) {
    return true
  }
  const styles = layoutSide === ORIGIN_LAYOUT_SIDE ? diff.styles.before : diff.styles.after
  return styles.isContentVisible ?? true
}

export const MarkdownTextRowContent: FC<MarkdownTextRowContentProps> = memo<MarkdownTextRowContentProps>((props) => {
  const {
    value,
    variant = TextValueVariant.body2,
    layoutSide,
    usage = TextRowUsage.Default,
    hideLevelIndicatorWhenSideEmpty = false,
    diff,
  } = props

  const { [ATTRIBUTE_PRECEDED_BY]: precededBy } = props

  const level = useEffectiveLevel(layoutSide)
  const isDdlApiPropertyRow = usage === TextRowUsage.DdlApiProperty
  const showsLevelIndentForUsage = isDdlApiPropertyRow || usage === TextRowUsage.JsonSchemaDescription
  const isSideContentVisible = useMemo(
    () => isMarkdownSideContentVisible(diff, layoutSide, usage),
    [diff, layoutSide, usage],
  )
  const showsJsonSchemaRootExpanderOffset = usage === TextRowUsage.JsonSchemaDescription && level === 0
  const showsLevelIndent = showsLevelIndentForUsage
    && level > 0
    && (!hideLevelIndicatorWhenSideEmpty || isSideContentVisible)

  const diffsStyleClasses = useMemo(() => {
    if (!diff?.data) {
      return []
    }
    const { styles } = diff
    const diffsStyleClasses: string[] = []
    if (layoutSide === ORIGIN_LAYOUT_SIDE) {
      diffsStyleClasses.push(DiffsClassesBuilder.background(styles.before.backgroundColor))
    }
    if (layoutSide === CHANGED_LAYOUT_SIDE) {
      diffsStyleClasses.push(DiffsClassesBuilder.background(styles.after.backgroundColor))
    }
    return diffsStyleClasses
  }, [diff, layoutSide])

  const usageDrivenClasses = useMemo(() => getMarkdownTextRowClassesByUsage(usage), [usage])

  const markdownValue = (
    <MarkdownTextValue
      value={value}
      variant={variant}
      usage={usage}
      layoutSide={layoutSide}
      diff={diff}
    />
  )

  return (
    <div
      data-precededby={precededBy}
      className={[
        "markdown-text-row-content flex w-full h-full gap-2",
        isDdlApiPropertyRow || usage === TextRowUsage.JsonSchemaDescription ? "items-stretch" : "",
        usageDrivenClasses,
        ...diffsStyleClasses,
      ].filter(Boolean).join(" ")}
    >
      {showsJsonSchemaRootExpanderOffset && <JsonSchemaRootExpanderOffset />}
      {showsLevelIndent && (
        <div data-precededby={precededBy} className="level-indicator-column flex items-stretch self-stretch">
          <LevelIndicator level={level} />
          <div className="w-4" aria-hidden="true" />
        </div>
      )}
      {isDdlApiPropertyRow ? (
        <div className="ddlapi-property-row-body flex min-w-0 flex-1 items-center gap-2">
          {markdownValue}
        </div>
      ) : usage === TextRowUsage.JsonSchemaDescription ? (
        // items-start (not items-center): markdown content is often multi-line / expandable,
        // so it must hug the top of the row, not float centered - see TextRow for contrast
        // (plain text values are never used for JSON Schema descriptions, so it never had
        // this wrapper/class at all).
        <div className="json-schema-property-row-body flex min-w-0 flex-1 items-start gap-2">
          {markdownValue}
        </div>
      ) : (
        markdownValue
      )}
    </div>
  )
})

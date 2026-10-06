import { FC } from "react"
import { ExpandingCaret } from "../../common/layout/Expander/ExpandingCaret"
import { NestingHorizontalIndicator } from "../../common/NestingHorizontalIndicator"

export const JSON_SCHEMA_EXPANDER_COLUMN_WIDTH_CLASS = "w-4 min-w-[16px] shrink-0 flex-none"
// export const JSON_SCHEMA_EXPANDER_COLUMN_WIDTH_CLASS = "w-3 min-w-[12px] shrink-0 flex-none"

// TEMPORARY (legacy pixel-parity bridge — see json-schema-legacy-vs-next-layout-diff.md §A):
// the now-retired legacy (api-data-model based) JsonSchemaViewer reserved a flat 20px (`w-5`) at the root with NO extra
// row gap. Here the row's own `gap-2` (8px, TitleRowContent.tsx / MarkdownTextRowContent.tsx /
// AdditionalInfoRowContent.tsx) is always applied on top of this offset, so 12px + 8px = 20px
// reproduces that legacy total. Root-only; does not affect JSON_SCHEMA_EXPANDER_COLUMN_WIDTH_CLASS
// (non-root rows already match the old 16px). The legacy component is gone, so this hack is now
// purely a screenshot-baseline-compatibility shim - safe to remove once the existing
// JsonSchemaViewer/JsonSchemaDiffsViewer root-row screenshot baselines are intentionally
// regenerated against the current Next layout (not attempted here - out of scope for this change).
const JSON_SCHEMA_ROOT_EXPANDER_OFFSET_WIDTH_CLASS = "w-3 min-w-[12px] shrink-0 flex-none"

export const JsonSchemaRootExpanderOffset: FC = () => (
  <div className={JSON_SCHEMA_ROOT_EXPANDER_OFFSET_WIDTH_CLASS} aria-hidden="true" />
)

export type JsonSchemaExpanderColumnProps = {
  isRoot: boolean
  expandable: boolean
  expanded?: boolean
  onClick?: () => void
}

export const JsonSchemaExpanderColumn: FC<JsonSchemaExpanderColumnProps> = (props) => {
  const { isRoot, expandable, expanded, onClick } = props

  if (isRoot && !expandable) {
    return <JsonSchemaRootExpanderOffset />
  }

  if (isRoot && expandable) {
    return (
      <div className={`flex flex-row items-center justify-center pt-1.5`}>
        {expanded !== undefined && (
          <ExpandingCaret onToggle={onClick ?? (() => {})} expanded={expanded} />
        )}
      </div>
    )
  }

  if (!expandable) {
    return (
      <div className={`flex flex-row items-center justify-center pt-1.5 ${JSON_SCHEMA_EXPANDER_COLUMN_WIDTH_CLASS}`}>
        <NestingHorizontalIndicator />
      </div>
    )
  }

  return (
    <div className={`flex flex-row items-center justify-center pt-1.5 gap-0.5 ${JSON_SCHEMA_EXPANDER_COLUMN_WIDTH_CLASS}`}>
      <NestingHorizontalIndicator short />
      {expanded !== undefined && (
        <ExpandingCaret onToggle={onClick ?? (() => {})} expanded={expanded} />
      )}
    </div>
  )
}

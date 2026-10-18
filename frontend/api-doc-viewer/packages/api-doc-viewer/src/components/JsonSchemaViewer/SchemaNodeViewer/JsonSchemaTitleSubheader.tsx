import { CIRCULAR_REF_TOOLTIP } from "../../../consts/tooltips"
import { CircularRefIcon } from "@apihub/components/kit/icons/CircularRefIcon"
import { TagsWithDiffs } from "@apihub/components/shared-components/diffs/TagsWithDiffs"
import { LayoutSide } from "@apihub/types/internal/LayoutSide"
import { JsonSchemaTreeNodeWithDiffs } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/types/aliases"
import { JsonSchemaTreeNodeMeta } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/types/node-meta"
import { JsonSchemaTreeNodeValue } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/types/node-value"
import { FC } from "react"
import { UxTooltip } from "@apihub/components/kit/ux/UxTooltip/UxTooltip"
import { UxBadge } from "@apihub/components/kit/ux/UxBadge/UxBadge"
import { BADGE_KIND_DEFAULT_OUTLINE } from "@apihub/components/kit/ux/UxBadge/types"
import { JsonSchemaTitleRowViewProps } from "../utils/json-schema-title-row-view-props"
// NOTE: type-value rendering below deliberately does not reuse SubheaderValue/
// SubheaderValueWithDiffs (see ./TypeValue) - to be reconciled with the shared subheader
// stack later; not part of this change.
import { JsonSchemaTitleRowTypeValue } from "./TypeValue/JsonSchemaTitleRowTypeValue"
import { JsonSchemaTitleRowTypeValueWithDiffs } from "./TypeValue/JsonSchemaTitleRowTypeValueWithDiffs"

export type JsonSchemaTitleSubheaderProps = {
  value: JsonSchemaTreeNodeValue | null | undefined
  meta: JsonSchemaTreeNodeMeta | null | undefined
  isCycle: boolean
  layoutSide: LayoutSide
  showTypeLabel?: boolean
  /** See JsonSchemaTitleRowTypeValue's `suffix` prop - combiner-kind suffix, e.g. " (anyOf)". */
  typeValueSuffix?: string
  /** Media type badge of a root's direct property (`topLevelPropsMediaTypes`), plain only. */
  mediaType?: string
}

export type JsonSchemaTitleSubheaderWithDiffsProps = {
  meta: JsonSchemaTreeNodeMeta | null | undefined
  node: JsonSchemaTreeNodeWithDiffs
  isCycle: boolean
  layoutSide: LayoutSide
  showTypeLabel?: boolean
  typeValueSuffix?: string
}

export const JsonSchemaTitleSubheader: FC<JsonSchemaTitleSubheaderProps> = (props) => {
  const { value, meta, isCycle, layoutSide, showTypeLabel = true, typeValueSuffix, mediaType } = props

  return (
    <div className="flex flex-row items-center gap-2">
      {showTypeLabel && <JsonSchemaTitleRowTypeValue value={value} meta={meta} suffix={typeValueSuffix} />}
      {isCycle && (
        <UxTooltip text={CIRCULAR_REF_TOOLTIP}>
          <CircularRefIcon />
        </UxTooltip>
      )}
      <TagsWithDiffs
        readOnly={meta?.readOnly}
        writeOnly={meta?.writeOnly}
        deprecated={meta?.deprecated}
        layoutSide={layoutSide}
      />
      {mediaType && <UxBadge kind={BADGE_KIND_DEFAULT_OUTLINE} text={mediaType} />}
    </div>
  )
}

export const JsonSchemaTitleSubheaderWithDiffs: FC<JsonSchemaTitleSubheaderWithDiffsProps> = (props) => {
  const { meta, node, isCycle, layoutSide, showTypeLabel = true, typeValueSuffix } = props
  const tagsWithDiffsProps = JsonSchemaTitleRowViewProps.buildTagsProps(node)

  return (
    <div className="flex flex-row items-center gap-2">
      {showTypeLabel && (
        <JsonSchemaTitleRowTypeValueWithDiffs
          node={node}
          meta={meta}
          layoutSide={layoutSide}
          suffix={typeValueSuffix}
        />
      )}
      {isCycle && (
        <UxTooltip text={CIRCULAR_REF_TOOLTIP}>
          <CircularRefIcon />
        </UxTooltip>
      )}
      <TagsWithDiffs
        readOnly={meta?.readOnly}
        writeOnly={meta?.writeOnly}
        deprecated={meta?.deprecated}
        layoutSide={layoutSide}
        {...tagsWithDiffsProps}
      />
    </div>
  )
}

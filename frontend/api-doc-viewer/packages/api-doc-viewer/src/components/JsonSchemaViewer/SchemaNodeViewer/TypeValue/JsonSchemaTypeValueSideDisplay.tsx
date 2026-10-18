import { LayoutSide } from "@apihub/types/internal/LayoutSide"
import { ListSideSegment, SideListDisplay, SideListDisplayKinds } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/list-side-display"
import { FC, memo } from "react"
import { JsonSchemaTypeValueDiffSegment } from "./JsonSchemaTypeValueDiffSegment"
import { JsonSchemaTypeValueText } from "./JsonSchemaTypeValueText"

export type JsonSchemaTypeValueSideDisplayProps = {
  display: SideListDisplay
  layoutSide: LayoutSide
  color?: string | null
}

/**
 * Local SideListDisplay renderer for JSON Schema type-value text, independent of
 * SubheaderValue/CommaSeparatedListWithDiffs (see JsonSchemaTitleSubheader.tsx note). Shared
 * by both with-diffs orchestrators (title row and nesting-indicator row).
 */
export const JsonSchemaTypeValueSideDisplay: FC<JsonSchemaTypeValueSideDisplayProps> = memo<JsonSchemaTypeValueSideDisplayProps>((props) => {
  const { display, layoutSide, color } = props

  if (display.kind === SideListDisplayKinds.NO_DIFFS) {
    return <JsonSchemaTypeValueText text={display.text} color={color} />
  }

  if (display.kind === SideListDisplayKinds.WHOLE_DIFFS) {
    return (
      <JsonSchemaTypeValueDiffSegment
        text={display.text}
        diff={display.diff}
        layoutSide={layoutSide}
        color={color}
      />
    )
  }

  return (
    // Segments within a group abut: legacy's NodeType.tsx concatenates type/qualifier/title as
    // adjacent tokens with zero space (`{actualType}{actualQualifier}{actualTitle}`, all inside
    // one `.inline` div). Only a `spacedBefore` segment (the ` or null` suffix) starts a new
    // group, `gap-1` apart from the previous one.
    <span className="json-schema-type-value-segments inline-flex items-center gap-1">
      {groupSegments(display.segments).map((group, groupIndex) => (
        <span key={groupIndex} className="inline-flex items-center">
          {group.map(({ segment, index }) => (
            <JsonSchemaTypeValueDiffSegment
              key={`${segment.text}-${index}`}
              text={segment.text}
              diff={segment.diff}
              layoutSide={layoutSide}
              color={color}
            />
          ))}
        </span>
      ))}
    </span>
  )
})

type IndexedSegment = { segment: ListSideSegment; index: number }

function groupSegments(segments: readonly ListSideSegment[]): IndexedSegment[][] {
  const groups: IndexedSegment[][] = []
  segments.forEach((segment, index) => {
    const lastGroup = groups[groups.length - 1]
    if (!lastGroup || segment.spacedBefore) {
      groups.push([{ segment, index }])
    } else {
      lastGroup.push({ segment, index })
    }
  })
  return groups
}

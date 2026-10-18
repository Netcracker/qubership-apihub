import { resolveDiffSideStyle } from "@apihub/utils/diffs/resolve-diff-side-style"
import { LayoutSide } from "@apihub/types/internal/LayoutSide"
import { DiffsClassesBuilder } from "@netcracker/qubership-apihub-next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/utilities"
import { ChangedPropertyMetaData } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { FC, memo } from "react"
import { JsonSchemaTypeValueText } from "./JsonSchemaTypeValueText"

export type JsonSchemaTypeValueDiffSegmentProps = {
  text: string
  diff?: ChangedPropertyMetaData
  layoutSide: LayoutSide
  color?: string | null
}

/**
 * Diff-wrapper layer: computes highlighter/background chrome for one text segment and hands
 * the resolved className to the leaf. Kept separate from JsonSchemaTypeValueText so the leaf
 * stays diff-agnostic.
 */
export const JsonSchemaTypeValueDiffSegment: FC<JsonSchemaTypeValueDiffSegmentProps> = memo<JsonSchemaTypeValueDiffSegmentProps>((props) => {
  const { text, diff, layoutSide, color } = props

  const style = resolveDiffSideStyle(diff, layoutSide)
  const className = [
    DiffsClassesBuilder.highlighter(style.textHighlighterColor),
    DiffsClassesBuilder.background(style.backgroundColor),
  ].filter(Boolean).join(" ")

  return (
    <JsonSchemaTypeValueText text={text} color={color} className={className || undefined} />
  )
})

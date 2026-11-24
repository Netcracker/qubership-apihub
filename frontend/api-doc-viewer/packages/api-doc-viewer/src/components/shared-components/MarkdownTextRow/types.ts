import type { LayoutSide } from "@apihub/types/internal/LayoutSide"
import type {
  ChangedPropertyMetaData,
  NodeDescendantDiffs,
  NodeDiffsSeverities,
  NodeDiffsSeverityPlacemennt,
} from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { TextRowUsage } from "../TextRow/types"
import { TextValueVariant } from "../TextValue/types"
import { WithFramePositionProps } from "../Frame/types"
import { WithPrecededByProps } from "../WithPrecededByProps"

export type MarkdownTextRowProps = WithPrecededByProps & WithFramePositionProps & {
  value: string
  variant?: TextValueVariant
  usage?: TextRowUsage
  diff?: ChangedPropertyMetaData
  descendantDiffs?: NodeDescendantDiffs
  diffsSeverities?: NodeDiffsSeverities
  diffsSeverityPlacement?: NodeDiffsSeverityPlacemennt
  hideLevelIndicatorWhenSideEmpty?: boolean
}

export type MarkdownTextRowContentProps = MarkdownTextRowProps & {
  layoutSide: LayoutSide
}

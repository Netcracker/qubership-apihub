import type { LayoutSide } from "@apihub/types/internal/LayoutSide"
import type { ChangedPropertyMetaData, NodeDescendantDiffs, NodeDiffsSeverities, NodeDiffsSeverityPlacemennt } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { TextValueVariant } from "../TextValue/types"
import { WithPrecededByProps } from "../WithPrecededByProps"

export enum TextRowUsage {
  Default = 'default',
  DdlApiProperty = 'ddlapi-property',
}

export type TextRowProps = WithPrecededByProps & {
  value?: string // Document Mode
  variant: TextValueVariant
  label?: string
  textFontWeight?: 'normal' | 'medium' | 'bold'
  labelFontWeight?: 'normal' | 'medium' | 'bold'
  labelColor?: string
  textColor?: string
  usage?: TextRowUsage
  // diffs
  diff?: ChangedPropertyMetaData
  descendantDiffs?: NodeDescendantDiffs
  diffsSeverities?: NodeDiffsSeverities
  diffsSeverityPlacement?: NodeDiffsSeverityPlacemennt
}

export type TextRowContentProps = TextRowProps & {
  layoutSide: LayoutSide
}

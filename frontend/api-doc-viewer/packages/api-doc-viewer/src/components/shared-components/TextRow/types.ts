import type { LayoutSide } from "@apihub/types/internal/LayoutSide"
import type { ReactElement } from "react"
import type { ChangedPropertyMetaData, NodeDescendantDiffs, NodeDiffsSeverities, NodeDiffsSeverityPlacemennt } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { TextValueVariant } from "../TextValue/types"
import { WithFramePositionProps } from "../Frame/types"
import { WithPrecededByProps } from "../WithPrecededByProps"

export enum TextRowUsage {
  Default = 'default',
  DdlApiProperty = 'ddlapi-property',
  /** JsonSchemaViewer description and deprecation-reason typography. */
  JsonSchemaDescription = 'json-schema-description',
}

export type TextRowProps = WithPrecededByProps & WithFramePositionProps & {
  value?: string // Document Mode
  variant: TextValueVariant
  label?: string
  textFontWeight?: 'normal' | 'medium' | 'bold'
  labelFontWeight?: 'normal' | 'medium' | 'bold'
  labelColor?: string
  textColor?: string
  usage?: TextRowUsage
  /** Content after the value, per side (OpenAPI: the deprecated tag on the operation ID row). */
  trailing?: (layoutSide: LayoutSide) => ReactElement | null
  // diffs
  diff?: ChangedPropertyMetaData
  descendantDiffs?: NodeDescendantDiffs
  diffsSeverities?: NodeDiffsSeverities
  diffsSeverityPlacement?: NodeDiffsSeverityPlacemennt
  hideLevelIndicatorWhenSideEmpty?: boolean
}

export type TextRowContentProps = TextRowProps & {
  layoutSide: LayoutSide
}

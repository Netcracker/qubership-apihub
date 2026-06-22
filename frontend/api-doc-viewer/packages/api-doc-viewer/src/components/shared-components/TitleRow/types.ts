import type { LayoutSide } from "@apihub/types/internal/LayoutSide"
import type {
  ChangedPropertyMetaData,
  DiffHighlightingApplicationMode, DiffHiglightingApplicationArea,
  NodeDescendantDiffs,
  NodeDiffsSeverities
} from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import type { ReactElement } from "react"
import { TextValueVariant } from "../TextValue/types"
import { WithPrecededByProps } from "../WithPrecededByProps"

export enum TitleRowUsage {
  Default = 'default',
  AsyncApiJsoSection = 'async-api-jso-section',
  JsoProperty = 'jso-property',
}

export type TitleRowProps = WithPrecededByProps & {
  value?: string // Document Mode
  expandable: boolean
  expanded?: boolean
  onClickExpander?: () => void
  variant: TextValueVariant
  enableHeader?: boolean
  enableHeaderValue?: boolean
  subheader?: (layoutSide: LayoutSide) => ReactElement
  usage?: TitleRowUsage
  highlightingMode?: Map<DiffHiglightingApplicationArea, DiffHighlightingApplicationMode>
  // diffs
  diff?: ChangedPropertyMetaData
  descendantDiffs?: NodeDescendantDiffs
  diffsSeverities?: NodeDiffsSeverities
}

export type TitleRowContentProps = TitleRowProps & {
  layoutSide: LayoutSide
}

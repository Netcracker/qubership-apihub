import { LayoutSide } from "@apihub/types/internal/LayoutSide"
import type {
  ChangedPropertyMetaData,
  NodeDiffsSeverities,
} from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import type { ReactElement } from "react"
import { WithDdlListLastRowProps, WithPrecededByProps } from "../../shared-components/WithPrecededByProps"

export type AdditionalInfoRowProps = WithPrecededByProps & WithDdlListLastRowProps & {
  label: string
  subheader?: (layoutSide: LayoutSide) => ReactElement
  diff?: ChangedPropertyMetaData
  colorizingDiff?: ChangedPropertyMetaData
  diffsSeverities?: NodeDiffsSeverities
  hideLevelIndicatorWhenSideEmpty?: boolean
}

export type AdditionalInfoRowContentProps = AdditionalInfoRowProps & {
  layoutSide: LayoutSide
}

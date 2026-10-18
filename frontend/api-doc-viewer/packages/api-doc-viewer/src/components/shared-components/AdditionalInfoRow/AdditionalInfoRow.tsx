import { useLayoutMode } from "@apihub/contexts/LayoutModeContext"
import { CHANGED_LAYOUT_SIDE, ORIGIN_LAYOUT_SIDE } from "@apihub/types/internal/LayoutSide"
import { DOCUMENT_LAYOUT_MODE, SIDE_BY_SIDE_DIFFS_LAYOUT_MODE } from "@apihub/types/LayoutMode"
import { buildDiffCauseByPathCausedAt } from "@apihub/utils/common/changes"
import { NodeDiffsSeverityPlacemennt } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { FC, memo, useMemo } from "react"
import { DiffFloatingBadgeWrapper } from "../DiffFloatingBadgeWrapper/DiffFloatingBadgeWrapper"
import { OneSideLayout } from "../Layout/OneSideLayout"
import { SideBySideLayout } from "../Layout/SideBySideLayout"
import "../../shared-styles/preceded-by.css"
import { AdditionalInfoRowContent } from "./AdditionalInfoRowContent"
import { AdditionalInfoRowProps } from "./types"

export const AdditionalInfoRow: FC<AdditionalInfoRowProps> = memo<AdditionalInfoRowProps>((props) => {
  const layoutMode = useLayoutMode()
  const diffsSeverityPlacement = props.diffsSeverityPlacement ?? NodeDiffsSeverityPlacemennt.AdditionalInfoRow
  const diffSeverityRecord = props.diffsSeverities?.[diffsSeverityPlacement]
  const diffTypeCause = useMemo(
    () => buildDiffCauseByPathCausedAt(diffSeverityRecord?.causedAt),
    [diffSeverityRecord?.causedAt],
  )

  switch (layoutMode) {
    case SIDE_BY_SIDE_DIFFS_LAYOUT_MODE:
      return (
        <DiffFloatingBadgeWrapper
          diffType={diffSeverityRecord?.type}
          diffTypeCause={diffTypeCause}
          hidden={false}
        >
          <SideBySideLayout
            left={<AdditionalInfoRowContent {...props} layoutSide={ORIGIN_LAYOUT_SIDE} />}
            right={<AdditionalInfoRowContent {...props} layoutSide={CHANGED_LAYOUT_SIDE} />}
          />
        </DiffFloatingBadgeWrapper>
      )
    case DOCUMENT_LAYOUT_MODE:
      return (
        <OneSideLayout
          content={<AdditionalInfoRowContent {...props} layoutSide={CHANGED_LAYOUT_SIDE} />}
        />
      )
  }

  return (
    <div style={{ fontSize: 12, marginTop: 4, marginBottom: 4 }}>
      This layout mode ({layoutMode}) is not supported.
    </div>
  )
})

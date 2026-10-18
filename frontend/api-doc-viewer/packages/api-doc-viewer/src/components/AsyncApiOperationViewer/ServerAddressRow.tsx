import { useLayoutMode } from "@apihub/contexts/LayoutModeContext"
import { CHANGED_LAYOUT_SIDE, LayoutSide, ORIGIN_LAYOUT_SIDE } from "@apihub/types/internal/LayoutSide"
import { DOCUMENT_LAYOUT_MODE, SIDE_BY_SIDE_DIFFS_LAYOUT_MODE } from "@apihub/types/LayoutMode"
import { buildDiffCauseByPathCausedAt } from "@apihub/utils/common/changes"
import { ChangedPropertyMetaData, NodeDescendantDiffs, NodeDiffsSeverities } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { FC, memo, ReactElement, useMemo } from "react"
import { DiffFloatingBadgeWrapper } from "../shared-components/DiffFloatingBadgeWrapper/DiffFloatingBadgeWrapper"
import { OneSideLayout } from "../shared-components/Layout/OneSideLayout"
import { SideBySideLayout } from "../shared-components/Layout/SideBySideLayout"

export type RenderFunction = (layoutSide: LayoutSide) => ReactElement | null

export type ServerAddressRowProps = {
  renderAddress: RenderFunction
  // diffs
  diff?: ChangedPropertyMetaData
  descendantDiffs?: NodeDescendantDiffs
  diffsSeverities?: NodeDiffsSeverities
}

export const ServerAddressRow: FC<ServerAddressRowProps> = memo<ServerAddressRowProps>((props) => {
  const { renderAddress } = props

  // diffs
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { diff, descendantDiffs, diffsSeverities } = props

  const diffSeverityRecord = useMemo(() => diffsSeverities?.["server-address-row"], [diffsSeverities])
  const diffType = useMemo(() => diffSeverityRecord?.type, [diffSeverityRecord])
  const diffTypeCause = useMemo(
    () => buildDiffCauseByPathCausedAt(diffSeverityRecord?.causedAt),
    [diffSeverityRecord]
  )

  const layoutMode = useLayoutMode()

  switch (layoutMode) {
    case SIDE_BY_SIDE_DIFFS_LAYOUT_MODE:
      return (
        <DiffFloatingBadgeWrapper
          diffType={diffType}
          diffTypeCause={diffTypeCause}
          hidden={false} // TODO: Implement diffs severities filters
        >
          <SideBySideLayout
            left={renderAddress(ORIGIN_LAYOUT_SIDE)}
            right={renderAddress(CHANGED_LAYOUT_SIDE)}
          />
        </DiffFloatingBadgeWrapper>

      )
    case DOCUMENT_LAYOUT_MODE:
      return (
        <OneSideLayout
          content={
            renderAddress(CHANGED_LAYOUT_SIDE)
          }
        />
      )
  }

  return null
})

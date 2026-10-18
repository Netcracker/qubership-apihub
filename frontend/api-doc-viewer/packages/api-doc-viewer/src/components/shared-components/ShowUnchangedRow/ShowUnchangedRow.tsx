import { useLayoutMode } from "@apihub/contexts/LayoutModeContext"
import { useLevelContext } from "@apihub/contexts/LevelContext"
import { DOCUMENT_LAYOUT_MODE, SIDE_BY_SIDE_DIFFS_LAYOUT_MODE } from "@apihub/types/LayoutMode"
import { NodeId } from "@netcracker/qubership-apihub-next-data-model/utility-types"
import { FC, memo } from "react"
import { OneSideLayout } from "../Layout/OneSideLayout"
import { SideBySideLayout } from "../Layout/SideBySideLayout"
import { WithPrecededByProps } from "../WithPrecededByProps"
import { ShowUnchangedRowContent } from "./ShowUnchangedRowContent"

export type ShowUnchangedRowProps = WithPrecededByProps & {
  unchangedBlockId: NodeId
  count: number
  onReveal: (unchangedBlockId: NodeId) => void
}

export const ShowUnchangedRow: FC<ShowUnchangedRowProps> = memo((props) => {
  const layoutMode = useLayoutMode()
  const level = useLevelContext()

  switch (layoutMode) {
    case SIDE_BY_SIDE_DIFFS_LAYOUT_MODE:
      return (
        <SideBySideLayout
          left={<ShowUnchangedRowContent {...props} layoutSide="before" level={level} />}
          right={<ShowUnchangedRowContent {...props} layoutSide="after" level={level} />}
        />
      )
    case DOCUMENT_LAYOUT_MODE:
      return (
        <OneSideLayout
          content={<ShowUnchangedRowContent {...props} layoutSide="after" level={level} />}
        />
      )
    default:
      return null
  }
})

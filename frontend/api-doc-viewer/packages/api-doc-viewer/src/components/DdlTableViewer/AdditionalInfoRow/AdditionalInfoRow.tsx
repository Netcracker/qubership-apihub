import { useLayoutMode } from "@apihub/contexts/LayoutModeContext"
import { CHANGED_LAYOUT_SIDE, ORIGIN_LAYOUT_SIDE } from "@apihub/types/internal/LayoutSide"
import { DOCUMENT_LAYOUT_MODE, SIDE_BY_SIDE_DIFFS_LAYOUT_MODE } from "@apihub/types/LayoutMode"
import { FC, memo } from "react"
import { OneSideLayout } from "../../shared-components/Layout/OneSideLayout"
import { SideBySideLayout } from "../../shared-components/Layout/SideBySideLayout"
import { AdditionalInfoRowContent } from "./AdditionalInfoRowContent"
import { AdditionalInfoRowProps } from "./types"

export const AdditionalInfoRow: FC<AdditionalInfoRowProps> = memo<AdditionalInfoRowProps>((props) => {
  const layoutMode = useLayoutMode()

  switch (layoutMode) {
    case SIDE_BY_SIDE_DIFFS_LAYOUT_MODE:
      return (
        <SideBySideLayout
          left={<AdditionalInfoRowContent {...props} layoutSide={ORIGIN_LAYOUT_SIDE} />}
          right={<AdditionalInfoRowContent {...props} layoutSide={CHANGED_LAYOUT_SIDE} />}
        />
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

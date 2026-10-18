import { useLayoutMode } from "@apihub/contexts/LayoutModeContext"
import { CHANGED_LAYOUT_SIDE, ORIGIN_LAYOUT_SIDE } from "@apihub/types/internal/LayoutSide"
import { DOCUMENT_LAYOUT_MODE, SIDE_BY_SIDE_DIFFS_LAYOUT_MODE } from "@apihub/types/LayoutMode"
import { buildDiffCauseByPathCausedAt } from "@apihub/utils/common/changes"
import { FC, memo, useMemo } from "react"
import { DiffFloatingBadgeWrapper } from "../DiffFloatingBadgeWrapper/DiffFloatingBadgeWrapper"
import { OneSideLayout } from "../Layout/OneSideLayout"
import { SideBySideLayout } from "../Layout/SideBySideLayout"
import { TitleRowContent } from "./TitleRowContent"
import type { TitleRowProps } from "./types"

export const TitleRow: FC<TitleRowProps> = memo<TitleRowProps>(props => {
  const layoutMode = useLayoutMode()

  const { diff, diffsSeverities, enableHeaderValue } = props

  const diffSeverityRecord = useMemo(() => diffsSeverities?.["title-row"], [diffsSeverities])
  const diffType = useMemo(() => diffSeverityRecord?.type, [diffSeverityRecord])
  const diffTypeCause = useMemo(
    () => buildDiffCauseByPathCausedAt(diffSeverityRecord?.causedAt),
    [diffSeverityRecord]
  )

  switch (layoutMode) {
    case SIDE_BY_SIDE_DIFFS_LAYOUT_MODE:
      return (
        <DiffFloatingBadgeWrapper
          diffType={diffType}
          diffTypeCause={diffTypeCause}
          hidden={false} // TODO: Implement diffs severities filters
        >
          <SideBySideLayout
            left={
              <TitleRowContent
                {...props}
                enableHeader={diff?.styles.before.isHeaderVisible ?? true}
                enableHeaderValue={enableHeaderValue}
                layoutSide={ORIGIN_LAYOUT_SIDE}
              />
            }
            right={
              <TitleRowContent
                {...props}
                enableHeader={diff?.styles.after.isHeaderVisible ?? true}
                enableHeaderValue={enableHeaderValue}
                layoutSide={CHANGED_LAYOUT_SIDE}
              />}
          />
        </DiffFloatingBadgeWrapper>
      )
    case DOCUMENT_LAYOUT_MODE:
      return (
        <OneSideLayout
          content={<TitleRowContent {...props} layoutSide={CHANGED_LAYOUT_SIDE} />}
        />
      )
  }

  return (
    <div style={{ fontSize: 12, marginTop: 4, marginBottom: 4 }}>
      This layout mode ({layoutMode}) is not supported.
    </div>
  )
})

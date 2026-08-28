import { X_AXIS_PADDING_ROWS_ASYNC_API } from "@apihub/components/shared-styles/tailwind-classnames"
import { useLayoutMode } from "@apihub/contexts/LayoutModeContext"
import { takeDiffSideTextHighlighterColor } from "@apihub/utils/diffs/take-diff-side-text-highlighter-color"
import { CHANGED_LAYOUT_SIDE, LayoutSide, ORIGIN_LAYOUT_SIDE } from "@apihub/types/internal/LayoutSide"
import { DOCUMENT_LAYOUT_MODE, SIDE_BY_SIDE_DIFFS_LAYOUT_MODE } from "@apihub/types/LayoutMode"
import { buildDiffCauseByPathCausedAt } from "@apihub/utils/common/changes"
import {
  ChangedPropertyMetaData,
  NodeDiffsSeverities,
} from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { DiffsClassesBuilder } from "@netcracker/qubership-apihub-next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/utilities"
import { NodeDiffsSeverityPlacemennt } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { FC, memo, useMemo } from "react"
import { DiffFloatingBadgeWrapper } from "../../shared-components/DiffFloatingBadgeWrapper/DiffFloatingBadgeWrapper"
import { OneSideLayout } from "../../shared-components/Layout/OneSideLayout"
import { SideBySideLayout } from "../../shared-components/Layout/SideBySideLayout"
import { ATTRIBUTE_PRECEDED_BY, WithPrecededByProps } from "../../shared-components/WithPrecededByProps"
import { DEFAULT_SCHEMA_NAME } from "../consts"
import '../../shared-styles/preceded-by.css'
import './DdlSchemaNameBlock.css'

type DdlSchemaNameBlockWithDiffsProps = WithPrecededByProps & {
  schemaName: string
  layoutSide: LayoutSide
  diff?: ChangedPropertyMetaData
}

const DdlSchemaNameBlockSideContent: FC<DdlSchemaNameBlockWithDiffsProps> = memo((props) => {
  const { schemaName, layoutSide, diff, [ATTRIBUTE_PRECEDED_BY]: precededBy } = props

  const diffsStyleClasses = useMemo(() => {
    if (!diff) {
      return []
    }
    const { data, styles } = diff
    if (!data) {
      return []
    }
    const classes: string[] = []
    if (layoutSide === ORIGIN_LAYOUT_SIDE) {
      classes.push(DiffsClassesBuilder.background(styles.before.backgroundColor))
    }
    if (layoutSide === CHANGED_LAYOUT_SIDE) {
      classes.push(DiffsClassesBuilder.background(styles.after.backgroundColor))
    }
    return classes
  }, [diff, layoutSide])

  const textHighlighterColor = takeDiffSideTextHighlighterColor(diff, layoutSide)
  const sideStyles = layoutSide === ORIGIN_LAYOUT_SIDE ? diff?.styles.before : diff?.styles.after
  if (sideStyles?.isContentVisible === false) {
    return (
      <div
        data-precededby={precededBy}
        className={`ddl-schema-name-block-row flex h-full ${X_AXIS_PADDING_ROWS_ASYNC_API} ${diffsStyleClasses.join(' ')}`}
      />
    )
  }

  return (
    <div
      data-precededby={precededBy}
      className={`ddl-schema-name-block-row flex h-full ${X_AXIS_PADDING_ROWS_ASYNC_API} ${diffsStyleClasses.join(' ')}`}
    >
      <span
        className={`ddl-schema-name-block ${textHighlighterColor ? DiffsClassesBuilder.highlighter(textHighlighterColor) : ''}`}
      >
        {schemaName}
      </span>
    </div>
  )
})

type DdlSchemaNameBlockWithDiffsContainerProps = WithPrecededByProps & {
  resolveSchemaName: (layoutSide: LayoutSide) => string
  diff?: ChangedPropertyMetaData
  diffsSeverities?: NodeDiffsSeverities
}

export const DdlSchemaNameBlockWithDiffs: FC<DdlSchemaNameBlockWithDiffsContainerProps> = (props) => {
  const {
    resolveSchemaName,
    diff,
    diffsSeverities,
    [ATTRIBUTE_PRECEDED_BY]: precededBy,
  } = props

  const layoutMode = useLayoutMode()
  const mergedSchemaName = resolveSchemaName(CHANGED_LAYOUT_SIDE)

  if (mergedSchemaName === DEFAULT_SCHEMA_NAME && !diff) {
    return null
  }

  const diffSeverityRecord = diffsSeverities?.[NodeDiffsSeverityPlacemennt.DescriptionRow]
  const diffType = diffSeverityRecord?.type
  const diffTypeCause = buildDiffCauseByPathCausedAt(diffSeverityRecord?.causedAt)

  const sideProps = (layoutSide: LayoutSide): DdlSchemaNameBlockWithDiffsProps => ({
    schemaName: resolveSchemaName(layoutSide),
    layoutSide,
    diff,
    [ATTRIBUTE_PRECEDED_BY]: precededBy,
  })

  switch (layoutMode) {
    case SIDE_BY_SIDE_DIFFS_LAYOUT_MODE:
      return (
        <DiffFloatingBadgeWrapper
          diffType={diffType}
          diffTypeCause={diffTypeCause}
          hidden={false}
        >
          <SideBySideLayout
            left={<DdlSchemaNameBlockSideContent {...sideProps(ORIGIN_LAYOUT_SIDE)} />}
            right={<DdlSchemaNameBlockSideContent {...sideProps(CHANGED_LAYOUT_SIDE)} />}
          />
        </DiffFloatingBadgeWrapper>
      )
    case DOCUMENT_LAYOUT_MODE:
      return (
        <OneSideLayout
          content={<DdlSchemaNameBlockSideContent {...sideProps(CHANGED_LAYOUT_SIDE)} />}
        />
      )
    default:
      return null
  }
}

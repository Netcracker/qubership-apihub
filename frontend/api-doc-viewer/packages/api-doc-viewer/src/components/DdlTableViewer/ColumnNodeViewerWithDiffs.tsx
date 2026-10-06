import { useDisplayMode } from "@apihub/contexts/DisplayModeContext"
import { resolveDiffSideStyle } from "@apihub/utils/diffs/resolve-diff-side-style"
import { takeColumnFlagDiffs, takeColumnForeignKeyTargetDiffs } from "@apihub/utils/ddlapi/column-row-badges"
import {
  buildDdlPropertyTitleRowDiffProps,
  takeNodeDiffIfPresent,
} from "@apihub/utils/ddlapi/node-level-diff"
import { LayoutSide } from "@apihub/types/internal/LayoutSide"
import { NODE_LEVEL_DIFF_KEY } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import {
  DdlApiRowDiffs,
} from "@netcracker/qubership-apihub-next-data-model/model/ddlapi/tree-with-diffs/property-row-diffs"
import {
  resolveColumnAdditionalInfoRowUsesAfterRowPrecededBy,
  resolveColumnGeneratedExpressionSideDisplay,
  resolveColumnListLastRowFlags,
  resolveColumnNodeVisibility,
} from "@netcracker/qubership-apihub-next-data-model/model/ddlapi/tree-with-diffs/node-visibility/kind-column"
import { DdlApiTreeNodeWithDiffs } from "@netcracker/qubership-apihub-next-data-model/model/ddlapi/types/aliases"
import { DdlApiTreeNodeKinds } from "@netcracker/qubership-apihub-next-data-model/model/ddlapi/types/node-kind"
import { FC, useCallback, useMemo } from "react"
import { TextRow } from "../shared-components/TextRow/TextRow"
import { DEFAULT_LONG_TEXT_COLOR } from "../shared-components/TextRow/consts"
import { TextRowUsage } from "../shared-components/TextRow/types"
import { TextValueVariant } from "../shared-components/TextValue/types"
import { TitleRow } from "../shared-components/TitleRow/TitleRow"
import { TitleRowProps, TitleRowUsage } from "../shared-components/TitleRow/types"
import { ATTRIBUTE_DDL_LIST_LAST_ROW, ATTRIBUTE_PRECEDED_BY, PrecededBy, WithPrecededByProps } from "../shared-components/WithPrecededByProps"
import { ColumnRowBadgesContent } from "./ColumnRowBadges/ColumnRowBadgesContent"
import {
  ADDITIONAL_INFO_LABEL_DEFAULT,
  ADDITIONAL_INFO_LABEL_GENERATED,
  ADDITIONAL_INFO_LABEL_VALUES,
} from "./consts"
import { ColumnTypeLabelWithDiffs } from "./ColumnTypeLabelWithDiffs/ColumnTypeLabelWithDiffs"
import { AdditionalInfoRow } from "@apihub/components/shared-components/AdditionalInfoRow/AdditionalInfoRow"
import { AdditionalInfoRowUsage } from "@apihub/components/shared-components/AdditionalInfoRow/types"
import { AdditionalInfoPiece } from "@apihub/components/shared-components/AdditionalInfoPiece/AdditionalInfoPiece"
import { AdditionalInfoPieceUsage } from "@apihub/components/shared-components/AdditionalInfoPiece/types"

type ColumnNodeViewerWithDiffsProps = WithPrecededByProps & {
  node: DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.COLUMN>
  additionalInfoPrecededBy?: PrecededBy
  isLastInList?: boolean
  hideLevelIndicatorWhenSideEmpty?: boolean
}

export const ColumnNodeViewerWithDiffs: FC<ColumnNodeViewerWithDiffsProps> = (props) => {
  const {
    node,
    additionalInfoPrecededBy = PrecededBy.DDL_COLUMN_ROW,
    isLastInList = false,
    hideLevelIndicatorWhenSideEmpty = false,
    [ATTRIBUTE_PRECEDED_BY]: precededBy,
  } = props

  const displayMode = useDisplayMode()
  const value = node.value()

  const nodeDiff = useMemo(() => takeNodeDiffIfPresent(node), [node])

  const titleRowDiffProps: Pick<TitleRowProps, "diff" | "descendantDiffs" | "diffsSeverities" | "highlightingMode"> =
    useMemo(() => buildDdlPropertyTitleRowDiffProps(node), [node])

  const flagDiffs = useMemo(() => takeColumnFlagDiffs(node), [node])
  const foreignKeyTargetDiffs = useMemo(() => takeColumnForeignKeyTargetDiffs(node), [node])
  const descriptionDiff = useMemo(
    () => DdlApiRowDiffs.Column.takeDescriptionDiff(node),
    [node],
  )
  const generatedExpressionDiff = useMemo(
    () => DdlApiRowDiffs.Column.takeGeneratedExpressionDiff(node),
    [node],
  )
  const enumValueDiffs = useMemo(
    () => DdlApiRowDiffs.ColumnEnumValues.takeDiffs(node),
    [node],
  )
  const enumValuesRowColorizingDiff = useMemo(
    () => DdlApiRowDiffs.ColumnEnumValues.takeRowColorizingDiff(node),
    [node],
  )
  const defaultValueDiff = useMemo(
    () => DdlApiRowDiffs.ColumnDefaultValue.takeDiff(node),
    [node],
  )
  const defaultValueRowColorizingDiff = useMemo(
    () => DdlApiRowDiffs.ColumnDefaultValue.takeRowColorizingDiff(node),
    [node],
  )

  const visibility = useMemo(
    () => resolveColumnNodeVisibility(node, displayMode),
    [node, displayMode],
  )
  const listLastRowFlags = useMemo(
    () => resolveColumnListLastRowFlags(isLastInList, visibility),
    [isLastInList, visibility],
  )

  const subheader = useCallback(
    (layoutSide: LayoutSide) => {
      if (!value) {
        return <></>
      }

      if (!DdlApiRowDiffs.PropertyRow.isSubheaderVisible(nodeDiff, layoutSide)) {
        return <></>
      }

      return (
        <div className="flex flex-wrap items-center gap-2">
          <ColumnTypeLabelWithDiffs
            node={node}
            layoutSide={layoutSide}
          />
          <ColumnRowBadgesContent
            columnId={node.id}
            layoutSide={layoutSide}
            value={value}
            flagDiffs={flagDiffs}
            foreignKeyTargetDiffs={foreignKeyTargetDiffs}
          />
        </div>
      )
    },
    [flagDiffs, foreignKeyTargetDiffs, node, nodeDiff, value],
  )

  const defaultAdditionalInfoSubheader = useCallback(
    (layoutSide: LayoutSide) => {
      const defaultValue = DdlApiRowDiffs.ColumnDefaultValue.resolveSideDisplay(node, layoutSide)
      if (defaultValue === undefined) {
        return <></>
      }

      const style = resolveDiffSideStyle(defaultValueDiff, layoutSide)
      return (
        <AdditionalInfoPiece
          isVisible={true}
          value={defaultValue}
          textHighlighterColor={style.textHighlighterColor}
          borderShadowColor={style.borderShadowColor}
        />
      )
    },
    [defaultValueDiff, node],
  )

  const generatedAdditionalInfoSubheader = useCallback(
    (layoutSide: LayoutSide) => {
      const generatedExpression = resolveColumnGeneratedExpressionSideDisplay(node, layoutSide)
      if (generatedExpression === undefined) {
        return <></>
      }

      const style = resolveDiffSideStyle(generatedExpressionDiff, layoutSide)
      return (
        <AdditionalInfoPiece
          isVisible={true}
          value={generatedExpression}
          textHighlighterColor={style.textHighlighterColor}
        />
      )
    },
    [generatedExpressionDiff, node],
  )

  const enumValuesAdditionalInfoSubheader = useCallback(
    (layoutSide: LayoutSide) => {
      const sideItems = DdlApiRowDiffs.ColumnEnumValues.resolveSideItems(node, layoutSide)
      if (sideItems.length === 0) {
        return <></>
      }

      return (
        <div className="flex flex-wrap items-center gap-2">
          {sideItems.map((sideItem, index) => {
            const style = resolveDiffSideStyle(sideItem.diff, layoutSide)
            return (
              <AdditionalInfoPiece
                key={`${sideItem.literal}-${index}`}
                isVisible={true}
                value={sideItem.literal}
                textHighlighterColor={style.textHighlighterColor}
                borderShadowColor={style.borderShadowColor}
                isFontMuted={style.isFontMuted}
              />
            )
          })}
        </div>
      )
    },
    [node],
  )

  if (!value) {
    return null
  }

  return (
    <div data-testid="ddl-column-node-viewer" className="flex flex-col ddlapi-property">
      <TitleRow
        data-precededby={precededBy}
        {...{ [ATTRIBUTE_DDL_LIST_LAST_ROW]: listLastRowFlags.isTitleListLastRow || undefined }}
        value={value.columnName}
        expandable={false}
        expanded={true}
        variant={TextValueVariant.body2}
        subheader={subheader}
        usage={TitleRowUsage.DdlApiProperty}
        hideLevelIndicatorWhenSideEmpty={hideLevelIndicatorWhenSideEmpty}
        {...titleRowDiffProps}
      />
      {visibility.showDescription && (
        <TextRow
          data-precededby={PrecededBy.DDL_COLUMN_ROW}
          {...{ [ATTRIBUTE_DDL_LIST_LAST_ROW]: listLastRowFlags.isDescriptionListLastRow || undefined }}
          value={value.description ?? ''}
          variant={TextValueVariant.body2}
          textFontWeight="normal"
          textColor={DEFAULT_LONG_TEXT_COLOR}
          usage={TextRowUsage.DdlApiProperty}
          diff={descriptionDiff}
          diffsSeverities={node.diffsSeverities}
          hideLevelIndicatorWhenSideEmpty={hideLevelIndicatorWhenSideEmpty}
        />
      )}
      {visibility.showEnumValuesRow && (
        <AdditionalInfoRow
          usage={AdditionalInfoRowUsage.DdlApiProperty}
          data-precededby={additionalInfoPrecededBy}
          {...{ [ATTRIBUTE_DDL_LIST_LAST_ROW]: listLastRowFlags.isEnumAdditionalInfoListLastRow || undefined }}
          label={ADDITIONAL_INFO_LABEL_VALUES}
          subheader={enumValuesAdditionalInfoSubheader}
          colorizingDiff={enumValuesRowColorizingDiff}
          diffsSeverities={enumValueDiffs || enumValuesRowColorizingDiff ? node.diffsSeverities : undefined}
          hideLevelIndicatorWhenSideEmpty={hideLevelIndicatorWhenSideEmpty}
        />
      )}
      {visibility.showDefaultRow && (
        <AdditionalInfoRow
          usage={AdditionalInfoRowUsage.DdlApiProperty}
          data-precededby={
            resolveColumnAdditionalInfoRowUsesAfterRowPrecededBy(visibility, "default")
              ? PrecededBy.DDL_COLUMN_AFTER_ADDITIONAL_INFO_ROW
              : additionalInfoPrecededBy
          }
          {...{ [ATTRIBUTE_DDL_LIST_LAST_ROW]: listLastRowFlags.isDefaultAdditionalInfoListLastRow || undefined }}
          label={ADDITIONAL_INFO_LABEL_DEFAULT}
          subheader={defaultAdditionalInfoSubheader}
          colorizingDiff={defaultValueRowColorizingDiff}
          diffsSeverities={defaultValueDiff || defaultValueRowColorizingDiff ? node.diffsSeverities : undefined}
          hideLevelIndicatorWhenSideEmpty={hideLevelIndicatorWhenSideEmpty}
        />
      )}
      {visibility.showGeneratedRow && (
        <AdditionalInfoRow
          usage={AdditionalInfoRowUsage.DdlApiProperty}
          data-precededby={
            resolveColumnAdditionalInfoRowUsesAfterRowPrecededBy(visibility, "generated")
              ? PrecededBy.DDL_COLUMN_AFTER_ADDITIONAL_INFO_ROW
              : additionalInfoPrecededBy
          }
          {...{ [ATTRIBUTE_DDL_LIST_LAST_ROW]: listLastRowFlags.isGeneratedAdditionalInfoListLastRow || undefined }}
          label={ADDITIONAL_INFO_LABEL_GENERATED}
          subheader={generatedAdditionalInfoSubheader}
          diff={generatedExpressionDiff}
          colorizingDiff={node.diffs[NODE_LEVEL_DIFF_KEY]}
          diffsSeverities={node.diffsSeverities}
          hideLevelIndicatorWhenSideEmpty={hideLevelIndicatorWhenSideEmpty}
        />
      )}
    </div>
  )
}

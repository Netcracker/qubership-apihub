import { useDisplayMode } from "@apihub/contexts/DisplayModeContext"
import { LayoutSide } from "@apihub/types/internal/LayoutSide"
import { isDefined } from "@apihub/utils/common/checkers"
import {
  resolvePlainColumnAdditionalInfoRowUsesAfterRowPrecededBy,
  resolvePlainColumnListLastRowFlags,
  resolvePlainColumnNodeVisibility,
} from "@netcracker/qubership-apihub-next-data-model/model/ddlapi/tree/node-visibility/kind-column"
import { DdlApiTreeNode } from "@netcracker/qubership-apihub-next-data-model/model/ddlapi/types/aliases"
import { DdlApiTreeNodeKinds } from "@netcracker/qubership-apihub-next-data-model/model/ddlapi/types/node-kind"
import { FC, useCallback, useMemo } from "react"
import { DEFAULT_LONG_TEXT_COLOR } from "../shared-components/TextRow/consts"
import { TextRow } from "../shared-components/TextRow/TextRow"
import { TextRowUsage } from "../shared-components/TextRow/types"
import { TextValueVariant } from "../shared-components/TextValue/types"
import { TitleRow } from "../shared-components/TitleRow/TitleRow"
import { TitleRowUsage } from "../shared-components/TitleRow/types"
import { ATTRIBUTE_DDL_LIST_LAST_ROW, ATTRIBUTE_PRECEDED_BY, PrecededBy, WithPrecededByProps } from "../shared-components/WithPrecededByProps"
import { AdditionalInfoPiece } from "./AdditionalInfoPiece/AdditionalInfoPiece"
import { AdditionalInfoRow } from "./AdditionalInfoRow/AdditionalInfoRow"
import { ColumnRowBadgesContent } from "./ColumnRowBadges/ColumnRowBadgesContent"
import {
  ADDITIONAL_INFO_LABEL_DEFAULT,
  ADDITIONAL_INFO_LABEL_GENERATED,
  ADDITIONAL_INFO_LABEL_VALUES,
} from "./consts"
import { DdlApiPropertyValue } from "./DdlApiPropertyValue/DdlApiPropertyValue"

export type ColumnNodeViewerProps = WithPrecededByProps & {
  node: DdlApiTreeNode<typeof DdlApiTreeNodeKinds.COLUMN>
  additionalInfoPrecededBy?: PrecededBy
  isLastInList?: boolean
}

export const ColumnNodeViewer: FC<ColumnNodeViewerProps> = (props) => {
  const {
    node,
    additionalInfoPrecededBy = PrecededBy.DDL_COLUMN_ROW,
    isLastInList = false,
    [ATTRIBUTE_PRECEDED_BY]: precededBy,
  } = props

  const displayMode = useDisplayMode()
  const value = node.value()

  const visibility = useMemo(
    () => resolvePlainColumnNodeVisibility(node, displayMode),
    [node, displayMode],
  )
  const listLastRowFlags = useMemo(
    () => resolvePlainColumnListLastRowFlags(isLastInList, visibility),
    [isLastInList, visibility],
  )

  const subheader = useCallback(
    (_layoutSide: LayoutSide) => {
      if (!value) {
        return <></>
      }

      return (
        <div className="flex flex-wrap items-center gap-2">
          <DdlApiPropertyValue
            isVisible={true}
            value={value.columnType.label}
            appearance="text"
          />
          <ColumnRowBadgesContent
            columnId={node.id}
            layoutSide={_layoutSide}
            value={value}
          />
        </div>
      )
    },
    [node.id, value],
  )

  const defaultAdditionalInfoSubheader = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (_layoutSide: LayoutSide) => {
      const defaultValue = value?.defaultValue
      if (!isDefined(defaultValue)) {
        return <></>
      }

      return (
        <AdditionalInfoPiece
          isVisible={true}
          value={defaultValue}
        />
      )
    },
    [value],
  )

  const generatedAdditionalInfoSubheader = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (_layoutSide: LayoutSide) => {
      const generatedExpression = value?.generatedExpression
      if (!isDefined(generatedExpression)) {
        return <></>
      }

      return (
        <AdditionalInfoPiece
          isVisible={true}
          value={generatedExpression}
        />
      )
    },
    [value],
  )

  const enumValuesAdditionalInfoSubheader = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (_layoutSide: LayoutSide) => {
      if (!value?.enumValues?.length) {
        return <></>
      }

      return (
        <div className="flex flex-wrap items-center gap-2">
          {value.enumValues.map((enumValue, index) => (
            <AdditionalInfoPiece
              key={`${enumValue}-${index}`}
              isVisible={true}
              value={enumValue}
            />
          ))}
        </div>
      )
    },
    [value],
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
        />
      )}
      {visibility.showEnumValuesRow && (
        <AdditionalInfoRow
          data-precededby={additionalInfoPrecededBy}
          {...{ [ATTRIBUTE_DDL_LIST_LAST_ROW]: listLastRowFlags.isEnumAdditionalInfoListLastRow || undefined }}
          label={ADDITIONAL_INFO_LABEL_VALUES}
          subheader={enumValuesAdditionalInfoSubheader}
        />
      )}
      {visibility.showDefaultRow && (
        <AdditionalInfoRow
          data-precededby={
            resolvePlainColumnAdditionalInfoRowUsesAfterRowPrecededBy(visibility, "default")
              ? PrecededBy.DDL_COLUMN_AFTER_ADDITIONAL_INFO_ROW
              : additionalInfoPrecededBy
          }
          {...{ [ATTRIBUTE_DDL_LIST_LAST_ROW]: listLastRowFlags.isDefaultAdditionalInfoListLastRow || undefined }}
          label={ADDITIONAL_INFO_LABEL_DEFAULT}
          subheader={defaultAdditionalInfoSubheader}
        />
      )}
      {visibility.showGeneratedRow && (
        <AdditionalInfoRow
          data-precededby={
            resolvePlainColumnAdditionalInfoRowUsesAfterRowPrecededBy(visibility, "generated")
              ? PrecededBy.DDL_COLUMN_AFTER_ADDITIONAL_INFO_ROW
              : additionalInfoPrecededBy
          }
          {...{ [ATTRIBUTE_DDL_LIST_LAST_ROW]: listLastRowFlags.isGeneratedAdditionalInfoListLastRow || undefined }}
          label={ADDITIONAL_INFO_LABEL_GENERATED}
          subheader={generatedAdditionalInfoSubheader}
        />
      )}
    </div>
  )
}

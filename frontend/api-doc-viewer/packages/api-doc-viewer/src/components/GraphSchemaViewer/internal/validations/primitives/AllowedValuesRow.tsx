/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { LevelIndicator } from '@apihub/components/shared-components/LevelIndicator'
import {
  applyDiffReplaceAlias,
  IGraphSchemaEnumValueType,
  isDiff,
  isDiffMetaRecord,
  isDiffRecord,
  NodeChange,
} from '@netcracker/qubership-apihub-api-data-model'
import {
  ActionType,
  Diff,
  DiffAction,
  DiffMetaRecord,
  isDiffAdd,
  isDiffRemove,
  isDiffReplace,
} from '@netcracker/qubership-apihub-api-diff'
import type { FC } from 'react'
import { ReactNode, useMemo } from 'react'
import { NODE_DIFF_COLOR_MAP } from '../../../../../consts/changes'
import {
  DEFAULT_LAYOUT_MODE,
  DEFAULT_ROW_DEPTH,
} from '../../../../../consts/configuration'
import { AMBER_TAG_COLOR_SCHEMA, DEPRECATED_TAG } from '../../../../../consts/tags'
import { ALLOWED_VALUES_LABEL } from '../../../../../consts/validations'
import { useChangeSeverityFilters } from '../../../../../contexts/ChangeSeverityFiltersContext'
import { ContentProps } from '../../../../../types/internal/ContentProps'
import { CHANGED_LAYOUT_SIDE, ORIGIN_LAYOUT_SIDE } from '../../../../../types/internal/LayoutSide'
import { PropsWithChanges } from '../../../../../types/internal/PropsWithChanges'
import { PropsWithShift } from '../../../../../types/internal/PropsWithShift'
import { LayoutMode } from '../../../../../types/LayoutMode'
import { PropsWithoutChangesSummary } from '../../../../../types/PropsWithoutChangesSummary'
import {
  buildOpenApiDiffCause,
  diffAdd,
  diffRemove,
  getLayoutModeFlags,
  getLayoutSideFlags,
  isDiffTypeIncluded,
  maxDiffTypeFromDiffs,
} from '../../../../../utils/common/changes'
import { isDefined } from '../../../../../utils/common/checkers'
import { stringifyItem } from '../../../../../utils/common/rows'
import { AdditionalInfoArrayRow } from '../../../../common/AdditionalInfoArrayRow'
import { DeprecationReasonValue } from '../../../../common/annotations/DeprecationReasonRow'
import { DescriptionValue } from '../../../../common/annotations/Description/DescriptionRow'
import { DiffBadge } from '../../../../common/diffs/DiffBadge'
import { EmptyContent } from '../../../../common/diffs/EmptyContent'
import { UnsupportedContent } from '../../../../common/diffs/UnsupportedContent'
import { DefaultWrappers, Wrapper as Deprecation } from '../../../../common/Wrapper'
import { UxDiffFloatingBadge } from '../../../../kit/ux/UxFloatingBadge/UxDiffFloatingBadge'
import { changesToChange, isDefaultDeprecationReason, isObjectWithoutPayload } from '../../../utils'

export type AllowedValuesRowProps = PropsWithoutChangesSummary<
  PropsWithShift &
  { values?: Record<string, IGraphSchemaEnumValueType> }
  & PropsWithChanges
>

export const AllowedValuesRow: FC<AllowedValuesRowProps> = (props) => {
  const {
    shift = false,
    values = {},
    layoutMode = DEFAULT_LAYOUT_MODE,
    level = DEFAULT_ROW_DEPTH,
    $nodeChange,
    $changes,
  } = props

  const keys = Object.keys(values)
  const isSimpleValues = isObjectWithoutPayload(values)
  if (isSimpleValues) {
    const keyToIndex: Record<string, number> = keys.reduce((acc, key, index) => {
      acc[key] = index
      return acc
    }, {} as Record<string, number>)
    const $changesAsOfArray = {
      enum: {
        ...Object.entries($changes?.values ?? {}).reduce((acc, val) => {
          const [k, v] = val
          acc[keyToIndex[k]] = v
          return acc
        }, {} as DiffMetaRecord),
      },
    }
    return (
      <AdditionalInfoArrayRow
        shift={shift}
        $changesKey="enum"
        title={ALLOWED_VALUES_LABEL}
        items={keys}
        layoutMode={layoutMode}
        level={level}
        $nodeChange={$nodeChange}
        $changes={$changesAsOfArray}
        isPredefinedValuesSet={true}
      />
    )
  }

  const valuesChange = $changes?.values
  const partiallyEnumChanged = isDiffMetaRecord(valuesChange)
  const wholeEnumChange = partiallyEnumChanged ? changesToChange(keys.length, valuesChange) : undefined

  return (
    <div className="flex flex-col">
      <AllowedValuesHeaderRow
        shift={shift}
        nodeChange={$nodeChange}
        enumChange={wholeEnumChange}
        level={$nodeChange?.depth ?? level}
        layoutMode={layoutMode}
      />
      {keys.map(item => {
        const { description, deprecationReason } = values[item] ?? {}

        let descriptionChange: Diff | undefined
        let deprecationReasonChange: Diff | undefined
        const changesForCurrentEnumValue = isDiffRecord(valuesChange) ? valuesChange?.[item] : undefined
        if (isDiffRecord(changesForCurrentEnumValue)) {
          if (isDiff(changesForCurrentEnumValue.description)) {
            descriptionChange = changesForCurrentEnumValue.description
          }
          if (isDiff(changesForCurrentEnumValue.deprecationReason)) {
            deprecationReasonChange = changesForCurrentEnumValue.deprecationReason
          }
        }

        return (
          <AllowedValueRow
            key={`allowed-value-row-${item}`}
            shift={shift}
            initialValue={item}
            initialDescription={description}
            initialDeprecationReason={deprecationReason}
            nodeChange={$nodeChange}
            enumChange={wholeEnumChange}
            valueChange={isDiff(changesForCurrentEnumValue) ? changesForCurrentEnumValue : undefined}
            descriptionChange={descriptionChange}
            deprecationReasonChange={deprecationReasonChange}
            layoutMode={layoutMode}
            level={level}
          />
        )
      })}
    </div>
  )
}

type AllowedValuesHeaderRowProps = PropsWithShift & {
  nodeChange?: Diff
  enumChange?: Diff
  level: number
  layoutMode: LayoutMode
}

const AllowedValuesHeaderRowContent: FC<AllowedValuesHeaderRowProps & ContentProps> = (props) => {
  const {
    shift = false,
    nodeChange,
    enumChange,
    level,
    layoutMode,
    layoutSide,
  } = props

  const { isSideBySideDiffsLayoutMode } = getLayoutModeFlags(layoutMode)
  const { originSide, changedSide } = getLayoutSideFlags(layoutSide)

  const width = isSideBySideDiffsLayoutMode ? 'w-1/2' : 'w-full'
  const rowClasses = [
    'flex flex-row',
    !shift && 'gap-5',
    width,
  ].filter(Boolean).join(' ')

  const change = nodeChange ?? enumChange

  let labelNode: ReactNode | null = null

  if (
    !change ||
    !isSideBySideDiffsLayoutMode || (
      diffAdd(change) && changedSide ||
      diffRemove(change) && originSide
    )
  ) {
    labelNode = (
      <div className="inline text-xs font-normal text-slate-500 pt-1">
        {ALLOWED_VALUES_LABEL}:
      </div>
    )
  }

  return (
    <div className={rowClasses}>
      <LevelIndicator level={level} />
      {shift && <div className="w-5" />}
      {labelNode}
    </div>
  )
}

const AllowedValuesHeaderRow: FC<AllowedValuesHeaderRowProps> = (props) => {
  const {
    shift = false,
    nodeChange,
    enumChange,
    level,
    layoutMode,
  } = props

  const filters = useChangeSeverityFilters()

  const change = nodeChange ?? enumChange
  const changeType = change?.type
  const changeTypeCause = buildOpenApiDiffCause(change)
  const changeTypeIncluded = isDiffTypeIncluded(changeType, filters)

  const changeBackground = change ? NODE_DIFF_COLOR_MAP[change.action] : undefined

  const {
    isDocumentLayoutMode,
    isInlineDiffsLayoutMode,
    isSideBySideDiffsLayoutMode,
  } = getLayoutModeFlags(layoutMode)

  const contentProps: AllowedValuesHeaderRowProps = {
    shift: shift,
    nodeChange: nodeChange,
    enumChange: enumChange,
    level: level,
    layoutMode: layoutMode,
  }

  if (isDocumentLayoutMode) {
    return (
      <div className="flex flex-row">
        <AllowedValuesHeaderRowContent {...contentProps} layoutSide={ORIGIN_LAYOUT_SIDE} />
      </div>
    )
  }

  if (isInlineDiffsLayoutMode) {
    if (!nodeChange && !enumChange) {
      return (
        <div className="flex flex-row">
          <AllowedValuesHeaderRowContent {...contentProps} layoutSide={ORIGIN_LAYOUT_SIDE} />
        </div>
      )
    }

    return (
      <div className={`flex flex-row relative ${changeTypeIncluded ? changeBackground : ''}`}>
        {changeType && changeTypeIncluded && <UxDiffFloatingBadge variant={changeType} message={changeTypeCause} />}
        <AllowedValuesHeaderRowContent {...contentProps} layoutSide={ORIGIN_LAYOUT_SIDE} />
      </div>
    )
  }

  if (isSideBySideDiffsLayoutMode) {
    if (!nodeChange && !enumChange) {
      return (
        <div className="flex flex-row">
          <AllowedValuesHeaderRowContent {...contentProps} layoutSide={ORIGIN_LAYOUT_SIDE} />
          <AllowedValuesHeaderRowContent {...contentProps} layoutSide={CHANGED_LAYOUT_SIDE} />
        </div>
      )
    }

    return (
      <div className={`flex flex-row relative ${changeTypeIncluded ? changeBackground : ''}`}>
        {changeType && changeTypeIncluded && <UxDiffFloatingBadge variant={changeType} message={changeTypeCause} />}
        {!change || diffRemove(change)
          ? <AllowedValuesHeaderRowContent {...contentProps} layoutSide={ORIGIN_LAYOUT_SIDE} />
          : <EmptyContent level={level} />}
        {!change || diffAdd(change)
          ? <AllowedValuesHeaderRowContent {...contentProps} layoutSide={CHANGED_LAYOUT_SIDE} />
          : <EmptyContent level={level} />}
      </div>
    )
  }

  return <UnsupportedContent layoutMode={layoutMode} />
}

type AllowedValueRowProps = PropsWithShift & {
  initialValue: string | undefined
  initialDeprecationReason: string | undefined
  initialDescription: string | undefined
  nodeChange?: NodeChange
  enumChange?: Diff
  valueChange?: Diff
  descriptionChange?: Diff
  deprecationReasonChange?: Diff
  layoutMode: LayoutMode
  level?: number
}

const ENUM_VALUE_TEXT_PADDING_TOP = { paddingTop: 2 }

const AllowedValueRow: FC<AllowedValueRowProps> = (props) => {
  const {
    shift = false,
    initialValue,
    initialDeprecationReason,
    initialDescription,
    nodeChange,
    enumChange,
    valueChange,
    descriptionChange,
    deprecationReasonChange,
    layoutMode,
    level = DEFAULT_ROW_DEPTH,
  } = props

  const filters = useChangeSeverityFilters()

  const {
    isDocumentLayoutMode,
    isInlineDiffsLayoutMode,
    isSideBySideDiffsLayoutMode,
  } = getLayoutModeFlags(layoutMode)

  const isNodeChanged = !isDocumentLayoutMode && !!nodeChange
  const isEnumChanged = !isDocumentLayoutMode && !!enumChange

  const isItemSelfChanged =
    !isNodeChanged &&
    !isEnumChanged &&
    isDiff(valueChange)

  const isItemDetailsChanged =
    !isNodeChanged &&
    !isEnumChanged &&
    !isDiff(valueChange) && (
      !!descriptionChange ||
      !!deprecationReasonChange
    )

  const { nodeAdded, nodeRemoved, nodeReplaced } = {
    nodeAdded: isNodeChanged && isDiffAdd(nodeChange) || isEnumChanged && isDiffAdd(enumChange),
    nodeRemoved: isNodeChanged && isDiffRemove(nodeChange) || isEnumChanged && isDiffRemove(enumChange),
    nodeReplaced: isEnumChanged && isDiffReplace(enumChange),
  }

  const nodeDiffTypeData = maxDiffTypeFromDiffs(nodeChange)
  const enumDiffTypeData = maxDiffTypeFromDiffs(enumChange)
  const contentDiffTypeData =
    maxDiffTypeFromDiffs(
      valueChange,
      deprecationReasonChange,
      descriptionChange,
    )
  const [diffType, diffTypeCause] = (
    (nodeDiffTypeData[0] ? nodeDiffTypeData : undefined) ??
    (enumDiffTypeData[0] ? enumDiffTypeData : undefined) ??
    contentDiffTypeData
  )
  const diffTypeIncluded = isDiffTypeIncluded(diffType, filters)

  const diffBackgroundAction: ActionType | undefined =
    isNodeChanged
      ? nodeChange.action
      : isEnumChanged
        ? enumChange.action
        : isItemSelfChanged
          ? valueChange!.action
          : isItemDetailsChanged
            ? DiffAction.replace
            : undefined
  const diffBackground =
    diffBackgroundAction
      ? NODE_DIFF_COLOR_MAP[diffBackgroundAction]
      : undefined

  const Content: FC<ContentProps> = ({ layoutSide }) => {
    const width = isSideBySideDiffsLayoutMode ? 'w-1/2' : 'w-full'
    const rowClasses = [
      'flex flex-row',
      !shift && 'gap-5',
      width,
    ].filter(Boolean).join(' ')

    const { originSide, changedSide } = getLayoutSideFlags(layoutSide)

    const itemAdded = diffAdd(valueChange)
    const itemRemoved = diffRemove(valueChange)
    const itemDefined = isDefined(initialValue)

    let renderedItem: string | null = itemDefined ? stringifyItem(initialValue) ?? '' : ''

    if (
      isSideBySideDiffsLayoutMode && (
        itemRemoved && changedSide ||
        itemAdded && originSide
      )
    ) {
      renderedItem = null
    }

    // TODO 04.12.24 // This logic somewhere is inside component, somewhere (here) is outside
    const isDeprecated =
      initialDeprecationReason && (
        !deprecationReasonChange || (
          isDiffAdd(deprecationReasonChange) && changedSide ||
          isDiffRemove(deprecationReasonChange) && originSide ||
          isDiffReplace(deprecationReasonChange)
        )
      )

    const isDefaultReason = isDefaultDeprecationReason(initialDeprecationReason)

    const shouldDisplayReason =
      initialDeprecationReason && (
        !deprecationReasonChange && !isDefaultReason ||
        deprecationReasonChange && (
          isDiffAdd(deprecationReasonChange) && changedSide && !isDefaultReason ||
          isDiffRemove(deprecationReasonChange) && originSide && !isDefaultReason ||
          isDiffReplace(deprecationReasonChange) && (
            !isDefaultDeprecationReason(String(deprecationReasonChange.beforeValue)) && originSide ||
            !isDefaultDeprecationReason(String(deprecationReasonChange.afterValue)) && changedSide
          )
        )
      )

    const componentDiffBadge = useMemo(() => (
      isDeprecated ? (
        <DiffBadge
          key="diff-badge"
          label={DEPRECATED_TAG}
          layoutSide={layoutSide}
          layoutMode={layoutMode}
          colorSchema={AMBER_TAG_COLOR_SCHEMA}
          isNodeChanged={isNodeChanged}
          isContentChanged={isItemSelfChanged || isItemDetailsChanged}
          // here we provide "add", "remove", skip "replace"
          $changes={isItemDetailsChanged ? applyDiffReplaceAlias(undefined, deprecationReasonChange) : undefined}
        />
      ) : null
    ), [isDeprecated, layoutSide])
    const componentDeprecationReason = useMemo(() => (
      shouldDisplayReason ? (
        <div style={ENUM_VALUE_TEXT_PADDING_TOP}>
          <DeprecationReasonValue
            key="deprecation-reason-value"
            value={initialDeprecationReason}
            enableDiffs={diffTypeIncluded}
            layoutMode={layoutMode}
            layoutSide={layoutSide}
            $changes={isItemDetailsChanged ? deprecationReasonChange : undefined}
            highlightWholeDiff={!isNodeChanged && !itemAdded && !itemRemoved}
          />
        </div>
      ) : null
    ), [itemAdded, itemRemoved, layoutSide, shouldDisplayReason])
    const deprecationComponentsList = useMemo(
      () => ([componentDeprecationReason, componentDiffBadge].filter(Boolean)),
      [componentDeprecationReason, componentDiffBadge]
    )

    return (
      <div className={rowClasses}>
        <LevelIndicator level={level} />
        {shift && <div className="w-5" />}
        {renderedItem && (
          <div className="flex flex-row items-start gap-2 py-1">
            <DiffBadge
              label={renderedItem}
              layoutMode={layoutMode}
              layoutSide={layoutSide}
              isNodeChanged={isNodeChanged}
              isContentChanged={isItemSelfChanged}
              $changes={itemAdded || itemRemoved ? valueChange : undefined}
            />
            <div className="flex flex-col items-start text-xs text-slate-600 gap-1">
              {deprecationComponentsList.length > 0 && (
                <Deprecation
                  children={deprecationComponentsList}
                  wrapper={DefaultWrappers.DivGap2}
                />
              )}
              {isDefined(initialDescription) && (
                <div style={ENUM_VALUE_TEXT_PADDING_TOP}>
                  <DescriptionValue
                    value={initialDescription!}
                    // diffs
                    enableDiffs={diffTypeIncluded}
                    layoutMode={layoutMode}
                    layoutSide={layoutSide}
                    $changes={isItemDetailsChanged ? descriptionChange : undefined}
                    highlightWholeDiff={!isNodeChanged && !itemAdded && !itemRemoved}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (isDocumentLayoutMode) {
    return (
      <div className="flex flex-row">
        <Content layoutSide={CHANGED_LAYOUT_SIDE} />
      </div>
    )
  }

  if (isInlineDiffsLayoutMode) {
    if (!isNodeChanged && !isEnumChanged && !isItemSelfChanged && !isItemDetailsChanged) {
      return (
        <div className="flex flex-row">
          <Content layoutSide={ORIGIN_LAYOUT_SIDE} />
        </div>
      )
    }

    return (
      <div className={`flex flex-row relative ${diffTypeIncluded ? diffBackground : ''}`}>
        {diffType && diffTypeIncluded && <UxDiffFloatingBadge variant={diffType} message={diffTypeCause} />}
        <Content layoutSide={ORIGIN_LAYOUT_SIDE} />
      </div>
    )
  }

  if (isSideBySideDiffsLayoutMode) {
    if (!isNodeChanged && !isEnumChanged && !isItemSelfChanged && !isItemDetailsChanged) {
      return (
        <div className="flex flex-row">
          <Content layoutSide={ORIGIN_LAYOUT_SIDE} />
          <Content layoutSide={CHANGED_LAYOUT_SIDE} />
        </div>
      )
    }

    return (
      <div className={`flex flex-row relative ${diffTypeIncluded ? diffBackground : ''}`}>
        {diffType && diffTypeIncluded && <UxDiffFloatingBadge variant={diffType} message={diffTypeCause} />}
        {isItemSelfChanged || isItemDetailsChanged || (isNodeChanged || isEnumChanged) && (nodeRemoved || nodeReplaced)
          ? <Content layoutSide={ORIGIN_LAYOUT_SIDE} />
          : <EmptyContent level={nodeChange?.depth ?? level} />}
        {isItemSelfChanged || isItemDetailsChanged || (isNodeChanged || isEnumChanged) && (nodeAdded || nodeReplaced)
          ? <Content layoutSide={CHANGED_LAYOUT_SIDE} />
          : <EmptyContent level={nodeChange?.depth ?? level} />}
      </div>
    )
  }

  return <UnsupportedContent layoutMode={layoutMode} />
}

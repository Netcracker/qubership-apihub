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

import { isDiff, isObject } from "@netcracker/qubership-apihub-api-data-model"
import { Diff, DiffAction, DiffMetaRecord } from "@netcracker/qubership-apihub-api-diff"
import type { FC } from 'react'
import { DEFAULT_STRIKETHROUGH_VALUE_CLASS, NODE_DIFF_COLOR_MAP } from '../../../consts/changes'
import {
  DEFAULT_LAYOUT_MODE,
  DEFAULT_ROW_DEPTH,
  DEFAULT_ROW_PADDING_LEFT,
  SHIFTED_ROW_PADDING_LEFT
} from '../../../consts/configuration'
import { useChangeSeverityFilters } from '../../../contexts/ChangeSeverityFiltersContext'
import '../../../index.css'
import { ContentProps } from '../../../types/internal/ContentProps'
import { CHANGED_LAYOUT_SIDE, LayoutSide, ORIGIN_LAYOUT_SIDE } from '../../../types/internal/LayoutSide'
import { PropsWithChanges } from '../../../types/internal/PropsWithChanges'
import { PropsWithShift } from '../../../types/internal/PropsWithShift'
import { LayoutMode } from '../../../types/LayoutMode'
import { PropsWithoutChangesSummary } from "../../../types/PropsWithoutChangesSummary"
import {
  buildOpenApiDiffCause,
  diffRemove,
  diffReplace,
  getLayoutModeFlags,
  getLayoutSideFlags,
  isDiffTypeIncluded
} from '../../../utils/common/changes'
import { UxDiffFloatingBadge } from '../../kit/ux/UxFloatingBadge/UxDiffFloatingBadge'
import { EmptyContent } from '../diffs/EmptyContent'
import { UnsupportedContent } from '../diffs/UnsupportedContent'
import { NestingIndicator } from '../NestingIndicator'
import { GRAPH_API_DIRECTIVE_DEPRECATED_DEFAULT_REASON } from "@netcracker/qubership-apihub-graphapi"

export type DeprecationReasonRowProps = PropsWithoutChangesSummary<
  PropsWithShift &
  { value: string } &
  PropsWithChanges
>

export const DeprecationReasonRow: FC<DeprecationReasonRowProps> = (props) => {
  const {
    shift = false,
    value,
    layoutMode = DEFAULT_LAYOUT_MODE,
    level = DEFAULT_ROW_DEPTH,
    $metaChanges,
  } = props

  const filters = useChangeSeverityFilters()

  const $change = $metaChanges?.deprecationReason as Diff
  const $action = $change?.action

  const { isDocumentLayoutMode, isInlineDiffsLayoutMode, isSideBySideDiffsLayoutMode } = getLayoutModeFlags(layoutMode)
  const isContentChanged = !!$action
  const { itemAdded, itemReplaced, itemRemoved } = {
    itemAdded: $action === DiffAction.add,
    itemReplaced: $action === DiffAction.replace,
    itemRemoved: $action === DiffAction.remove,
  }

  // default deprecation reason must be invisible except case when it's replaced
  if (value === GRAPH_API_DIRECTIVE_DEPRECATED_DEFAULT_REASON && !itemReplaced) {
    return null
  }

  const diffType = $change?.type
  const diffTypeCause = buildOpenApiDiffCause($change)
  const diffTypeIncluded = isDiffTypeIncluded(diffType, filters)

  const diffBackground =
    isContentChanged
      ? NODE_DIFF_COLOR_MAP[$action]
      : ''

  const Content: FC<ContentProps> = ({ layoutSide }) => {
    const width = isSideBySideDiffsLayoutMode ? 'w-1/2' : 'w-full'

    // FIXME 28.11.23 // Fix this component when it's clear how $changes for deprecation reason are provided not in enum

    return (
      <div className={`flex flex-row gap-5 ${shift ? SHIFTED_ROW_PADDING_LEFT : DEFAULT_ROW_PADDING_LEFT} ${width}`}>
        <NestingIndicator level={level} />
        <div className="inline-block py-1">
          <Value
            value={value}
            enableDiffs={diffTypeIncluded}
            layoutMode={layoutMode}
            layoutSide={layoutSide}
            $changes={$change}
          />
          {isInlineDiffsLayoutMode && itemReplaced && (
            <Value
              value={value}
              enableDiffs={diffTypeIncluded}
              layoutMode={layoutMode}
              layoutSide={CHANGED_LAYOUT_SIDE}
              $changes={$change}
            />
          )}
        </div>
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
    return (
      <div className={`flex flex-row ${diffTypeIncluded ? diffBackground : ''}`}>
        {diffTypeIncluded && <UxDiffFloatingBadge variant={diffType} message={diffTypeCause} />}
        <Content layoutSide={ORIGIN_LAYOUT_SIDE} />
      </div>
    )
  }

  if (isSideBySideDiffsLayoutMode) {
    if (!$metaChanges) {
      return (
        <div className="flex flex-row">
          <Content layoutSide={ORIGIN_LAYOUT_SIDE} />
          <Content layoutSide={CHANGED_LAYOUT_SIDE} />
        </div>
      )
    }

    return (
      <div className={`flex flex-row relative ${diffTypeIncluded ? diffBackground : ''}`}>
        {diffTypeIncluded && <UxDiffFloatingBadge variant={diffType} message={diffTypeCause} />}
        {!isContentChanged || (itemRemoved || itemReplaced)
          ? <Content layoutSide={ORIGIN_LAYOUT_SIDE} />
          : <EmptyContent level={level} />}
        {!isContentChanged || (itemAdded || itemReplaced)
          ? <Content layoutSide={CHANGED_LAYOUT_SIDE} />
          : <EmptyContent level={level} />}
      </div>
    )
  }

  return <UnsupportedContent layoutMode={layoutMode} />
}

type ValueProps = {
  value: string | undefined
  strikethrough?: boolean
  // diffs
  enableDiffs: boolean
  layoutMode: LayoutMode
  layoutSide: LayoutSide
  $changes?: Diff | DiffMetaRecord
}

const Value: FC<ValueProps> = props => {
  const {
    enableDiffs,
    layoutMode,
    layoutSide,
    $changes
  } = props

  const { isInlineDiffsLayoutMode, isSideBySideDiffsLayoutMode } = getLayoutModeFlags(layoutMode)
  const { originSide } = getLayoutSideFlags(layoutSide)

  const valueChanged = isDiff($changes)
  const valueRemoved = valueChanged && diffRemove($changes)
  const valueReplaced = valueChanged && diffReplace($changes)

  const { removed, replaced } = {
    removed: valueChanged && (
      valueRemoved || (
        valueReplaced &&
        isObject($changes.beforeValue) &&
        'reason' in $changes.beforeValue &&
        typeof $changes.beforeValue.reason === 'string'
      )
    ),
    replaced: valueChanged && (
      valueReplaced &&
      typeof $changes.beforeValue === 'string'
    ),
  }

  let {
    value,
    strikethrough,
  } = props

  if (isSideBySideDiffsLayoutMode || isInlineDiffsLayoutMode) {
    if (originSide && (removed || replaced)) {
      strikethrough = enableDiffs
      if (valueChanged && valueReplaced) {
        value = (
          isObject($changes.beforeValue) && 'reason' in $changes.beforeValue
            ? `${$changes.beforeValue.reason}`
            : `${$changes.beforeValue}`
        )
      }
    }
  }

  return (
    <div className={`text-xs text-slate-700`}>
      <b className="font-Inter-Bolder mr-1">Deprecation reason:</b>
      <span className={`${strikethrough ? DEFAULT_STRIKETHROUGH_VALUE_CLASS : ''}`}>
        {value}
      </span>
    </div>
  )
}

export const DeprecationReasonValue = Value
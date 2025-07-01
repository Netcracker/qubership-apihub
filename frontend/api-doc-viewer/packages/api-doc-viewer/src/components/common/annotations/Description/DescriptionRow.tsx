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

import { isDiff } from "@netcracker/qubership-apihub-api-data-model";
import { Diff, DiffAction } from "@netcracker/qubership-apihub-api-diff";
import type { Dispatch, FC, SetStateAction } from 'react';
import { useEffect, useState } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { DEFAULT_STRIKETHROUGH_VALUE_CLASS, NODE_DIFF_COLOR_MAP } from '../../../../consts/changes';
import {
  DEFAULT_LAYOUT_MODE,
  DEFAULT_ROW_DEPTH,
  DEFAULT_ROW_PADDING_LEFT,
  SHIFTED_ROW_PADDING_LEFT
} from '../../../../consts/configuration';
import { useChangeSeverityFilters } from '../../../../contexts/ChangeSeverityFiltersContext';
import '../../../../index.css';
import { ContentProps } from '../../../../types/internal/ContentProps';
import { CHANGED_LAYOUT_SIDE, LayoutSide, ORIGIN_LAYOUT_SIDE } from '../../../../types/internal/LayoutSide';
import { PropsWithChanges } from '../../../../types/internal/PropsWithChanges';
import { PropsWithShift } from '../../../../types/internal/PropsWithShift';
import { LayoutMode } from '../../../../types/LayoutMode';
import { PropsWithoutChangesSummary } from "../../../../types/PropsWithoutChangesSummary";
import { ArrayUtils } from "../../../../utils/common/arrays";
import {
  buildOpenApiDiffCause,
  diffAdd,
  diffRemove,
  diffReplace,
  getLayoutModeFlags,
  getLayoutSideFlags,
  isDiffTypeIncluded
} from '../../../../utils/common/changes';
import { UxDiffFloatingBadge } from '../../../kit/ux/UxFloatingBadge/UxDiffFloatingBadge';
import { EmptyContent } from '../../diffs/EmptyContent';
import { UnsupportedContent } from '../../diffs/UnsupportedContent';
import { NestingIndicator } from '../../NestingIndicator';
import './Description.css';

const OVERFLOW_LINES_AMOUNT = 5

type IsExpandable = boolean
type Description = string

function shortenDescription(description: string, isExpanded: boolean): [IsExpandable, Description] {
  const descriptionLines = ArrayUtils.trim(description.split('\n'))
  const isExpandable = descriptionLines.length > OVERFLOW_LINES_AMOUNT

  const resolvedDescription = isExpandable && !isExpanded
    ? descriptionLines.slice(0, OVERFLOW_LINES_AMOUNT).join('\n')
    : description

  return [isExpandable, resolvedDescription]
}

export type DescriptionRowProps = PropsWithoutChangesSummary<
  PropsWithShift &
  { value: string } &
  PropsWithChanges
>

export const DescriptionRow: FC<DescriptionRowProps> = (props) => {
  const {
    shift = false,
    value,
    layoutMode = DEFAULT_LAYOUT_MODE,
    level = DEFAULT_ROW_DEPTH,
    $nodeChange,
    $changes,
  } = props

  const [expanded, setExpanded] = useState<boolean>(false)
  const [isExpandable, setIsExpandable] = useState<boolean>(false)

  const filters = useChangeSeverityFilters()

  const diffTypeForNode = $nodeChange?.type
  const diffActionForNode = $nodeChange?.action

  const diffForValue = isDiff($changes?.description) ? $changes?.description : undefined
  const diffTypeForValue = diffForValue?.type
  const diffActionForValue = diffForValue?.action

  const diffType = diffTypeForNode ?? diffTypeForValue
  const diffTypeCause = buildOpenApiDiffCause($nodeChange) ?? buildOpenApiDiffCause(diffForValue)
  const diffTypeIncluded = isDiffTypeIncluded(diffType, filters)

  const {
    isDocumentLayoutMode,
    isInlineDiffsLayoutMode,
    isSideBySideDiffsLayoutMode,
  } = getLayoutModeFlags(layoutMode)
  const isContentChanged = !!diffActionForNode || !!diffActionForValue
  const { itemAdded, itemReplaced, itemRemoved } = {
    itemAdded: diffActionForNode === DiffAction.add || diffActionForValue === DiffAction.add,
    itemReplaced: diffActionForValue === DiffAction.replace,
    itemRemoved: diffActionForNode === DiffAction.remove || diffActionForValue === DiffAction.remove,
  }

  const diffBackground =
    isContentChanged
      ? NODE_DIFF_COLOR_MAP[diffActionForNode ?? diffActionForValue!]
      : ''

  const Content: FC<ContentProps> = ({ layoutSide }) => {
    const width = isSideBySideDiffsLayoutMode ? 'w-1/2' : 'w-full'

    return (
      <div className={`flex flex-row gap-5 ${shift ? SHIFTED_ROW_PADDING_LEFT : DEFAULT_ROW_PADDING_LEFT} ${width}`}>
        <NestingIndicator level={level} />
        <div className="text-xs font-normal py-1">
          <Value
            value={value}
            expanded={expanded}
            setIsExpandable={setIsExpandable}
            // diffs
            enableDiffs={diffTypeIncluded}
            layoutMode={layoutMode}
            layoutSide={layoutSide}
            $changes={diffForValue}
          />
          {isInlineDiffsLayoutMode && itemReplaced && (
            <Value
              value={value}
              expanded={expanded}
              setIsExpandable={setIsExpandable}
              // diffs
              enableDiffs={diffTypeIncluded}
              layoutMode={layoutMode}
              layoutSide={CHANGED_LAYOUT_SIDE}
              $changes={diffForValue}
            />
          )}
          <Expander
            isExpandable={isExpandable}
            expanded={expanded}
            setExpanded={setExpanded}
          />
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
    if (!isContentChanged) {
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
    if (!isContentChanged) {
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
        {isContentChanged && (itemRemoved || itemReplaced)
          ? <Content layoutSide={ORIGIN_LAYOUT_SIDE} />
          : <EmptyContent level={$nodeChange?.depth ?? level} />}
        {isContentChanged && (itemAdded || itemReplaced)
          ? <Content layoutSide={CHANGED_LAYOUT_SIDE} />
          : <EmptyContent level={$nodeChange?.depth ?? level} />}
      </div>
    )
  }

  return <UnsupportedContent layoutMode={layoutMode} />
}

type ValueProps = {
  value: string
  expanded?: boolean
  setIsExpandable?: Dispatch<SetStateAction<boolean>>
  // diffs
  enableDiffs: boolean
  layoutMode: LayoutMode
  layoutSide: LayoutSide
  $changes?: Diff
}

const Value: FC<ValueProps> = props => {
  const {
    expanded = false,
    setIsExpandable,
    // diffs
    enableDiffs,
    layoutMode,
    layoutSide,
    $changes
  } = props

  const [isExpandableInitialValue, shortenInitialValue] = shortenDescription(props.value, expanded)
  let value = shortenInitialValue
  let isExpandable = isExpandableInitialValue

  const { isInlineDiffsLayoutMode, isSideBySideDiffsLayoutMode } = getLayoutModeFlags(layoutMode)
  const { originSide, changedSide } = getLayoutSideFlags(layoutSide)

  const isValueChanged = !!$changes

  const added = diffAdd($changes)
  const removed = diffRemove($changes)
  const replaced = diffReplace($changes)

  let strikethrough: boolean = false

  if (isValueChanged && (isSideBySideDiffsLayoutMode || isInlineDiffsLayoutMode)) {
    if (originSide) {
      if (removed || replaced) {
        strikethrough = enableDiffs
        const [
          isExpandableBeforeValue,
          shortenBeforeValue
        ] = shortenDescription(`${$changes.beforeValue}`, expanded)
        value = shortenBeforeValue
        isExpandable ||= isExpandableBeforeValue
      }
      if (added) {
        value = ''
      }
    }
    if (changedSide) {
      if (removed) {
        value = ''
      }
      if (added) {
        const [
          isExpandableAfterValue,
          shortenAfterValue
        ] = shortenDescription(`${$changes.afterValue}`, expanded)
        value = shortenAfterValue
        isExpandable ||= isExpandableAfterValue
      }
    }
  }

  useEffect(() => {
    setIsExpandable?.(isExpandable)
  }, [isExpandable, setIsExpandable]);

  return (
    <ReactMarkdown
      className={`markdown text-slate-700 ${strikethrough ? DEFAULT_STRIKETHROUGH_VALUE_CLASS : ''}`}
      remarkPlugins={[remarkGfm]}
    >
      {value}
    </ReactMarkdown>
  )
}

export const DescriptionValue = Value

export type DescriptionExpanderProps = Partial<{
  isExpandable: boolean
  expanded: boolean
  setExpanded: Dispatch<SetStateAction<boolean>>
}>

const Expander: FC<DescriptionExpanderProps> = props => {
  const { isExpandable, expanded, setExpanded } = props
  return <>
    {isExpandable && (
      <div className="mt-2">
        <a className="text-blue-600 hover:text-blue-500 hover:cursor-pointer"
          onClick={() => setExpanded?.(!expanded)}
        >
          {!expanded ? 'Show all description' : 'Collapse description'}
        </a>
      </div>
    )}
  </>
}

export const DescriptionExpander = Expander
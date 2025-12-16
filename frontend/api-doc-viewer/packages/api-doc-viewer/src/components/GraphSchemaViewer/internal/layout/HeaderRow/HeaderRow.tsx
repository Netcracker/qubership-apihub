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

import { DiffRecord, GraphApiDiffTreeNode, isDiff, isDiffMetaRecord } from '@netcracker/qubership-apihub-api-data-model'
import { Diff, DiffAction, DiffType, isDiffAdd, isDiffRemove } from '@netcracker/qubership-apihub-api-diff'
import type { FC } from 'react'
import { useCallback/*, useState */ } from 'react'
import { IModelStatePropNode } from '@netcracker/qubership-apihub-api-state-model'
import { NODE_DIFF_COLOR_MAP } from '../../../../../consts/changes'
import {
  DEFAULT_LAYOUT_MODE,
  DEFAULT_ROW_PADDING_LEFT,
  SHIFTED_ROW_PADDING_LEFT,
} from '../../../../../consts/configuration'
// import {
//   COLLAPSE_ALL_MENU_ITEM,
//   EXPAND_ALL_MENU_ITEM,
//   SORT_ASC_MENU_ITEM,
//   SORT_ORIGINAL_MENU_ITEM,
// } from '../../../../../consts/menuItems'
import { CIRCULAR_REF_TOOLTIP } from '../../../../../consts/tooltips'
import { useChangeSeverityFilters } from '../../../../../contexts/ChangeSeverityFiltersContext'
import { useNoSubHeaderSide } from '../../../../../contexts/NoSubHeaderContext'
import { NodeTitleData } from '../../../../../types/NodeTitleData'
import { NodeTypeData } from '../../../../../types/NodeTypeData'
import { ColorSchema } from '../../../../../types/aliases/common'
import { ContentProps } from '../../../../../types/internal/ContentProps'
import { CHANGED_LAYOUT_SIDE, ORIGIN_LAYOUT_SIDE } from '../../../../../types/internal/LayoutSide'
import {
  MUTATION_OPERATION_METHOD,
  QUERY_OPERATION_METHOD,
  SUBSCRIPTION_OPERATION_METHOD,
} from '../../../../../types/internal/OperationMethod'
import { PropsWithChanges } from '../../../../../types/internal/PropsWithChanges'
import { PropsWithShift } from '../../../../../types/internal/PropsWithShift'
import { ArrayUtils } from '../../../../../utils/common/arrays'
import {
  API_TYPE_GRAPHQL,
  DEFAULT_DIFF_TYPE_AND_CAUSE_PAIR,
  filterChangesList,
  getDiffTypesFromSummary,
  getLayoutModeFlags,
  isDiffTypeIncluded,
  maxDiffType,
  toChangesList
} from '../../../../../utils/common/changes'
import { isDefined } from '../../../../../utils/common/checkers'
// import { defaultOnContextMenu } from '../../../../../utils/common/event-handlers'
import { NestingIndicator } from '../../../../common/NestingIndicator'
import { NodeTitle } from '../../../../common/NodeTitle'
import { NodeType } from '../../../../common/NodeType'
import { NullableAsterisk } from '../../../../common/NullableAsterisk'
import { DiffTags } from '../../../../common/diffs/DiffTags'
import { EmptyContent } from '../../../../common/diffs/EmptyContent'
import { UnsupportedContent } from '../../../../common/diffs/UnsupportedContent'
import { Expander } from '../../../../common/layout/Expander/Expander'
import { CircularRefIcon } from '../../../../kit/icons/CircularRefIcon'
import { UxBadge } from '../../../../kit/ux/UxBadge'
// import { UxContextMenu } from '../../../../kit/ux/UxContextMenu/UxContextMenu'
// import { ToggleContextMenuHandlerOptions } from '../../../../kit/ux/UxContextMenu/types/ToggleContextMenuHandler'
import { UxDiffFloatingBadge } from '../../../../kit/ux/UxFloatingBadge/UxDiffFloatingBadge'
import { UxMarkerPanel } from '../../../../kit/ux/UxMarkerPanel/UxMarkerPanel'
import { UxTooltip } from '../../../../kit/ux/UxTooltip/UxTooltip'
import { ArgumentsSubTitle } from './ArgumentsSubtitle'
import { DirectiveLocations } from './DirectiveLocations'
import { DirectivesSubtitle } from './DirectivesSubtitle'

export type HeaderRowState = PropsWithShift & {
  isExpandable?: boolean
  expanded: boolean
  sorted: number
  isRoot: boolean
  isOperation: boolean
  onToggleExpander: () => void
  onToggleSort: () => void
}

export type HeaderRowProps = {
  nodeTitleData: NodeTitleData
  nodeTypeData: NodeTypeData | null
  isCircularRef: boolean
  readOnly?: boolean
  writeOnly?: boolean
  deprecationReason?: string
} & OperationSpecificProps & GraphSpecificProps & HeaderRowState & PropsWithChanges

export const NULLABILITY_POSITION_NODE = 'node'
export const NULLABILITY_POSITION_TYPE = 'type'
export type NullabilityPosition =
  | typeof NULLABILITY_POSITION_NODE
  | typeof NULLABILITY_POSITION_TYPE

const OPERATION_METHOD_COLOR_SCHEMAS_MAP: Record<string, ColorSchema> = {
  [QUERY_OPERATION_METHOD]: 'bg-green-500 text-white ring-green-500/20',
  [MUTATION_OPERATION_METHOD]: 'bg-sky-400 text-white ring-sky-400/20',
  [SUBSCRIPTION_OPERATION_METHOD]: 'bg-amber-500 text-white ring-amber-500/20',
}

const TRACKED_KEYS_VALUES_CHANGES: string[] = ['type', 'nullable', 'title']
const TRACKED_KEYS_META_CHANGES: string[] = ['locations']

export type OperationSpecificProps = {
  method?: string
  nullable?: boolean
  nullabilityPosition?: NullabilityPosition
}

export type GraphSpecificProps = {
  isDirective: boolean
  isArgument: boolean
  usedDirectives: string[]
  directiveLocations: string[]
  args: IModelStatePropNode<GraphApiDiffTreeNode>[]
}

export const HeaderRow: FC<HeaderRowProps> = (props) => {
  const {
    shift = false,
    nodeTitleData,
    nodeTypeData,
    isCircularRef,
    readOnly,
    writeOnly,
    deprecationReason,
    nullable,
    nullabilityPosition = NULLABILITY_POSITION_NODE,
    // GraphQL
    // operation
    isOperation,
    method,
    // other
    isDirective,
    usedDirectives,
    directiveLocations,
    args,
    // ------
    isExpandable,
    expanded,
    // sorted,
    isRoot,
    onToggleExpander,
    // onToggleSort,
    layoutMode = DEFAULT_LAYOUT_MODE,
    level = 0,
    $changes,
    $metaChanges,
    $nodeChange,
    $nodeChangesSummary,
  } = props

  const isNodeChanged = !!$nodeChange

  const filters = useChangeSeverityFilters()

  const diffTypesFromNodeChangesSummary = getDiffTypesFromSummary(!isNodeChanged ? $nodeChangesSummary : undefined)
  const diffTypesFromNodeChangesSummaryFilter = useCallback((key: DiffType) => filters.length === 0 || filters.includes(key), [filters])

  const { isDocumentLayoutMode, isInlineDiffsLayoutMode, isSideBySideDiffsLayoutMode } = getLayoutModeFlags(layoutMode)

  const nodeChangesList = toChangesList($changes, $metaChanges, API_TYPE_GRAPHQL)
  const argsChangesList = getArgumentsChangesList(args)
  const rowContentChangesList = filterChangesList([...nodeChangesList, ...argsChangesList], filters)

  const isContentChanged =
    !!$changes && TRACKED_KEYS_VALUES_CHANGES.some(key => isDiff($changes[key])) ||
    !!$metaChanges && (
      TRACKED_KEYS_META_CHANGES.some(key => isDiff($metaChanges[key]) || isDiffMetaRecord($metaChanges[key])) ||
      isDiff($metaChanges?.deprecationReason) && (
        isDiffAdd($metaChanges?.deprecationReason) ||
        isDiffRemove($metaChanges?.deprecationReason)
      ) ||
      hasChangedDirectives($metaChanges)
    ) ||
    ArrayUtils.isNotEmpty(argsChangesList)

  // TODO 26.10.23 // Move to generalize hook with memoization because this is really frequent calculations
  const { nodeAdded, nodeRemoved, nodeReplaced } = {
    nodeAdded: isNodeChanged && $nodeChange.action === DiffAction.add,
    nodeRemoved: isNodeChanged && $nodeChange.action === DiffAction.remove,
    nodeReplaced: isNodeChanged && $nodeChange.action === DiffAction.replace,
  }

  const [diffType, diffTypeCause] =
    isNodeChanged
      ? maxDiffType($nodeChange)
      : isContentChanged
        ? maxDiffType(...rowContentChangesList)
        : DEFAULT_DIFF_TYPE_AND_CAUSE_PAIR
  const diffTypeIncluded = isDiffTypeIncluded(diffType, filters)

  const diffBackground =
    isNodeChanged
      ? NODE_DIFF_COLOR_MAP[$nodeChange?.action]
      : isContentChanged
        ? NODE_DIFF_COLOR_MAP[DiffAction.replace]
        : ''

  const Content: FC<ContentProps> = ({ layoutSide }) => {
    // const [contextMenuOpen, setContextMenuOpen] = useState<boolean>(false)
    // const contextMenuItems = [
    //   {
    //     label: expanded ? COLLAPSE_ALL_MENU_ITEM : EXPAND_ALL_MENU_ITEM,
    //     onClick: onToggleExpander,
    //   },
    //   {
    //     label: sorted ? SORT_ORIGINAL_MENU_ITEM : SORT_ASC_MENU_ITEM,
    //     onClick: onToggleSort,
    //   },
    // ]
    // TODO 26.10.23 // Simplify when deprecated components are removed
    // const onToggleContextMenu = (options: ToggleContextMenuHandlerOptions) => setContextMenuOpen(options.open)

    // Changes
    const width = isSideBySideDiffsLayoutMode ? 'w-1/2' : 'w-full'
    const nullableChanged = !isDocumentLayoutMode && !isNodeChanged && isContentChanged && isDefined($changes?.nullable)
    const changeForNullable = nullableChanged ? $changes?.nullable : undefined
    // ---

    const noSubHeaderSide = useNoSubHeaderSide()
    const noSubHeader = noSubHeaderSide && noSubHeaderSide === layoutSide

    const SubHeader: FC = () => <>
      {ArrayUtils.isNotEmpty(args) && (
        <ArgumentsSubTitle
          values={args}
          layoutMode={layoutMode}
          layoutSide={layoutSide}
          disableChanges={isNodeChanged}
        />
      )}
      <div className="text-xs font-normal text-slate-500">
        {isDirective
          ? ArrayUtils.isNotEmpty(directiveLocations) &&
          (
            <DirectiveLocations
              values={directiveLocations}
              layoutMode={layoutMode}
              layoutSide={layoutSide}
              $metaChanges={$metaChanges}
            />
          )
          : nodeTypeData &&
          (
            <NodeType
              {...nodeTypeData}
              layoutMode={layoutMode}
              layoutSide={layoutSide}
              $changes={$changes}
            />
          )}
        {nullabilityPosition === NULLABILITY_POSITION_TYPE && (
          <NullableAsterisk
            value={nullable}
            valueChange={changeForNullable}
            layoutMode={layoutMode}
            layoutSide={layoutSide}
          />
        )}
      </div>
      {(
        ArrayUtils.isNotEmpty(diffTypesFromNodeChangesSummary) &&
        !isDocumentLayoutMode &&
        isExpandable && !expanded
      ) && (
          <div className="text-xs font-normal text-slate-500">
            <UxMarkerPanel
              values={diffTypesFromNodeChangesSummary}
              filter={diffTypesFromNodeChangesSummaryFilter}
            />
          </div>
        )}
      {ArrayUtils.isNotEmpty(usedDirectives) && (
        <DirectivesSubtitle
          values={usedDirectives}
          layoutMode={layoutMode}
          layoutSide={layoutSide}
          $metaChanges={$metaChanges}
        />
      )}
      {isCircularRef && (
        <UxTooltip text={CIRCULAR_REF_TOOLTIP}>
          <CircularRefIcon />
        </UxTooltip>
      )}
      <DiffTags
        nullableChanged={nullableChanged}
        readOnly={readOnly}
        writeOnly={writeOnly}
        deprecationReason={deprecationReason}
        layoutSide={layoutSide}
        isNodeChanged={isNodeChanged}
        isContentChanged={isContentChanged}
        $nodeChange={$nodeChange}
        $metaChanges={$metaChanges}
        $valueChanges={$changes}
      />
    </>

    return (
      <div className={`flex flex-col ${shift ? SHIFTED_ROW_PADDING_LEFT : DEFAULT_ROW_PADDING_LEFT} ${width}`}>
        <div className="flex flex-row relative">
          <NestingIndicator level={level} />
          <Expander
            isRoot={isRoot}
            isOperation={isOperation}
            isExpandable={isExpandable}
            expanded={expanded}
            onToggleExpander={onToggleExpander}
            // onToggleContextMenu={onToggleContextMenu}
          />
          <div className="flex flex-row items-center gap-2 pt-2 pb-1">
            <div
              className={`flex flex-row gap-2 text-xs text-black font-Inter-Medium ${isExpandable ? 'hover:cursor-pointer' : ''}`}
              onClick={isExpandable ? onToggleExpander : undefined}
              // onContextMenu={defaultOnContextMenu(isExpandable, onToggleContextMenu)}
            >
              {method && (
                <UxBadge
                  text={method.toUpperCase()}
                  colorSchema={OPERATION_METHOD_COLOR_SCHEMAS_MAP[method]}
                />
              )}
              <NodeTitle
                {...nodeTitleData}
                showNullable={nullabilityPosition === NULLABILITY_POSITION_NODE}
                // diffs
                layoutMode={layoutMode}
                layoutSide={layoutSide}
                nullableChange={changeForNullable}
              />
            </div>
            {!noSubHeader && <SubHeader />}
            {/* <UxContextMenu
              visible={contextMenuOpen}
              onClickAway={() => onToggleContextMenu({ open: false })}
              menuItems={contextMenuItems}
            /> */}
          </div>
        </div>
      </div>
    )
  }

  if (isDocumentLayoutMode) {
    return (
      <div className="flex flex-row">
        <Content {...props} layoutSide={CHANGED_LAYOUT_SIDE} />
      </div>
    )
  }

  if (isInlineDiffsLayoutMode) {
    if (!isNodeChanged && !isContentChanged) {
      return (
        <div className="flex flex-row">
          <Content {...props} layoutSide={ORIGIN_LAYOUT_SIDE} />
        </div>
      )
    }

    return (
      <div className={`flex flex-row relative ${diffTypeIncluded ? diffBackground : ''}`}>
        {diffType && diffTypeIncluded && <UxDiffFloatingBadge variant={diffType} message={diffTypeCause} />}
        <Content {...props} layoutSide={ORIGIN_LAYOUT_SIDE} />
      </div>
    )
  }

  if (isSideBySideDiffsLayoutMode) {
    if (!isNodeChanged && !isContentChanged) {
      return (
        <div className="flex flex-row">
          <Content {...props} layoutSide={ORIGIN_LAYOUT_SIDE} />
          <Content {...props} layoutSide={CHANGED_LAYOUT_SIDE} />
        </div>
      )
    }

    return (
      <div className={`flex flex-row relative ${diffTypeIncluded ? diffBackground : ''}`}>
        {diffType && diffTypeIncluded && <UxDiffFloatingBadge variant={diffType} message={diffTypeCause} />}
        {!isNodeChanged && isContentChanged || isNodeChanged && (nodeRemoved || nodeReplaced)
          ? <Content {...props} layoutSide={ORIGIN_LAYOUT_SIDE} />
          : <EmptyContent level={$nodeChange?.depth ?? level} />}
        {!isNodeChanged && isContentChanged || isNodeChanged && (nodeAdded || nodeReplaced)
          ? <Content {...props} layoutSide={CHANGED_LAYOUT_SIDE} />
          : <EmptyContent level={$nodeChange?.depth ?? level} />}
      </div>
    )
  }

  return <UnsupportedContent layoutMode={layoutMode} />
}

function getArgumentsChangesList(
  args: IModelStatePropNode<GraphApiDiffTreeNode>[],
): Diff[] {
  const changesList: Diff[] = []
  for (const arg of args) {
    arg.meta.$nodeChange && changesList.push(arg.meta.$nodeChange)
  }
  return changesList
}

function hasChangedDirectives(
  $metaChanges: DiffRecord | undefined,
): boolean {
  return !!$metaChanges?.directives && Object.values($metaChanges.directives).some(isDiff)
}
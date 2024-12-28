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

import { DiffNodeMeta, GraphApiDiffTreeNode, GraphApiTreeNode } from '@netcracker/qubership-apihub-api-data-model'
import { DiffAction } from '@netcracker/qubership-apihub-api-diff'
import { FC, ReactNode } from 'react'
import { IModelStatePropNode } from '../../../../../api-model-state'
import { buildNodeTitleData } from '../../../../../builders/nodes'
import { DEFAULT_STRIKETHROUGH_VALUE_CLASS, INLINE_CONTENT_DIFF_COLOR_SCHEMAS } from '../../../../../consts/changes'
import { useChangeSeverityFilters } from '../../../../../contexts/ChangeSeverityFiltersContext'
import { LayoutMode } from '../../../../../types/LayoutMode'
import { NodeTitleData } from '../../../../../types/NodeTitleData'
import { LayoutSide } from '../../../../../types/internal/LayoutSide'
import { getLayoutModeFlags, getLayoutSideFlags, isDiffTypeIncluded } from '../../../../../utils/common/changes'
import { NodeTitle } from '../../../../common/NodeTitle'

type ArgumentsSubTitleProps = {
  values: IModelStatePropNode<GraphApiDiffTreeNode>[] | IModelStatePropNode<GraphApiTreeNode>[]
  layoutMode: LayoutMode
  layoutSide: LayoutSide,
  disableChanges: boolean
}

export const ArgumentsSubTitle: FC<ArgumentsSubTitleProps> = props => {
  const {
    values,
    layoutSide,
    layoutMode,
    disableChanges
  } = props

  const filters = useChangeSeverityFilters()

  const {
    isSideBySideDiffsLayoutMode: sideBySide,
    isInlineDiffsLayoutMode: inline
  } = getLayoutModeFlags(layoutMode)
  const { originSide, changedSide } = getLayoutSideFlags(layoutSide)

  const totalLength = getTotalLengthBySides(values)
  const defaultTotal = sideBySide && originSide
    ? totalLength.originSide
    : sideBySide && changedSide
      ? totalLength.changedSide
      : values.length

  return (
    <div className="text-xs font-normal text-slate-500">
      {'('}
      {values.map((arg, index) => {
        const key = arg.node.id
        const data = buildNodeTitleData({ node: arg.node })

        const diffMetaForArgument = arg.meta as DiffNodeMeta
        const diffForArgument = disableChanges ? undefined : diffMetaForArgument.$nodeChange
        const diffActionForArgument = diffForArgument?.action
        const diffTypeForArgument = diffForArgument?.type
        const diffTypeForArgumentIncluded = isDiffTypeIncluded(diffTypeForArgument, filters)

        const { added, removed } = {
          added: diffActionForArgument === DiffAction.add,
          removed: diffActionForArgument === DiffAction.remove,
        }

        let result: ReactNode | null = (
          <Value
            key={key}
            data={data}
            index={index}
            total={defaultTotal}
            // diff meta for NodeTitle
            layoutMode={layoutMode}
            layoutSide={layoutSide}
            $metaChanges={diffMetaForArgument?.$metaChanges}
          />
        )

        // TODO 23.11.23 // Attempt to de-duplicate with DirectiveLocations, DirectivesSubtitle
        if (sideBySide) {
          if (removed) {
            if (originSide) {
              const diffColorSchema = [
                INLINE_CONTENT_DIFF_COLOR_SCHEMAS[diffActionForArgument!],
                DEFAULT_STRIKETHROUGH_VALUE_CLASS
              ].join(' ')
              result =
                <Value
                  key={key}
                  data={data}
                  index={index}
                  total={totalLength.originSide}
                  colorSchema={diffTypeForArgumentIncluded ? diffColorSchema : ''}
                  // diff meta for NodeTitle
                  layoutMode={layoutMode}
                  layoutSide={layoutSide}
                  $metaChanges={diffMetaForArgument?.$metaChanges}
                />
            }
            if (changedSide) {
              result = null
            }
          }
          if (added) {
            if (originSide) {
              result = null
            }
            if (changedSide) {
              const diffColorSchema = INLINE_CONTENT_DIFF_COLOR_SCHEMAS[diffActionForArgument!]
              result =
                <Value
                  key={key}
                  data={data}
                  index={index}
                  total={totalLength.changedSide}
                  colorSchema={diffTypeForArgumentIncluded ? diffColorSchema : ''}
                  // diff meta for NodeTitle
                  layoutMode={layoutMode}
                  layoutSide={layoutSide}
                  $metaChanges={diffMetaForArgument?.$metaChanges}
                />
            }
          }
        }

        if (inline) {
          if (added || removed) {
            const diffColorSchema = [
              INLINE_CONTENT_DIFF_COLOR_SCHEMAS[diffActionForArgument!],
              removed ? DEFAULT_STRIKETHROUGH_VALUE_CLASS : ''
            ].join(' ')
            result =
              <Value
                key={key}
                data={data}
                index={index}
                total={defaultTotal}
                colorSchema={diffTypeForArgumentIncluded ? diffColorSchema : ''}
                // diff meta for NodeTitle
                layoutMode={layoutMode}
                layoutSide={layoutSide}
                $metaChanges={diffMetaForArgument?.$metaChanges}
              />
          }
        }

        return result
      })}
      {')'}
    </div>
  )
}

type ValueProps = {
  data: NodeTitleData
  index: number
  total: number
  colorSchema?: string
  // diff meta for NodeTitle
  layoutMode: LayoutMode
  layoutSide: LayoutSide
  $metaChanges: DiffNodeMeta['$metaChanges']
}

const Value: FC<ValueProps> = props => {
  const {
    data,
    index,
    total,
    colorSchema,
    // diff meta for NodeTitle
    layoutMode,
    layoutSide,
    $metaChanges
  } = props
  return <>
    <div className={`inline ${colorSchema}`}>
      <NodeTitle
        {...data}
        layoutMode={layoutMode}
        layoutSide={layoutSide}
        requiredChange={$metaChanges?.required}
      />
    </div>
    {index < total - 1 && ', '}
  </>
}

function getTotalLengthBySides(values: IModelStatePropNode<GraphApiDiffTreeNode>[] | IModelStatePropNode<GraphApiTreeNode>[]): {
  originSide: number
  changedSide: number
} {
  const result = {
    originSide: values.length,
    changedSide: values.length,
  }
  for (const value of values) {
    const $action = (value.meta as DiffNodeMeta).$nodeChange?.action
    if ($action === DiffAction.add) {
      result.originSide--
    }
    if ($action === DiffAction.remove) {
      result.changedSide--
    }
  }
  return result
}

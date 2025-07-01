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

import { DiffRecord, isDiff, isDiffMetaRecord } from "@netcracker/qubership-apihub-api-data-model"
import { DiffAction } from '@netcracker/qubership-apihub-api-diff'
import type { FC, ReactNode } from 'react'
import { DEFAULT_STRIKETHROUGH_VALUE_CLASS, INLINE_CONTENT_DIFF_COLOR_SCHEMAS } from '../../../../../consts/changes'
import { useChangeSeverityFilters } from '../../../../../contexts/ChangeSeverityFiltersContext'
import { LayoutMode } from '../../../../../types/LayoutMode'
import { LayoutSide } from '../../../../../types/internal/LayoutSide'
import {
  getLayoutModeFlags,
  getLayoutSideFlags,
  isDiffTypeIncluded
} from '../../../../../utils/common/changes'

export type DirectivesSubtitleProps = {
  values: string[]
  layoutMode: LayoutMode
  layoutSide: LayoutSide
  $metaChanges?: DiffRecord
}

export const DirectivesSubtitle: FC<DirectivesSubtitleProps> = (props) => {
  const { values, layoutMode, layoutSide, $metaChanges } = props

  const filters = useChangeSeverityFilters()

  const {
    isSideBySideDiffsLayoutMode: sideBySide,
    isInlineDiffsLayoutMode: inline
  } = getLayoutModeFlags(layoutMode)
  const { originSide, changedSide } = getLayoutSideFlags(layoutSide)

  const diffForAllDirectives = $metaChanges?.directives

  return (
    <div className="flex gap-2">
      {values.map(directive => {
        const diffForCurrentDirective = isDiffMetaRecord(diffForAllDirectives)
          ? diffForAllDirectives[directive]
          : diffForAllDirectives
        const diffActionForDirective =
          isDiff(diffForCurrentDirective) ? diffForCurrentDirective.action : undefined
        const diffTypeForDirective =
          isDiff(diffForCurrentDirective) ? diffForCurrentDirective.type : undefined
        const diffTypeForDirectiveIncluded = isDiffTypeIncluded(diffTypeForDirective, filters)

        const { added, removed } = {
          added: diffActionForDirective === DiffAction.add,
          removed: diffActionForDirective === DiffAction.remove,
        }

        let result: ReactNode | null = <Value key={directive} value={directive}/>

        // TODO 23.11.23 // Attempt to de-duplicate with ArgumentsSubtitle, DirectiveLocations
        if (sideBySide) {
          if (removed) {
            if (originSide) {
              const diffColorSchema = [
                diffActionForDirective ? INLINE_CONTENT_DIFF_COLOR_SCHEMAS[diffActionForDirective] : '',
                DEFAULT_STRIKETHROUGH_VALUE_CLASS
              ].join(' ')
              result =
                <Value
                  key={directive}
                  value={directive}
                  colorSchema={diffTypeForDirectiveIncluded ? diffColorSchema : ''}
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
              const diffColorSchema =
                diffActionForDirective ? INLINE_CONTENT_DIFF_COLOR_SCHEMAS[diffActionForDirective] : ''
              result =
                <Value
                  key={directive}
                  value={directive}
                  colorSchema={diffTypeForDirectiveIncluded ? diffColorSchema : ''}
                />
            }
          }
        }

        if (inline) {
          if (added || removed) {
            const diffColorSchema = [
              INLINE_CONTENT_DIFF_COLOR_SCHEMAS[diffActionForDirective!],
              removed ? DEFAULT_STRIKETHROUGH_VALUE_CLASS : ''
            ].join(' ')
            result =
              <Value
                key={directive}
                value={directive}
                colorSchema={diffTypeForDirectiveIncluded ? diffColorSchema : ''}
              />
          }
        }

        return result
      })}
    </div>
  )
}

type ValueProps = {
  value: string
  colorSchema?: string
}

const DEFAULT_DIRECTIVE_COLOR_SCHEMA = 'text-sky-500'

const Value: FC<ValueProps> = props => {
  const {
    value,
    colorSchema = DEFAULT_DIRECTIVE_COLOR_SCHEMA,
  } = props
  return (
    <div key={value} className={`inline-block text-xs ${colorSchema}`}>
      {`@${value}`}
    </div>
  )
}
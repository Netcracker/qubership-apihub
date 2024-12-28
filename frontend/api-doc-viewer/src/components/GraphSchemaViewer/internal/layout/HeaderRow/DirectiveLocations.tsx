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

import { DiffRecord, isDiffMetaRecord } from '@netcracker/qubership-apihub-api-data-model'
import { Diff, DiffAction } from "@netcracker/qubership-apihub-api-diff"
import type { FC } from 'react'
import { ReactNode } from 'react'
import { DEFAULT_STRIKETHROUGH_VALUE_CLASS, INLINE_CONTENT_DIFF_COLOR_SCHEMAS } from '../../../../../consts/changes'
import { useChangeSeverityFilters } from '../../../../../contexts/ChangeSeverityFiltersContext'
import { LayoutMode } from '../../../../../types/LayoutMode'
import { LayoutSide } from '../../../../../types/internal/LayoutSide'
import {
  diffAdd,
  diffRemove,
  diffReplace,
  getLayoutModeFlags,
  getLayoutSideFlags,
  isDiffTypeIncluded,
} from '../../../../../utils/common/changes'

export type DirectiveLocationsProps = {
  values: string[]
  layoutMode: LayoutMode
  layoutSide: LayoutSide,
  $metaChanges: DiffRecord | undefined
}

export const DirectiveLocations: FC<DirectiveLocationsProps> = (props) => {
  const {
    values,
    layoutMode,
    layoutSide,
    $metaChanges
  } = props

  const filters = useChangeSeverityFilters()

  const {
    isSideBySideDiffsLayoutMode: sideBySide,
    isInlineDiffsLayoutMode: inline
  } = getLayoutModeFlags(layoutMode)
  const { originSide, changedSide } = getLayoutSideFlags(layoutSide)

  const diffForLocations = $metaChanges?.locations

  const totalLength = getTotalLengthBySides(values, diffForLocations)
  const defaultTotal = sideBySide && originSide
    ? totalLength.originSide
    : sideBySide && changedSide
      ? totalLength.changedSide
      : values.length

  return (
    <div className="inline">
      {'on '}
      {values.map((location, index) => {
        const diffForLocation = isDiffMetaRecord(diffForLocations)
          ? diffForLocations[index]
          : undefined
        const diffActionForLocation = diffForLocation?.action
        const diffTypeForLocation = diffForLocation?.type
        const diffTypeForLocationIncluded = isDiffTypeIncluded(diffTypeForLocation, filters)

        const added = diffAdd(diffForLocation)
        const removed = diffRemove(diffForLocation)
        const replaced = diffReplace(diffForLocation)

        let result: ReactNode | null = (
          <Value
            key={location}
            value={location}
            index={index}
            total={defaultTotal}
          />
        )

        // TODO 23.11.23 // Attempt to de-duplicate with ArgumentsSubtitle, DirectivesSubtitle
        if (sideBySide) {
          if (removed) {
            const before: string = `${diffForLocation.beforeValue}`

            if (originSide) {
              const diffColorSchema = [
                INLINE_CONTENT_DIFF_COLOR_SCHEMAS[diffActionForLocation!],
                DEFAULT_STRIKETHROUGH_VALUE_CLASS
              ].join(' ')
              result =
                <Value
                  key={before}
                  value={before}
                  index={index}
                  total={totalLength.originSide}
                  colorSchema={diffTypeForLocationIncluded ? diffColorSchema : ''}
                />
            }
            if (changedSide) {
              result = null
            }
          }
          if (added) {
            const after: string = `${diffForLocation.afterValue}`

            if (originSide) {
              result = null
            }
            if (changedSide) {
              const diffColorSchema = INLINE_CONTENT_DIFF_COLOR_SCHEMAS[diffActionForLocation!]
              result =
                <Value
                  key={after}
                  value={after}
                  index={index}
                  total={totalLength.changedSide}
                  colorSchema={diffTypeForLocationIncluded ? diffColorSchema : ''}
                />
            }
          }
          if (replaced) {
            const before: string = `${diffForLocation.beforeValue}`
            const after: string = `${diffForLocation.afterValue}`

            if (originSide) {
              const diffColorSchema = [
                INLINE_CONTENT_DIFF_COLOR_SCHEMAS[DiffAction.remove],
                DEFAULT_STRIKETHROUGH_VALUE_CLASS
              ].join(' ')
              result =
                <Value
                  key={before}
                  value={before}
                  index={index}
                  total={defaultTotal}
                  colorSchema={diffTypeForLocationIncluded ? diffColorSchema : ''}
                />
            }
            if (changedSide) {
              const diffColorSchema = INLINE_CONTENT_DIFF_COLOR_SCHEMAS[DiffAction.add]
              result =
                <Value
                  key={after}
                  value={after}
                  index={index}
                  total={defaultTotal}
                  colorSchema={diffTypeForLocationIncluded ? diffColorSchema : ''}
                />
            }
          }
        }

        if (inline) {
          if (added || removed) {
            const before = `${removed ? diffForLocation.beforeValue : undefined}`
            const after = `${added ? diffForLocation.afterValue : undefined}`
            const resolved = removed ? before : after

            const diffColorSchema = [
              INLINE_CONTENT_DIFF_COLOR_SCHEMAS[diffActionForLocation!],
              removed ? DEFAULT_STRIKETHROUGH_VALUE_CLASS : ''
            ].join(' ')
            result =
              <Value
                key={resolved}
                value={resolved}
                index={index}
                total={defaultTotal}
                colorSchema={diffTypeForLocationIncluded ? diffColorSchema : ''}
              />
          }
          if (replaced) {
            const before: string = `${diffForLocation.beforeValue}`
            const after: string = `${diffForLocation.afterValue}`

            const diffColorSchemaBefore = [
              INLINE_CONTENT_DIFF_COLOR_SCHEMAS[DiffAction.remove],
              DEFAULT_STRIKETHROUGH_VALUE_CLASS
            ].join(' ')
            const diffColorSchemaAfter = INLINE_CONTENT_DIFF_COLOR_SCHEMAS[DiffAction.add]

            result =
              <div className="inline-flex gap-1">
                <Value
                  key={before}
                  value={before}
                  index={index}
                  total={defaultTotal}
                  colorSchema={diffTypeForLocationIncluded ? diffColorSchemaBefore : ''}
                />
                <Value
                  key={after}
                  value={after}
                  index={index}
                  total={defaultTotal}
                  colorSchema={diffTypeForLocationIncluded ? diffColorSchemaAfter : ''}
                />
              </div>
          }
        }

        return result
      })}
    </div>
  )
}

type ValueProps = {
  value: string
  index: number
  total: number
  colorSchema?: string
}

const Value: FC<ValueProps> = props => {
  const {
    value,
    index,
    total,
    colorSchema,
  } = props
  return (
    <div className={`inline ${colorSchema}`}>
      {value}
      {index < total - 1 && ', '}
    </div>
  )
}

// this utility is necessary to set dots in inline list of locations
function getTotalLengthBySides(
  locations: string[],
  diffForLocations: Diff | DiffRecord | undefined
): {
  originSide: number
  changedSide: number
} {
  const result = {
    originSide: locations.length,
    changedSide: locations.length,
  }
  if (isDiffMetaRecord(diffForLocations)) {
    for (let i = 0; i < locations.length; i++) {
      const $locationChange = diffForLocations?.[i]
      switch ($locationChange?.action) {
        case DiffAction.add:
          result.originSide--
          break
        case DiffAction.remove:
          result.changedSide--
          break
      }
    }
  }
  return result
}
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

import { ChangedPropertyMetaData } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import type { FC } from 'react'
import {
  AMBER_TAG_COLOR_SCHEMA,
  BLUE_TAG_COLOR_SCHEMA,
  DEPRECATED_TAG,
  READ_ONLY_TAG,
  REQUIRED_TAG,
  WRITE_ONLY_TAG,
} from '../../../consts/tags'
import { useLayoutMode } from '../../../contexts/LayoutModeContext'
import { LayoutSide } from '../../../types/internal/LayoutSide'
import { BadgeWithDiffs } from './BadgeWithDiffs'

export type TagsWithDiffsProps = {
  requiredChanged?: boolean
  readOnly: boolean | undefined
  readOnlyDiff?: ChangedPropertyMetaData
  writeOnly: boolean | undefined
  writeOnlyDiff?: ChangedPropertyMetaData
  deprecated?: boolean
  deprecatedDiff?: ChangedPropertyMetaData
  requiredDiff?: ChangedPropertyMetaData
  layoutSide: LayoutSide
}

export const TagsWithDiffs: FC<TagsWithDiffsProps> = (props) => {
  const {
    requiredChanged,
    readOnly,
    readOnlyDiff,
    writeOnly,
    writeOnlyDiff,
    deprecated,
    deprecatedDiff,
    requiredDiff,
    layoutSide,
  } = props

  const layoutMode = useLayoutMode()

  const showReadOnly = !!readOnly || !!readOnlyDiff
  const showWriteOnly = !!writeOnly || !!writeOnlyDiff
  const showDeprecated = !!deprecated || !!deprecatedDiff

  if (!requiredChanged && !showReadOnly && !showWriteOnly && !showDeprecated) {
    return null
  }

  return (
    <div className="flex flex-row gap-2 justify-between">
      {requiredChanged && (
        <BadgeWithDiffs
          label={REQUIRED_TAG}
          layoutMode={layoutMode}
          layoutSide={layoutSide}
          diff={requiredDiff?.data}
        />
      )}
      {showReadOnly && (
        <BadgeWithDiffs
          label={READ_ONLY_TAG}
          colorSchema={BLUE_TAG_COLOR_SCHEMA}
          layoutMode={layoutMode}
          layoutSide={layoutSide}
          diff={readOnlyDiff?.data}
        />
      )}
      {showWriteOnly && (
        <BadgeWithDiffs
          label={WRITE_ONLY_TAG}
          colorSchema={BLUE_TAG_COLOR_SCHEMA}
          layoutMode={layoutMode}
          layoutSide={layoutSide}
          diff={writeOnlyDiff?.data}
        />
      )}
      {showDeprecated && (
        <BadgeWithDiffs
          label={DEPRECATED_TAG}
          colorSchema={AMBER_TAG_COLOR_SCHEMA}
          layoutMode={layoutMode}
          layoutSide={layoutSide}
          diff={deprecatedDiff?.data}
        />
      )}
    </div>
  )
}

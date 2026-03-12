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

import {
  GraphApiDiffNodeMeta,
  GraphSchemaDiffNodeValue,
  GraphSchemaNodeType,
  IGraphSchemaBaseType,
  IJsonSchemaBaseType,
  JsonSchemaDiffNodeMeta,
  JsonSchemaDiffNodeValue,
} from '@netcracker/qubership-apihub-api-data-model'
import type { FC } from 'react'
import { DEFAULT_VALUE_LABEL, EXAMPLES_LABEL, LOCATION_LABEL, PROVIDED_VALUE_LABEL } from '../../../consts/validations'
import { useLayoutMode } from '../../../contexts/LayoutModeContext'
import { useLevelContext } from '../../../contexts/LevelContext'
import { PropsWithChanges } from '../../../types/internal/PropsWithChanges'
import { PropsWithShift } from '../../../types/internal/PropsWithShift'
import { AnyNodePropsWithState } from '../../../types/internal/PropsWithState'
import { PropsWithoutChangesSummary } from "../../../types/PropsWithoutChangesSummary"
import { ArrayUtils } from '../../../utils/common/arrays'
import { takeNodeChangeIfWholeNodeChanged } from '../../../utils/common/changes'
import { isDefined } from '../../../utils/common/checkers'
import { AdditionalInfoArrayRow } from '../AdditionalInfoArrayRow'
import { AdditionalInfoObjectRow } from '../AdditionalInfoObjectRow'
import { DeprecationReasonRow } from './DeprecationReasonRow'
import { DescriptionRow } from './Description/DescriptionRow'

export type AnnotationsProps = PropsWithoutChangesSummary<
  PropsWithShift &
  AnyNodePropsWithState &
  PropsWithChanges
>

const ChangesKeys = {
  default: ['default'],
  value: ['value'],
  examples: ['examples'],
  location: ['location'], // AsyncAPI Channel Parameters only
}

export const Annotations: FC<AnnotationsProps> = (props) => {
  const {
    shift = false,
    state,
    $nodeChange,
  } = props
  const nodeMeta = state.meta
  const nodeValue = state.value
  const $nodeMeta = nodeMeta as JsonSchemaDiffNodeMeta | GraphApiDiffNodeMeta
  const $nodeValue = nodeValue as JsonSchemaDiffNodeValue | GraphSchemaDiffNodeValue

  const level = useLevelContext()

  const layoutMode = useLayoutMode()

  // Deprecation reason
  const deprecationReason = ($nodeMeta as GraphApiDiffNodeMeta)?.deprecationReason
  // Description
  const description = nodeValue?.description
  // Default Value
  const defaultValue = (nodeValue as IJsonSchemaBaseType)?.default
  // Value
  const providedValue = (nodeValue as IGraphSchemaBaseType<GraphSchemaNodeType>)?.value
  // Examples
  const examples = (nodeValue as IJsonSchemaBaseType)?.examples as unknown[]

  // Location (AsyncAPI Channel Parameters only)
  const locationCandidate = (nodeValue as Record<string, unknown> | undefined)?.location
  const location = typeof locationCandidate === 'string' ? locationCandidate : undefined

  const $appliedNodeChange = takeNodeChangeIfWholeNodeChanged($nodeChange ?? $nodeMeta?.$nodeChange)

  return (
    <>
      {isDefined(deprecationReason) && (
        <DeprecationReasonRow
          shift={shift}
          value={deprecationReason!}
          layoutMode={layoutMode}
          level={level}
          $nodeChange={$appliedNodeChange}
          $metaChanges={$nodeMeta?.$metaChanges}
        />
      )}
      {isDefined(description) && (
        <DescriptionRow
          shift={shift}
          value={description!}
          layoutMode={layoutMode}
          level={level}
          $nodeChange={$appliedNodeChange}
          $changes={$nodeValue?.$changes}
        />
      )}
      {isDefined(defaultValue) && (
        <AdditionalInfoObjectRow
          shift={shift}
          $changesKeys={ChangesKeys.default}
          title={DEFAULT_VALUE_LABEL}
          items={{
            default: `${defaultValue}`
          }}
          layoutMode={layoutMode}
          level={level}
          $nodeChange={$appliedNodeChange}
          $changes={$nodeValue?.$changes}
        />
      )}
      {isDefined(providedValue) && (
        <AdditionalInfoObjectRow
          shift={shift}
          $changesKeys={ChangesKeys.value}
          title={PROVIDED_VALUE_LABEL}
          items={{
            value: `${providedValue}`
          }}
          layoutMode={layoutMode}
          level={level}
          $nodeChange={$appliedNodeChange}
          $changes={$nodeValue?.$changes}
        />
      )}
      {ArrayUtils.isNotEmpty(examples) && (
        <AdditionalInfoArrayRow
          shift={shift}
          $changesKey={ChangesKeys.examples[0]}
          title={EXAMPLES_LABEL}
          items={examples}
          layoutMode={layoutMode}
          level={level}
          $nodeChange={$appliedNodeChange}
          $changes={$nodeValue?.$changes}
        />
      )}
      {location && (
        <AdditionalInfoObjectRow
          shift={shift}
          $changesKeys={ChangesKeys.location}
          title={LOCATION_LABEL}
          items={{
            location: `${location}`
          }}
          layoutMode={layoutMode}
          level={level}
          $nodeChange={$appliedNodeChange}
          $changes={$nodeValue?.$changes}
        />
      )}
    </>
  )
}

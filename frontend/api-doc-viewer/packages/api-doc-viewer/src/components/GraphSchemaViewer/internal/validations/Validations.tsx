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
  GraphApiNodeData,
  GraphSchemaNodeValue,
  IGraphSchemaEnumType
} from '@netcracker/qubership-apihub-api-data-model'
import type { FC } from 'react'
import { useLayoutMode } from '../../../../contexts/LayoutModeContext'
import { PropsWithChanges } from '../../../../types/internal/PropsWithChanges'
import { PropsWithNodeValue } from '../../../../types/internal/PropsWithNodeValue'
import { PropsWithShift } from '../../../../types/internal/PropsWithShift'
import { PropsWithoutChangesSummary } from "../../../../types/PropsWithoutChangesSummary"
import { ArrayUtils } from '../../../../utils/common/arrays'
import { AllowedValuesRow } from './primitives/AllowedValuesRow'

export type ValidationsProps = PropsWithoutChangesSummary<
  PropsWithShift
  & PropsWithNodeValue<GraphSchemaNodeValue | GraphApiNodeData>
  & PropsWithChanges
>

export const Validations: FC<ValidationsProps> = (props) => {
  const {
    shift = false,
    level,
    nodeValue,
    $nodeChange,
    $changes
  } = props

  const layoutMode = useLayoutMode()

  const allowedValues = (nodeValue as IGraphSchemaEnumType)?.values

  return (
    <>
      {ArrayUtils.isNotEmpty(Object.keys(allowedValues ?? {})) && (
        <AllowedValuesRow
          shift={shift}
          values={allowedValues}
          layoutMode={layoutMode}
          level={level}
          $nodeChange={$nodeChange}
          $changes={$changes}
        />
      )}
    </>
  )
}

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

import { useHash } from 'react-use'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useCallback } from 'react'
import type { Key } from '@apihub/entities/keys'
import type { OperationViewMode } from '@netcracker/qubership-apihub-ui-shared/entities/operation-view-mode'
import {
  DOC_OPERATION_VIEW_MODE,
  SIMPLE_OPERATION_VIEW_MODE,
} from '@netcracker/qubership-apihub-ui-shared/entities/operation-view-mode'
import type { SchemaViewMode } from '@netcracker/qubership-apihub-ui-shared/entities/schema-view-mode'
import {
  DETAILED_SCHEMA_VIEW_MODE,
  SIMPLE_SCHEMA_VIEW_MODE,
} from '@netcracker/qubership-apihub-ui-shared/entities/schema-view-mode'
import { MODE_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'

type OperationViewModeState = {
  mode: OperationViewMode
  setMode: SetOperationViewMode
  schemaViewMode: SchemaViewMode | undefined
}

export function useOperationViewMode(defaultValue: OperationViewMode = DOC_OPERATION_VIEW_MODE): OperationViewModeState {
  const modeValue = useSearchParam<Key>(MODE_SEARCH_PARAM) ?? defaultValue
  const [hashParam] = useHash()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  return {
    mode: modeValue as OperationViewMode,
    setMode: useCallback(value => {
      const isDefaultValue = value === DOC_OPERATION_VIEW_MODE
      const mode = isDefaultValue ? '' : (value ?? '')
      if (isDefaultValue) {
        searchParams.delete(MODE_SEARCH_PARAM)
      } else {
        searchParams.set(MODE_SEARCH_PARAM, mode)
      }
      navigate({
        search: `${searchParams}`,
        hash: hashParam,
      }, { replace: true })
    }, [hashParam, navigate, searchParams]),

    schemaViewMode: calculateSchemaViewMode(modeValue),
  }
}

type SetOperationViewMode = (value: Key) => void

function calculateSchemaViewMode(mode: Key | undefined): SchemaViewMode | undefined {
  if (mode === DOC_OPERATION_VIEW_MODE) {
    return DETAILED_SCHEMA_VIEW_MODE
  }
  if (mode === SIMPLE_OPERATION_VIEW_MODE) {
    return SIMPLE_SCHEMA_VIEW_MODE
  }

  return undefined
}

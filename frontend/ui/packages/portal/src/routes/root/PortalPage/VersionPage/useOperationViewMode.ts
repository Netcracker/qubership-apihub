import { useHash } from 'react-use'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useCallback, useEffect } from 'react'
import type { Key } from '@portal/entities/keys'
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
  const modeValueFromUrl = useSearchParam<Key>(MODE_SEARCH_PARAM)
  const modeValue = modeValueFromUrl ?? defaultValue
  const [hashParam] = useHash()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const setModeValue = useCallback((value: Key) => {
    const isDefaultValue = value === defaultValue
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
  }, [defaultValue, hashParam, navigate, searchParams])

  useEffect(() => {
    if (!modeValueFromUrl) {
      setModeValue(defaultValue)
    }
  }, [defaultValue, modeValueFromUrl, setModeValue])

  return {
    mode: modeValue as OperationViewMode,
    setMode: setModeValue,

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

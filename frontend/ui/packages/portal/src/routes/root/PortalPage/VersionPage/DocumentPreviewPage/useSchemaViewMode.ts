import { useCallback } from 'react'
import { useHash } from 'react-use'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import type { SchemaViewMode } from '@netcracker/qubership-apihub-ui-shared/entities/schema-view-mode'
import { DETAILED_SCHEMA_VIEW_MODE } from '@netcracker/qubership-apihub-ui-shared/entities/schema-view-mode'

const SCHEMA_VIEW_MODE_PARAM_KEY = 'schemaViewMode'

export function useSchemaViewMode(): [SchemaViewMode | undefined, SetSchemaViewModeParam] {
  const mode = useSearchParam<SchemaViewMode>(SCHEMA_VIEW_MODE_PARAM_KEY)

  const [hashParam] = useHash()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  return [
    mode ?? DETAILED_SCHEMA_VIEW_MODE,
    useCallback(value => {
      if (value === DETAILED_SCHEMA_VIEW_MODE) {
        searchParams.delete(SCHEMA_VIEW_MODE_PARAM_KEY)
      } else {
        searchParams.set(SCHEMA_VIEW_MODE_PARAM_KEY, value ?? '')
      }
      navigate({
        search: `${searchParams}`,
        hash: hashParam,
      })
    }, [hashParam, navigate, searchParams]),
  ]
}

type SetSchemaViewModeParam = (value: SchemaViewMode | undefined) => void

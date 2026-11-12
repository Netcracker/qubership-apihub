import { useCallback } from 'react'
import { useHash } from 'react-use'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { FileViewMode } from '@netcracker/qubership-apihub-ui-shared/entities/file-format-view'
import { YAML_FILE_VIEW_MODE } from '@netcracker/qubership-apihub-ui-shared/entities/file-format-view'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import { FILE_VIEW_MODE_PARAM_KEY } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'

export function useFileViewMode(): [FileViewMode | undefined, SetFileViewModeParam] {
  const mode = useSearchParam<FileViewMode>(FILE_VIEW_MODE_PARAM_KEY)

  const [hashParam] = useHash()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  return [
    mode ?? YAML_FILE_VIEW_MODE,
    useCallback(value => {
      if (value === YAML_FILE_VIEW_MODE) {
        searchParams.delete(FILE_VIEW_MODE_PARAM_KEY)
      } else {
        searchParams.set(FILE_VIEW_MODE_PARAM_KEY, value ?? '')
      }
      navigate({
        search: `${searchParams}`,
        hash: hashParam,
      })
    }, [hashParam, navigate, searchParams]),
  ]
}

type SetFileViewModeParam = (value: string | undefined) => void

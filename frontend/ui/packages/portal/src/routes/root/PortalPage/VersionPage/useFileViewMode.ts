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

import { useCallback } from 'react'
import { useHash } from 'react-use'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { YAML_FILE_VIEW_MODE } from '@netcracker/qubership-apihub-ui-shared/entities/file-format-view'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import { FILE_VIEW_MODE_PARAM_KEY } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'

export function useFileViewMode(): [string | undefined, SetFileViewModeParam] {
  const mode = useSearchParam<string>(FILE_VIEW_MODE_PARAM_KEY)

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

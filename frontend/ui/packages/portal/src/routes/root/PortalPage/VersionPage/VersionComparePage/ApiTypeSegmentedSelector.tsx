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

import type { FC } from 'react'
import { memo } from 'react'
import { useApiTypeSearchParam } from '../useApiTypeSearchParam'
import { Toggler } from '@netcracker/qubership-apihub-ui-shared/components/Toggler'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import { API_TYPE_TITLE_MAP, API_TYPES } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

export const ApiTypeSegmentedSelector: FC = memo(() => {
  const { apiType, setApiTypeSearchParam } = useApiTypeSearchParam()

  return <Toggler mode={apiType as ApiType} modes={SELECTOR_OPTIONS} onChange={setApiTypeSearchParam}
                  modeToText={OPTION_DISPLAYS}/>
})

const SELECTOR_OPTIONS = ['all', ...API_TYPES]
const OPTION_DISPLAYS = {
  ...API_TYPE_TITLE_MAP,
  all: 'All',
}

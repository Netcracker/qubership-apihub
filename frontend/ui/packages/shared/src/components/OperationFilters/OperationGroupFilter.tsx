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
import * as React from 'react'
import { useMemo } from 'react'
import { Autocomplete, InputLabel, TextField } from '@mui/material'
import { OptionItem } from '../OptionItem'
import { slugify } from '../../utils/files'
import type { OperationGroupName } from '../../entities/operation-groups'
import { ALL_OPERATION_GROUPS, UNGROUPED_OPERATION_GROUP } from '../../entities/operation-groups'
import type { PackageVersionContent } from '../../entities/version-contents'
import type { ApiType } from '../../entities/api-types'

export type OperationGroupFilterProps = Partial<{
  required: boolean
  labelText: string
  value: OperationGroupName
  onSelectValue: (value?: OperationGroupName) => void
  isLoading: boolean
  apiType: ApiType
  versionContent: PackageVersionContent | null
}>

const FILTER_GROUP_LABEL = 'Filter by Group'

export const OperationGroupFilter: FC<OperationGroupFilterProps> = (props) => {
  const {
    required = false, labelText, value,
    onSelectValue, isLoading, apiType, versionContent,
  } = props

  const options: OperationGroupName[] = useOperationGroupsFromPackageVersionContent(
    apiType as ApiType,
    versionContent,
  )

  return (
    <>
      <InputLabel required={required}>
        {labelText ?? FILTER_GROUP_LABEL}
      </InputLabel>
      <Autocomplete<OperationGroupName>
        loading={isLoading}
        disabled={!isLoading && options.length === SYNTHETIC_OPERATION_GROUPS.length}
        forcePopupIcon={true}
        value={value}
        options={options}
        renderOption={(props, groupName) => (
          <OptionItem
            key={groupName}
            props={props}
            title={groupName}
            testId={`FilterByGroup-Option-${slugify(groupName)}`}
          />
        )}
        isOptionEqualToValue={(option, value) => option === value}
        getOptionLabel={(option: OperationGroupName) => option ?? ''}
        renderInput={(params) => (
          <TextField
            {...params}
            id="operation-group-filter"
            placeholder="Group"
            sx={{ '& .MuiInputBase-root': { pt: '1px', pb: '1px' } }}
          />
        )}
        onChange={(_, option) => onSelectValue?.(option ?? undefined)}
        data-testid="OperationGroupFilter"
      />
    </>
  )
}

export function useOperationGroupsFromPackageVersionContent(
  apiType?: ApiType,
  versionContent?: PackageVersionContent | null,
): OperationGroupName[] {
  const groupsFromContent = useMemo(() => {
    return (versionContent?.operationGroups ?? [])
      .filter(({ apiType: groupApiType }) => groupApiType === apiType)
      .map(({ groupName }) => groupName)
  }, [apiType, versionContent?.operationGroups])

  return [
    ...SYNTHETIC_OPERATION_GROUPS,
    ...groupsFromContent,
  ]
}

const SYNTHETIC_OPERATION_GROUPS = [
  ALL_OPERATION_GROUPS,
  UNGROUPED_OPERATION_GROUP,
]

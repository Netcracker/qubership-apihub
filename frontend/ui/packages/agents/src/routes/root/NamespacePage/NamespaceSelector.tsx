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
import { memo, useMemo, useState } from 'react'
import { Autocomplete, Box, TextField, Tooltip } from '@mui/material'
import { useNamespaces } from './useNamespaces'
import { useParams } from 'react-router-dom'
import { SERVICES_NAMESPACE_PAGE_MODE } from './NamespacePage'
import { useNavigation } from '../../NavigationProvider'
import type { Namespace } from '@netcracker/qubership-apihub-ui-shared/entities/namespaces'
import { EMPTY_NAMESPACE } from '@netcracker/qubership-apihub-ui-shared/entities/namespaces'
import { includes } from '@netcracker/qubership-apihub-ui-shared/utils/filters'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import { WORKSPACE_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { OptionItem } from '@netcracker/qubership-apihub-ui-shared/components/OptionItem'
import { useLocalIdpAuthToken } from './useLocalIdpAuthToken'

export const NamespaceSelector: FC = memo(() => {
  const { agentId, namespaceKey = '', namespaceMode } = useParams()
  const { navigateToNamespace } = useNavigation()
  const [searchValue, setSearchValue] = useState('')
  const workspace = useSearchParam(WORKSPACE_SEARCH_PARAM)

  const [, setIdpAuthToken] = useLocalIdpAuthToken()

  const [namespaces, isLoading] = useNamespaces()
  const selectedNamespace = useMemo(() => namespaces?.find(namespace => namespace.namespaceKey === namespaceKey) ?? EMPTY_NAMESPACE, [namespaceKey, namespaces])
  const filteredNamespaces = useMemo(() => namespaces.filter(({ namespaceKey }) => includes([namespaceKey], searchValue)), [namespaces, searchValue])

  return (
    <Tooltip title={!agentId && 'Select the Cloud first to select the Namespace'} placement="right">
      <Box width={240}>
        <Autocomplete<Namespace, false, boolean>
          loading={isLoading}
          forcePopupIcon={true}
          disabled={!agentId}
          value={selectedNamespace}
          options={filteredNamespaces}
          renderOption={(props, option) => (
            <OptionItem
              props={props}
              key={option.namespaceKey}
              title={option.namespaceKey}
            />
          )}
          isOptionEqualToValue={(option, value) => option.namespaceKey === value.namespaceKey}
          getOptionLabel={(option) => option?.namespaceKey ?? ''}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder={'Namespace'}
              sx={{ m: 0, '& .MuiInputBase-root': { pt: '1px', pb: '1px' } }}
            />
          )}
          onInputChange={(event, value, reason) =>
            setSearchValue(reason === 'input' ? value : '')
          }
          onChange={(_, value) => {
            setIdpAuthToken('')
            navigateToNamespace({
              agentId: agentId!,
              namespaceKey: value?.namespaceKey ?? namespaceKey,
              mode: namespaceMode ?? SERVICES_NAMESPACE_PAGE_MODE,
              search: { [WORKSPACE_SEARCH_PARAM]: { value: workspace } },
            })
          }}
          data-testid="NamespaceSelector"
          disableClearable={!selectedNamespace.namespaceKey}
        />
      </Box>
    </Tooltip>
  )
})

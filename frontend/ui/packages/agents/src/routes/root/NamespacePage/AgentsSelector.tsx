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
import { memo, useMemo, useState } from 'react'
import { Autocomplete, Box, TextField } from '@mui/material'
import { useParams } from 'react-router-dom'
import { useNavigation } from '../../NavigationProvider'
import { useAgents } from './useAgents'
import type { Agent } from '@netcracker/qubership-apihub-ui-shared/entities/agents'
import { EMPTY_AGENT } from '@netcracker/qubership-apihub-ui-shared/entities/agents'
import { includes } from '@netcracker/qubership-apihub-ui-shared/utils/filters'
import { WORKSPACE_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import { OptionItem } from '@netcracker/qubership-apihub-ui-shared/components/OptionItem'
import { useLocalIdpAuthToken } from './useLocalIdpAuthToken'

export const AgentsSelector: FC = memo(() => {
  const { agentId = '' } = useParams()
  const { navigateToAgent } = useNavigation()
  const workspace = useSearchParam(WORKSPACE_SEARCH_PARAM)

  const [, setIdpAuthToken] = useLocalIdpAuthToken()

  const [searchValue, setSearchValue] = useState('')

  const [agents, isLoading] = useAgents()
  const selectedAgent = useMemo(() => {
      return agents?.find(agent => agent.agentId === agentId) ?? EMPTY_AGENT
    },
    [agentId, agents],
  )
  const filteredAgents = useMemo(() => agents.filter(({ agentId }) => includes([agentId], searchValue)), [agents, searchValue])

  return (
    <Box width={240}>
      <Autocomplete<Agent, false, true>
        loading={isLoading}
        value={selectedAgent}
        options={filteredAgents}
        forcePopupIcon={true}
        renderOption={(props, option) => (
          <OptionItem
            props={props}
            key={option.agentId}
            title={option.agentId}
          />
        )}
        isOptionEqualToValue={(option, value) => option.agentId === value.agentId}
        getOptionLabel={(option) => option?.agentId ?? ''}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={'Cloud'}
            sx={{ m: 0, '& .MuiInputBase-root': { pt: '1px', pb: '1px' } }}
          />
        )}
        onInputChange={(event, value, reason) =>
          setSearchValue(reason === 'input' ? value : '')
        }
        onChange={(_, value) => {
          setIdpAuthToken('')
          navigateToAgent({
            agentId: value.agentId ?? agentId,
            search: { [WORKSPACE_SEARCH_PARAM]: { value: workspace } },
          })
        }}
        data-testid="AgentsSelector"
      />
    </Box>
  )
})

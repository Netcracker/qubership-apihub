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

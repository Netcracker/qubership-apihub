import type { FC, SyntheticEvent } from 'react'
import * as React from 'react'
import { memo, useMemo } from 'react'
import { Autocomplete, Box } from '@mui/material'
import { useParams } from 'react-router-dom'
import { useNavigation } from '../../NavigationProvider'
import { useAgents } from './useAgents'
import type { Agent } from '@netcracker/qubership-apihub-ui-shared/entities/agents'
import { WORKSPACE_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import { OptionItem } from '@netcracker/qubership-apihub-ui-shared/components/OptionItem'
import { DefaultTextField } from '@netcracker/qubership-apihub-ui-shared/components/TextFields/DefaultTextField'
import { useLocalIdpAuthToken } from './useLocalIdpAuthToken'

export const AgentsSelector: FC = memo(() => {
  const { agentId = '' } = useParams()
  const { navigateToAgent } = useNavigation()
  const workspace = useSearchParam(WORKSPACE_SEARCH_PARAM)

  const [, setIdpAuthToken] = useLocalIdpAuthToken()

  const [agents, isLoading] = useAgents()
  const selectedAgent = useMemo(
    () => agents.find(agent => agent.agentId === agentId) ?? null,
    [agentId, agents],
  )

  const handleAgentChange = (_: SyntheticEvent, value: Agent | null): void => {
    if (!value) {
      return
    }
    setIdpAuthToken('')
    navigateToAgent({
      agentId: value.agentId,
      search: { [WORKSPACE_SEARCH_PARAM]: { value: workspace } },
    })
  }

  return (
    <Box width={240}>
      <Autocomplete<Agent, false, boolean>
        loading={isLoading}
        value={selectedAgent}
        options={agents}
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
          <DefaultTextField
            {...params}
            placeholder={'Cloud'}
          />
        )}
        onChange={handleAgentChange}
        data-testid="AgentsSelector"
      />
    </Box>
  )
})

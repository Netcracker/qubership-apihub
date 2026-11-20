import type { FC } from 'react'
import { memo, useMemo } from 'react'
import { Autocomplete, Box, Tooltip } from '@mui/material'
import { useNamespaces } from './useNamespaces'
import { useParams } from 'react-router-dom'
import { SERVICES_NAMESPACE_PAGE_MODE } from './NamespacePage'
import { useNavigation } from '../../NavigationProvider'
import type { Namespace } from '@netcracker/qubership-apihub-ui-shared/entities/namespaces'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import { WORKSPACE_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { OptionItem } from '@netcracker/qubership-apihub-ui-shared/components/OptionItem'
import { LargeTextField } from '@netcracker/qubership-apihub-ui-shared/components/LargeTextField'
import { useLocalIdpAuthToken } from './useLocalIdpAuthToken'

export const NamespaceSelector: FC = memo(() => {
  const { agentId, namespaceKey = '', namespaceMode } = useParams()
  const { navigateToNamespace } = useNavigation()
  const workspace = useSearchParam(WORKSPACE_SEARCH_PARAM)

  const [, setIdpAuthToken] = useLocalIdpAuthToken()

  const [namespaces, isLoading] = useNamespaces()
  const selectedNamespace = useMemo(
    () => namespaces.find(namespace => namespace.namespaceKey === namespaceKey) ?? null,
    [namespaceKey, namespaces],
  )

  return (
    <Tooltip title={!agentId && 'Select the Cloud first to select the Namespace'} placement="right">
      <Box width={240}>
        <Autocomplete<Namespace, false, boolean>
          loading={isLoading}
          forcePopupIcon={true}
          disabled={!agentId}
          value={selectedNamespace}
          options={namespaces}
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
            <LargeTextField
              {...params}
              placeholder={'Namespace'}
              margin="none"
            />
          )}
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
          disableClearable={!selectedNamespace}
        />
      </Box>
    </Tooltip>
  )
})

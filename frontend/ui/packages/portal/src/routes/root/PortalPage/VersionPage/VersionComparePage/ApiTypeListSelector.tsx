import { type FC, memo } from 'react'
import { Box, List, ListItem, ListItemButton, ListItemText } from '@mui/material'

import { useApiTypeSearchParam } from '../useApiTypeSearchParam'
import { API_TYPE_TITLE_MAP, API_TYPES, type ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import {
  getRouteApiTypeTitle,
  type ContractType,
} from '@netcracker/qubership-apihub-ui-shared/entities/contract-types'

export type ApiTypeListSelectorProps = {
  allowedApiTypes?: ReadonlyArray<ApiType | ContractType>
}

export const ApiTypeListSelector: FC<ApiTypeListSelectorProps> = memo<ApiTypeListSelectorProps>(({
  allowedApiTypes,
}) => {
  const { apiType: selectedApiType, setApiTypeSearchParam } = useApiTypeSearchParam()
  const options = allowedApiTypes ?? API_TYPES

  return (
    <Box paddingTop={2} paddingBottom={1}>
      <List>
        {options.map(apiType => (
          <ListItem
            key={`api-type-list-selector-list-item-${apiType}`}
            sx={{ p: 0 }}
          >
            <ListItemButton
              sx={{
                height: '36px',
                alignItems: 'center',
              }}
              selected={apiType === selectedApiType}
              onClick={() => setApiTypeSearchParam(apiType)}
              data-testid={`ApiTypeButton-${apiType}`}
            >
              <ListItemText
                primary={allowedApiTypes ? getRouteApiTypeTitle(apiType) : API_TYPE_TITLE_MAP[apiType as ApiType]}
                primaryTypographyProps={{ sx: { mt: 1 } }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  )
})

ApiTypeListSelector.displayName = 'ApiTypeListSelector'

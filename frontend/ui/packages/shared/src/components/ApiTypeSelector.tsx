import { MenuItem, Select, type SelectChangeEvent } from '@mui/material'
import { type ChangeEvent, type FC, memo } from 'react'

import { API_TYPE_TITLE_MAP, API_TYPES, type ApiType } from '../entities/api-types'
import { CONTRACT_TYPE_TITLE_MAP, type ContractType } from '../entities/contract-types'
import { FilledSelectField } from './FilledSelectField'

export type ApiTypeSelectorProps = {
  apiType: ApiType | ContractType
  allowedApiTypes?: ReadonlyArray<ApiType | ContractType>
  standard?: boolean
  onChange?: (apiType: ApiType | ContractType) => void
}

export const ApiTypeSelector: FC<ApiTypeSelectorProps> = memo<ApiTypeSelectorProps>(({
  standard = false,
  apiType,
  allowedApiTypes,
  onChange,
}) => {
  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent): void => {
    onChange?.(event.target.value as ApiType | ContractType)
  }

  const optionsSource = allowedApiTypes ?? API_TYPES

  const options = optionsSource.map(type => (
    <MenuItem
      key={type}
      value={type}
      data-testid={`MenuItem-${type}`}
    >
      {API_TYPE_TITLE_MAP[type as ApiType] ?? CONTRACT_TYPE_TITLE_MAP[type as ContractType]}
    </MenuItem>
  ))

  return standard
    ? (
      <Select
        sx={{ ml: 2, mt: 0.5 }}
        variant="standard"
        disableUnderline
        value={apiType}
        onChange={handleChange}
        data-testid="ApiTypeSelector"
      >
        {options}
      </Select>
    )
    : (
      <FilledSelectField
        value={apiType}
        onChange={handleChange}
        data-testid="ApiTypeSelector"
      >
        {options}
      </FilledSelectField>
    )
})

ApiTypeSelector.displayName = 'ApiTypeSelector'

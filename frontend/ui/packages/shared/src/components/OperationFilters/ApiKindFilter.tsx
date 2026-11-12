import type { FC } from 'react'
import * as React from 'react'
import { memo } from 'react'
import { Autocomplete, InputLabel, TextField } from '@mui/material'
import { OptionItem } from '../OptionItem'
import type { ApiKind } from '../../entities/operations'
import { API_KINDS } from '../../entities/operations'

export type ApiKindFilterProps = {
  onSelectApiKind: (value?: ApiKind) => void
  value?: ApiKind
  required?: boolean
  labelText?: string
}

const FILTER_API_KIND_LABEL = 'Filter by API Kind'

export const ApiKindFilter: FC<ApiKindFilterProps> = memo<ApiKindFilterProps>((props) => {
  const { value, onSelectApiKind, required = false, labelText } = props
  return (
    <>
      <InputLabel required={required}>
        {labelText ?? FILTER_API_KIND_LABEL}
      </InputLabel>
      <Autocomplete
        forcePopupIcon={true}
        value={value}
        options={Object.keys(API_KINDS).map(apiKind => apiKind as ApiKind)}
        renderOption={(props, apiKind) => (
          <OptionItem
            key={apiKind}
            props={props}
            title={API_KINDS[apiKind as ApiKind]!}
            data-testid={`Option-${apiKind}`}
          />
        )}
        isOptionEqualToValue={(option, value) => option === value}
        renderInput={(params) => (
          <TextField
            {...params}
            id="api-kind-filter"
            placeholder="API Kind"
            sx={{ '& .MuiInputBase-root': { pt: '1px', pb: '1px' } }}
          />
        )}
        getOptionLabel={(option: ApiKind) => API_KINDS[option] ?? ''}
        onChange={(_, option) => onSelectApiKind(option ?? undefined)}
        data-testid="ApiKindFilter"
      />
    </>
  )
})

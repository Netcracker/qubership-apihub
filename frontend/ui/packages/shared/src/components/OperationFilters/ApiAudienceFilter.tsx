import type { FC } from 'react'
import { memo } from 'react'
import { Autocomplete, InputLabel, TextField } from '@mui/material'
import { OptionItem } from '../OptionItem'
import type { ApiAudience } from '../../entities/operations'
import { API_AUDIENCES } from '../../entities/operations'

export type ApiAudienceFilterProps = {
  onSelectApiAudience: (value?: ApiAudience) => void
  value?: ApiAudience
}

const FILTER_API_AUDIENCE_LABEL = 'Filter by API Audience'

export const ApiAudienceFilter: FC<ApiAudienceFilterProps> = memo<ApiAudienceFilterProps>((props) => {
  const { value, onSelectApiAudience } = props
  return (
    <>
      <InputLabel>
        {FILTER_API_AUDIENCE_LABEL}
      </InputLabel>
      <Autocomplete
        forcePopupIcon={true}
        value={value}
        options={Object.keys(API_AUDIENCES).map(apiAudience => apiAudience as ApiAudience)}
        renderOption={(props, apiAudience) => (
          <OptionItem
            key={apiAudience}
            props={props}
            title={API_AUDIENCES[apiAudience as ApiAudience]!}
            data-testid={`Option-${apiAudience}`}
          />
        )}
        isOptionEqualToValue={(option, value) => option === value}
        renderInput={(params) => (
          <TextField
            {...params}
            id="api-audience-filter"
            placeholder="API Audience"
            sx={{ '& .MuiInputBase-root': { pt: '1px', pb: '1px' } }}
          />
        )}
        getOptionLabel={(option: ApiAudience) => API_AUDIENCES[option] ?? ''}
        onChange={(_, option) => onSelectApiAudience(option ?? undefined)}
        data-testid="ApiAudienceFilter"
      />
    </>
  )
})

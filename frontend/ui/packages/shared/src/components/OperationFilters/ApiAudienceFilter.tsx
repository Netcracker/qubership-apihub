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
            testId={`Option-${apiAudience}`}
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

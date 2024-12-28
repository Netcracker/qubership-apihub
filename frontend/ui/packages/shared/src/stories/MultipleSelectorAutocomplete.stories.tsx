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

import type { Meta, StoryFn } from '@storybook/react'
import React from 'react'
import { DialogForm } from '../components/DialogForm'
import { Box, Chip, DialogContent, ListItem } from '@mui/material'
import { MultipleSelectorAutocomplete } from '../components/MultipleSelectorAutocomplete'
import type { Role, Roles } from '../types/roles'
import { CheckIcon } from '../icons/CheckIcon'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import { Controller, useForm } from 'react-hook-form'
import { ROLES_LIST } from './samples/roles-samples'

export default {
  title: 'Multiple Selector Autocomplete',
} as Meta

const MultipleSelectorAutocompleteFn: StoryFn = () => {
  const { control } = useForm()
  return (
    <DialogForm open={true}>
      <DialogContent>
        <Controller
          name="roles"
          control={control}
          render={({ field: { value, onChange } }) =>
            <MultipleSelectorAutocomplete<Role>
              id="roles-selector"
              options={ROLES_LIST}
              value={value}
              inputLabel="Role"
              onChange={onChange}
              getOptionLabel={(option) => option.role ?? option}
              renderOption={(props, { key, role }) => {
                const selected = (value as Role[])?.some(role => role.key === key)
                return (
                  <ListItem {...props} key={role} sx={{ pointerEvents: selected ? 'none' : '' }}>
                    {selected ? <CheckIcon/> : null}
                    <Box sx={{ marginLeft: selected ? '6px' : '21px' }}>
                      {role}
                    </Box>
                  </ListItem>
                )
              }}
              renderTags={(value: Roles, getTagProps) =>
                value.map((option: Role, index: number) => (
                  <Chip
                    variant="outlined"
                    size="small"
                    sx={DEFAULT_CHIP_STYLE}
                    avatar={<CheckIcon/>}
                    deleteIcon={<CloseOutlinedIcon/>}
                    label={option?.role} {...getTagProps({ index })}
                  />
                ))
              }
            />
          }
        />
      </DialogContent>
    </DialogForm>
  )
}

export const MultipleSelectorAutocompleteStory = MultipleSelectorAutocompleteFn.bind({})

const DEFAULT_CHIP_STYLE = {
  border: 'none',
  width: '350px',
  display: 'flex',
  justifyContent: 'space-between',
  '.MuiChip-label': {
    mr: 'auto',
  },
  '&:hover': {
    backgroundColor: '#2E3A5217',
    '& .MuiChip-deleteIcon': {
      display: 'block',
    },
  },
  '& .MuiChip-deleteIcon': {
    display: 'none',
  },
}

import type { Meta, StoryFn } from '@storybook/react-vite'
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

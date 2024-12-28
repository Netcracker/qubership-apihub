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

import {
  Autocomplete,
  Button,
  debounce,
  DialogActions,
  DialogContent,
  DialogTitle,
  ListItem,
  TextField,
} from '@mui/material'
import type { FC } from 'react'
import { memo, useEffect, useMemo, useState } from 'react'
import { useEvent } from 'react-use'
import { Controller, useForm } from 'react-hook-form'
import { useCreateGroup } from '../useGroups'
import { LoadingButton } from '@mui/lab'
import { SHOW_CREATE_GROUP_DIALOG } from '../../EventBusProvider'
import type { Group } from '@apihub/entities/groups'
import { EMPTY_GROUP } from '@apihub/entities/groups'
import { DialogForm } from '@netcracker/qubership-apihub-ui-shared/components/DialogForm'
import { ALIAS_VALIDATION_RULES } from '@netcracker/qubership-apihub-ui-shared/utils/validations'
import { usePackages } from '@netcracker/qubership-apihub-ui-shared/hooks/packages/usePackages'
import type { Package } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { GROUP_KIND, WORKSPACE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { calculatePackagePath } from '@netcracker/qubership-apihub-ui-shared/utils/packages'
import { disableAutocompleteSearch } from '@netcracker/qubership-apihub-ui-shared/utils/mui'

export const CreateGroupDialog: FC = memo(() => {
  const [open, setOpen] = useState(false)
  useEvent(SHOW_CREATE_GROUP_DIALOG, () => setOpen(true))

  const { handleSubmit, control, reset, setValue, formState: { errors } } = useForm<Group & { parent: Package }>({
    defaultValues: {
      ...EMPTY_GROUP,
      parent: EMPTY_GROUP,
    },
  })
  const [selectedGroup, setSelectedGroup] = useState<Package>()
  const [groupsTextFilter, setGroupsTextFilter] = useState<string>('')
  const debouncedOnGroupInputChange = useMemo(() => debounce((_, value) => setGroupsTextFilter(value)), [])

  const { packages: groups, isLoading: areGroupsLoading } = usePackages({
    kind: [GROUP_KIND, WORKSPACE_KIND],
    showParents: true,
    enabled: open,
    textFilter: groupsTextFilter,
  })
  const [createGroup, isLoading, error] = useCreateGroup()

  useEffect(() => {!isLoading && !error && setOpen(false)}, [error, isLoading])
  useEffect(() => {!open && reset()}, [open, reset])

  return (
    <DialogForm
      open={open}
      onClose={() => setOpen(false)}
      onSubmit={handleSubmit(createGroup)}
    >
      <DialogTitle>
        Create New Group
      </DialogTitle>

      <DialogContent>
        <Controller
          name="name"
          control={control}
          render={({ field }) => <TextField {...field} autoFocus required label="Group name"/>}
        />
        <Controller
          name="alias"
          control={control}
          rules={{ validate: ALIAS_VALIDATION_RULES }}
          render={({ field }) => (
            <TextField
              {...field}
              required
              label="Alias"
              error={!!errors.alias || !!error}
              helperText={!!errors.alias && errors.alias?.message || !!error && error.message}
              inputProps={{ style: { textTransform: 'uppercase' } }}
            />
          )}
        />
        <Controller
          name="parent"
          control={control}
          render={({ field }) =>
            <Autocomplete
              loading={areGroupsLoading}
              value={selectedGroup}
              options={groups}
              filterOptions={disableAutocompleteSearch}
              getOptionLabel={(parent: Package) => calculatePackagePath(parent, true)}
              renderOption={(props, parent) =>
                <ListItem {...props} key={parent.key}>
                  {calculatePackagePath(parent, true)}
                </ListItem>
              }
              isOptionEqualToValue={(option, value) => option.key === value.key}
              onInputChange={debouncedOnGroupInputChange}
              renderInput={(params) => <TextField {...field} {...params} label="Parent group"/>}
              onChange={(_, value) => {
                setValue('parentKey', value?.key ?? '')
                setSelectedGroup(value)
              }}
            />}
        />
      </DialogContent>

      <DialogActions>
        <LoadingButton variant="contained" type="submit" loading={isLoading}>
          Create
        </LoadingButton>
        <Button variant="outlined" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </DialogActions>
    </DialogForm>
  )
})

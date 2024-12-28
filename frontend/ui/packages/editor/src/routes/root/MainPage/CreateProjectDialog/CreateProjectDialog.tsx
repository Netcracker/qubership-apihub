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
  MenuItem,
  TextField,
} from '@mui/material'
import type { FC, SyntheticEvent } from 'react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useIntegrationRepositories } from '../../useIntegrationRepositories'
import { useIntegrationBranches } from '../../useIntegrationBranches'
import { LoadingButton } from '@mui/lab'
import { SHOW_CREATE_PROJECT_DIALOG } from '../../../EventBusProvider'
import { useCreateProject } from './useCreateProject'
import type { PopupProps } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { PopupDelegate } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import type { Project } from '@apihub/entities/projects'
import { EMPTY_PROJECT } from '@apihub/entities/projects'
import { EMPTY_GROUP } from '@apihub/entities/groups'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { Package } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { GROUP_KIND, PACKAGE_KIND, WORKSPACE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { DEFAULT_DEBOUNCE } from '@netcracker/qubership-apihub-ui-shared/utils/constants'
import { DialogForm } from '@netcracker/qubership-apihub-ui-shared/components/DialogForm'
import { ALIAS_VALIDATION_RULES } from '@netcracker/qubership-apihub-ui-shared/utils/validations'
import { disableAutocompleteSearch } from '@netcracker/qubership-apihub-ui-shared/utils/mui'
import type { IntegrationRepository } from '@apihub/entities/integration-repository'
import { usePackages } from '@netcracker/qubership-apihub-ui-shared/hooks/packages/usePackages'
import { calculatePackagePath } from '@netcracker/qubership-apihub-ui-shared/utils/packages'

export const CreateProjectDialog: FC = memo(() => {
  return (
    <PopupDelegate
      type={SHOW_CREATE_PROJECT_DIALOG}
      render={props => <CreateProjectContent {...props}/>}
    />
  )
})

const CreateProjectContent: FC<PopupProps> = memo<PopupProps>(({ open, setOpen }) => {
  const { handleSubmit, control, setValue, reset, formState: { errors } } = useForm<Project & { group: Package }>({
    defaultValues: {
      ...EMPTY_PROJECT,
      group: EMPTY_GROUP,
    },
  })

  const [repositoryKey, setRepositoryKey] = useState<Key>('')
  const [selectedPackage, setSelectedPackage] = useState<Package>()
  const [selectedGroup, setSelectedGroup] = useState<Package>()
  const [repositoryNamePart, setRepositoryNamePart] = useState('')
  const onRepositoryNamePartChange = useCallback((_: SyntheticEvent, value: string): void => setRepositoryNamePart(value), [])
  const debouncedOnRepositoryNamePartChange = useMemo(() => debounce(onRepositoryNamePartChange, DEFAULT_DEBOUNCE), [onRepositoryNamePartChange])
  const repositories = useIntegrationRepositories(repositoryNamePart)

  const [packagesTextFilter, setPackagesTextFilter] = useState<string>('')
  const debouncedOnPackageInputChange = useMemo(() => debounce((_, value) => setPackagesTextFilter(value)), [])

  const [groupsTextFilter, setGroupsTextFilter] = useState<string>('')
  const debouncedOnGroupInputChange = useMemo(() => debounce((_, value) => setGroupsTextFilter(value)), [])

  const { packages: groups, isLoading: areGroupsLoading } = usePackages({
    kind: [GROUP_KIND, WORKSPACE_KIND],
    showParents: true,
    enabled: open,
    textFilter: groupsTextFilter,
  })

  const { packages, isLoading: arePackagesLoading } = usePackages({
    kind: PACKAGE_KIND,
    limit: 100,
    textFilter: packagesTextFilter,
  })
  const branches = useIntegrationBranches(repositoryKey)
  const [createProject, isLoading, error] = useCreateProject()

  useEffect(() => {!open && reset()}, [open, reset])

  return (
    <DialogForm
      open={open}
      onClose={() => setOpen(false)}
      onSubmit={handleSubmit(({ name, key, alias, groupKey, description, integration, packageKey }) => {
        const newProject: Project = {
          key: key,
          name: name,
          alias: alias,
          groupKey: groupKey,
          groups: [],
          favorite: false,
          description: description,
          integration: {
            type: 'gitlab',
            repositoryKey: integration?.repositoryKey,
            defaultBranch: integration?.defaultBranch,
            defaultFolder: integration?.defaultFolder,
          },
        }

        createProject({ project: newProject, packageKey: packageKey })
      })}
    >
      <DialogTitle>
        Create New Project
      </DialogTitle>

      <DialogContent>
        <Controller
          name="name"
          control={control}
          render={({ field }) => <TextField {...field} autoFocus required label="Project name"/>}
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
          name="groupKey"
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
              renderInput={(params) => <TextField {...field} {...params} required label="Parent group"/>}
              onChange={(_, value) => {
                setValue('groupKey', value?.key ?? '')
                setSelectedGroup(value)
              }}
            />}
        />
        <Controller
          name="packageKey"
          control={control}
          render={() => (
            <Autocomplete
              loading={arePackagesLoading}
              value={selectedPackage}
              options={packages}
              filterOptions={disableAutocompleteSearch}
              getOptionLabel={({ name }: Package) => name ?? ''}
              isOptionEqualToValue={(option, value) => option.key === value.key}
              renderOption={(props, { key, name }) => <ListItem {...props} key={key}>{name}</ListItem>}
              renderInput={(params) => <TextField {...params} label="Package"/>}
              onInputChange={debouncedOnPackageInputChange}
              onChange={(_, value) => {
                setValue('packageKey', value?.key ?? '')
                setSelectedPackage(value)
              }}
            />
          )}
        />
        <Controller
          name="integration.repositoryKey"
          control={control}
          render={({ field }) => <Autocomplete
            options={repositories}
            getOptionLabel={({ name }: IntegrationRepository) => name}
            isOptionEqualToValue={({ key: optionKey }, { key: valueKey }) => optionKey === valueKey}
            onChange={(_, value) => {
              const key = value?.key ?? ''
              setRepositoryKey(key)
              setValue('integration.repositoryKey', key)
            }}
            onInputChange={debouncedOnRepositoryNamePartChange}
            renderInput={(params) => <TextField {...field} {...params} required label="Git repository"/>}
          />}
        />
        <Controller
          name="integration.defaultBranch"
          control={control}
          render={({ field }) => (
            <TextField{...field} required select label="Default branch">
              {branches.map(({ name }) => <MenuItem key={name} value={name}>{name}</MenuItem>)}
            </TextField>
          )}
        />
        <Controller
          name="integration.defaultFolder"
          control={control}
          render={({ field }) => <TextField {...field} required type="text" label="Default folder"/>}
        />
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              multiline
              rows="4"
              type="text"
              label="Description of the project"/>
          )}
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

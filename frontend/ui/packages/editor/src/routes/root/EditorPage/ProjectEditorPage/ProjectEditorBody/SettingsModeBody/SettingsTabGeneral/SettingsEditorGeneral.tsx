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

import type { FC, SyntheticEvent } from 'react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { Autocomplete, Box, Button, debounce, Grid, ListItem, MenuItem, Stack, TextField } from '@mui/material'
import { useUpdateProject } from '../../../../../useProject'
import { useIntegrationRepositories } from '../../../../../useIntegrationRepositories'
import { useIntegrationBranches } from '../../../../../useIntegrationBranches'
import { Controller, useForm } from 'react-hook-form'

import { LoadingButton } from '@mui/lab'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'

import { useSetEditableSettingsTabContent } from '../SettingsModeBody'
import { useDeleteProject } from './useDeleteProject'
import { usePackages } from '../../../../../usePackages'
import type { SettingsGeneralProps } from './SettingsGeneralProps'
import type { IntegrationRepository } from '@apihub/entities/integration-repository'
import type { Package } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { EMPTY_PACKAGE, PACKAGE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import type { Project } from '@apihub/entities/projects'
import { EMPTY_PROJECT } from '@apihub/entities/projects'
import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import { TitledValue } from '@apihub/components/TitledValue'
import { DEFAULT_DEBOUNCE } from '@netcracker/qubership-apihub-ui-shared/utils/constants'
import { disableAutocompleteSearch } from '@netcracker/qubership-apihub-ui-shared/utils/mui'
import { ConfirmationDialog } from '@apihub/components/ConfirmationDialog'
import { calculateProjectPath } from '@apihub/utils/projects'

// TODO: Return the ability to change group and alias when BE will be ready
export const SettingsEditorGeneral: FC<SettingsGeneralProps> = memo(props => {
  const { project, packageObj: relatedPackage } = props

  const [confirmationOpen, setConfirmationOpen] = useState(false)
  const setEditable = useSetEditableSettingsTabContent()

  const {
    key: projectKey = '',
    name,
    alias,
    integration,
    packageKey,
  } = project

  const [repositoryNamePart, setRepositoryNamePart] = useState('')
  const onRepositoryNamePartChange = useCallback((_: SyntheticEvent, value: string): void => setRepositoryNamePart(value), [])
  const repositories = useIntegrationRepositories(repositoryNamePart)

  const [packagesTextFilter, setPackagesTextFilter] = useState<string>('')
  const onPackageInputChange = useCallback((_: SyntheticEvent, value: string) => setPackagesTextFilter(value), [])

  const defaultValues = useMemo(() => ({
    ...project ?? EMPTY_PROJECT,
    packageKey: packageKey,
    repository: {
      key: integration?.repositoryKey,
      name: integration?.repositoryName,
      defaultBranchName: integration?.defaultBranch,
    },
  }), [integration?.defaultBranch, integration?.repositoryKey, integration?.repositoryName, packageKey, project])

  const { handleSubmit, control, setValue, reset, watch } = useForm<Project & {
    repository: IntegrationRepository
  }>({ defaultValues })

  const branches = useIntegrationBranches(watch().repository?.key ?? '')
  const [packages, arePackagesLoading] = usePackages({
    kind: PACKAGE_KIND,
    limit: 100,
    textFilter: packagesTextFilter,
  })

  const [selectedPackage, setSelectedPackage] = useState<Package>(EMPTY_PACKAGE)
  useEffect(() => {
    relatedPackage && setSelectedPackage(relatedPackage)
  }, [relatedPackage])

  const [updateProject, isUpdateLoading, isUpdateSuccess] = useUpdateProject()
  const [deleteProject, isDeleteLoading] = useDeleteProject()

  useEffect(() => {isUpdateSuccess && setEditable(false)}, [isUpdateSuccess, setEditable])
  useEffect(() => reset(defaultValues), [defaultValues, reset])

  return (
    <BodyCard
      header="General"
      subheader="Project information"
      body={
        <Box
          component="form"
          onSubmit={handleSubmit(updatedProject => updateProject({ project: updatedProject, withNotification: true }))}
        >
          <Grid container spacing={2} columns={2} marginTop={1}>
            <Grid item xs container spacing={2}>
              <Grid item xs={6}>
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => <TextField {...field} sx={{ m: 0 }} required label="Project name"/>}
                />
              </Grid>
              <Grid item xs={6}>
                <Controller
                  name="integration.defaultBranch"
                  control={control}
                  render={({ field }) => <TextField {...field} sx={{ m: 0 }} required select label="Default Branch">
                    {
                      branches.map(({ name }) => (
                        <MenuItem key={name} value={name}>{name}</MenuItem>
                      ))
                    }
                  </TextField>}
                />
              </Grid>
              <Grid item xs={6}>
                <TitledValue title="Parent group" value={calculateProjectPath(project)}/>
              </Grid>
              <Grid item xs={6}>
                <TitledValue title="Alias" value={alias}/>
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="integration.defaultFolder"
                  control={control}
                  render={({ field }) => <TextField {...field} sx={{ m: 0 }} required label="Default Folder"/>}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="repository"
                  control={control}
                  render={({ field: { value, onChange } }) => (
                    <Autocomplete
                      value={value ?? null}
                      options={repositories}
                      getOptionLabel={({ name }: IntegrationRepository) => name}
                      isOptionEqualToValue={({ key: optionKey }, { key: valueKey }) => optionKey === valueKey}
                      onChange={(_, value: IntegrationRepository | null) => {
                        const { key, name, defaultBranchName } = value ?? { key: '', name: '', defaultBranchName: '' }
                        setValue('integration.repositoryKey', key)
                        setValue('integration.repositoryName', name)
                        setValue('integration.defaultBranch', defaultBranchName)
                        onChange(value)
                      }}
                      onInputChange={debounce(onRepositoryNamePartChange, DEFAULT_DEBOUNCE)}
                      renderInput={(params) => <TextField {...params} required label="Git repository"/>}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => <TextField {...field} sx={{ m: 0 }} multiline maxRows={5}
                                                    label="Description"/>}
                />
              </Grid>
              <Grid item xs={12}>
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
                      isOptionEqualToValue={({ key: optionKey }, { key: valueKey }) => optionKey === valueKey}
                      renderOption={(props, { key, name }) => <ListItem {...props} key={key}>{name}</ListItem>}
                      renderInput={(params) => <TextField {...params} label="Package"/>}
                      onChange={(_, value) => {
                        setValue('packageKey', value?.key ?? '')
                        setSelectedPackage(value)
                        // TODO 15.08.23 // It works better than native API of MUI forms. What do we do in wrong way?
                      }}
                      onInputChange={debounce(onPackageInputChange, DEFAULT_DEBOUNCE)}
                    />
                  )}
                />
              </Grid>
            </Grid>
            <Grid item xs sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <Button
                variant="outlined"
                color="error"
                onClick={() => setConfirmationOpen(true)}
              >
                <DeleteOutlinedIcon/>
                Delete Project
              </Button>
            </Grid>
          </Grid>
          <Stack sx={{ mt: 2 }} direction="row" spacing={1.5}>
            <LoadingButton variant="contained" type="submit" loading={isUpdateLoading}>
              Save
            </LoadingButton>
            <Button variant="outlined" onClick={() => setEditable(false)}>
              Cancel
            </Button>
          </Stack>
          <ConfirmationDialog
            open={confirmationOpen}
            title="Delete project"
            message={`Are you sure, you want to delete project ${name}?`}
            loading={isDeleteLoading}
            onConfirm={() => deleteProject(projectKey)}
            onCancel={() => setConfirmationOpen(false)}
          />
        </Box>
      }
    />
  )
})

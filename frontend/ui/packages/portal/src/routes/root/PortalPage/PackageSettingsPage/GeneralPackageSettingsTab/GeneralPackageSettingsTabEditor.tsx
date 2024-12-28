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

import { LoadingButton } from '@mui/lab'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Autocomplete,
  Box,
  Button,
  FormControlLabel,
  Grid,
  ListItem,
  ListItemText,
  Switch,
  TextField,
  Typography,
} from '@mui/material'

import type { FC } from 'react'
import * as React from 'react'
import { memo, useCallback, useEffect, useMemo } from 'react'
import type { Control, FieldErrors, UseFormHandleSubmit, UseFormReset } from 'react-hook-form'
import { Controller, useForm } from 'react-hook-form'
import { useUpdatePackage } from '../../../usePackage'
import {
  useEditableGeneralPackageSettingsTabContent,
  useSetEditableGeneralPackageSettingsTabContent,
} from './GeneralPackageSettingsTab'
import type { PackageSettingsTabProps } from '../package-settings'
import { PACKAGE_KINDS_NAMES_MAP } from '../package-settings'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { usePackageVersions } from '@netcracker/qubership-apihub-ui-shared/hooks/versions/usePackageVersions'
import { getSplittedVersionKey } from '@netcracker/qubership-apihub-ui-shared/utils/versions'
import { RELEASE_VERSION_STATUS } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import { TitledValue } from '@apihub/components/TitledValue'
import { transformStringValue } from '@netcracker/qubership-apihub-ui-shared/utils/strings'
import type { Package } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { DASHBOARD_KIND, GROUP_KIND, PACKAGE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import type { PackageVersion } from '@netcracker/qubership-apihub-ui-shared/entities/versions'
import { CustomChip } from '@netcracker/qubership-apihub-ui-shared/components/CustomChip'
import { filterChangedFormFields } from '@netcracker/qubership-apihub-ui-shared/utils/react-hook-form'

export const GeneralPackageSettingsTabEditor: FC<PackageSettingsTabProps> = memo<PackageSettingsTabProps>(({
  packageObject,
  isPackageLoading,
}) => {
  const {
    key,
    kind,
    serviceName,
    alias,
    packageVisibility,
    parentGroup,
  } = packageObject
  const editable = useEditableGeneralPackageSettingsTabContent()
  const setEditable = useSetEditableGeneralPackageSettingsTabContent()
  const [updatePackage, isUpdateLoading, isSuccess] = useUpdatePackage()
  const [previousReleaseVersions] = usePackageVersions({
    packageKey: key,
    status: RELEASE_VERSION_STATUS,
  })

  const defaultReleaseVersion = useMemo(
    () => previousReleaseVersions.find(({ key }) => getSplittedVersionKey(key).versionKey === packageObject.defaultReleaseVersion) ?? null,
    [previousReleaseVersions, packageObject.defaultReleaseVersion],
  )
  const [
    handleSubmit,
    control,
    formChanges,
    reset,
    defaultValues,
    errors,
  ] = useFormData(packageObject)

  const editableServiceName = useMemo(() => !isPackageLoading && !serviceName, [isPackageLoading, serviceName])

  useEffect(() => reset(defaultValues), [defaultValues, reset])

  useEffect(() => {
    if (isSuccess) {
      setEditable(false)
    }
  }, [isSuccess, setEditable])

  const onSubmit = useCallback(() => {
    updatePackage({
      packageKey: key ?? '',
      value: formChanges,
    })
  }, [formChanges, key, updatePackage])

  if (!editable) {
    return null
  }

  return (
    <BodyCard
      header="General"
      action={
        <Box display="flex" gap={1} alignItems="center">
          <Button
            sx={{ width: 100 }}
            variant="outlined"
            onClick={() => setEditable(false)}
            data-testid="CancelButton"
          >
            Cancel
          </Button>
          <LoadingButton
            sx={{ width: 100 }}
            color="primary"
            variant="contained"
            type="submit"
            loading={isUpdateLoading}
            onClick={handleSubmit(onSubmit)}
            data-testid="SaveButton"
          >
            Save
          </LoadingButton>
        </Box>
      }
      body={isPackageLoading ? (
        <LoadingIndicator/>
      ) : (
        <Box>
          <Box
            component="form"
            display="flex"
            flexDirection="column"
            sx={{ mb: '24px', mt: '8px' }}
            gap={2}
          >
            <Grid item xs container spacing={3}>
              <Grid item xs={6}>
                <Controller
                  name="name"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      sx={{ m: 0, width: 200 }}
                      required
                      error={!!errors.name}
                      label={`${PACKAGE_KINDS_NAMES_MAP[kind]} Name`}
                      data-testid="PackageNameTextField"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={6}>
                <TitledValue
                  title="Alias"
                  value={transformStringValue(alias)}
                  testId="AliasContent"
                />
              </Grid>
              {[PACKAGE_KIND, DASHBOARD_KIND].includes(kind) &&
                <Grid item xs={6}>
                  {editableServiceName ? (<Controller
                    name="serviceName"
                    control={control}
                    render={({ field }) => <TextField
                      {...field}
                      sx={{ m: 0, width: 200 }}
                      label="Service Name"
                      data-testid="ServiceNameTextField"
                    />}
                  />) : (
                    <TitledValue
                      title="Service Name"
                      value={transformStringValue(serviceName)}
                      testId="ServiceNameContent"
                    />
                  )}
                </Grid>
              }
              {[PACKAGE_KIND, DASHBOARD_KIND, GROUP_KIND].includes(kind) &&
                <Grid item xs={6}>
                  <TitledValue
                    title="Parent Group"
                    value={transformStringValue(parentGroup)}
                    testId="ParentGroupContent"
                  />
                </Grid>
              }
              <Grid item xs={12}>
                <Typography noWrap
                            variant="subtitle2">{`${PACKAGE_KINDS_NAMES_MAP[kind]} Visibility`}</Typography>
                <Controller
                  name="packageVisibility"
                  control={control}
                  render={({ field }) => <FormControlLabel
                    label="Private"
                    sx={{ ml: '2px' }}
                    control={
                      <Switch
                        {...field}
                        sx={{ mr: '8px' }}
                        color="primary"
                        value={packageVisibility}
                        defaultChecked={packageVisibility}
                        data-testid="PackageVisibilitySwitch"
                      />
                    }
                  />}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => <TextField
                    {...field}
                    sx={{ m: 0, width: 592 }}
                    maxRows={Infinity}
                    multiline
                    label="Description"
                    data-testid="DescriptionTextField"
                  />}
                />
              </Grid>
              <Grid item xs={12}>
                <Accordion
                  defaultExpanded
                  square
                  sx={{ borderTop: '1px solid rgb(217, 217, 217)' }}
                >
                  <AccordionSummary
                    sx={{ p: 0, width: 113, margin: '18px 0 12px' }}
                    expandIcon={<ExpandMoreIcon sx={{ color: '#626D82' }} fontSize="small"/>}
                    data-testid="ConfigurationAccordionButton"
                  >
                    <Typography width="100%" noWrap variant="button">Configuration</Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ gap: 2, display: 'flex', flexDirection: 'column', width: 200 }}>
                    {kind && [PACKAGE_KIND, DASHBOARD_KIND].includes(kind) &&
                      <Controller
                        name="defaultReleaseVersion"
                        control={control}
                        render={({ field, fieldState }) => <Autocomplete<PackageVersion>
                          defaultValue={defaultReleaseVersion}
                          options={previousReleaseVersions}
                          getOptionLabel={({ key }) => getSplittedVersionKey(key).versionKey}
                          renderOption={(props, { key, status }) => (
                            <ListItem {...props}>
                              <ListItemText>{getSplittedVersionKey(key).versionKey}</ListItemText>
                              <CustomChip value={status}/>
                            </ListItem>
                          )}
                          renderInput={(params) => (
                            <TextField
                              {...field}
                              {...params}
                              sx={{ m: 0 }}
                              label="Default Release Version"
                              error={!!fieldState.error}
                              helperText={fieldState.error?.message}
                            />)}
                          onChange={(_, value) => field.onChange(value?.key ?? '')}
                          data-testid="DefaultReleaseVersionAutocomplete"
                        />}
                      />
                    }
                    <Controller
                      name="releaseVersionPattern"
                      control={control}
                      render={({ field }) => <TextField
                        {...field}
                        sx={{ m: 0 }}
                        label="Release Version Pattern (Regular Expression)"
                        data-testid="ReleaseVersionPatternTextField"
                      />}
                    />
                  </AccordionDetails>
                </Accordion>
              </Grid>
            </Grid>
          </Box>
        </Box>
      )
      }
    />
  )
})

function useFormData(packageObject: Package): [
  UseFormHandleSubmit<Package>,
  Control<Package>,
  Partial<Package>,
  UseFormReset<Package>,
  Partial<Package>,
  FieldErrors<Package>
] {
  const defaultValues = useMemo(() => ({
    key: packageObject.key,
    alias: packageObject.alias,
    name: packageObject.name,
    description: packageObject.description,
    serviceName: packageObject.serviceName,
    parentGroup: packageObject.parentGroup,
    packageVisibility: packageObject.packageVisibility ?? false,
    defaultReleaseVersion: packageObject.defaultReleaseVersion,
    releaseVersionPattern: packageObject.releaseVersionPattern,
  }), [packageObject.key, packageObject.alias, packageObject.name, packageObject.description, packageObject.serviceName, packageObject.parentGroup, packageObject.packageVisibility, packageObject.defaultReleaseVersion, packageObject.releaseVersionPattern])

  const {
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, dirtyFields },
  } = useForm<Package>({ defaultValues })

  return [
    handleSubmit,
    control,
    filterChangedFormFields(watch(), dirtyFields),
    reset,
    defaultValues,
    errors,
  ]
}

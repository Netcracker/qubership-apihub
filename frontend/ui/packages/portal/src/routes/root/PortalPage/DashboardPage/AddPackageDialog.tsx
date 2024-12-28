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
import * as React from 'react'
import { memo, useCallback, useMemo, useState } from 'react'

import {
  Autocomplete,
  Box,
  Button,
  debounce,
  DialogActions,
  DialogContent,
  DialogTitle,
  ListItem,
  ListItemText,
  TextField,
} from '@mui/material'
import { LoadingButton } from '@mui/lab'
import { Controller, useForm } from 'react-hook-form'
import { usePackages } from '../../usePackages'
import { useEffectOnce } from 'react-use'
import type { ControllerFieldState, ControllerRenderProps } from 'react-hook-form/dist/types/controller'
import type { UseFormStateReturn } from 'react-hook-form/dist/types'
import { useDashboardReferences, useSetDashboardReferences } from './DashboardReferencesProvider'
import { getReferences } from '../../useVersionReferences'
import { useHandleAddedReferences } from '../useHandleReferences'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { Package } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { DASHBOARD_KIND, PACKAGE_KIND, WORKSPACE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import type { PopupProps } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { PopupDelegate } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { SHOW_ADD_PACKAGE_DIALOG } from '@apihub/routes/EventBusProvider'
import type { PackageVersion } from '@netcracker/qubership-apihub-ui-shared/entities/versions'
import type { ReferenceKind } from '@netcracker/qubership-apihub-ui-shared/entities/version-references'
import { toVersionReferences } from '@netcracker/qubership-apihub-ui-shared/entities/version-references'
import { GroupIcon } from '@netcracker/qubership-apihub-ui-shared/icons/GroupIcon'
import { disableAutocompleteSearch } from '@netcracker/qubership-apihub-ui-shared/utils/mui'
import { DEFAULT_DEBOUNCE } from '@netcracker/qubership-apihub-ui-shared/utils/constants'
import { OptionItem } from '@netcracker/qubership-apihub-ui-shared/components/OptionItem'
import { getSplittedVersionKey } from '@netcracker/qubership-apihub-ui-shared/utils/versions'
import { isEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { CustomChip } from '@netcracker/qubership-apihub-ui-shared/components/CustomChip'
import { DialogForm } from '@netcracker/qubership-apihub-ui-shared/components/DialogForm'
import { usePagedPackageVersions } from '@netcracker/qubership-apihub-ui-shared/hooks/versions/usePackageVersions'

const WORKSPACE_KEY = 'workspaceKey'
const PACKAGE_KEY = 'packageKey'
const VERSION_KEY = 'versionKey'

type AddPackageForm = {
  [WORKSPACE_KEY]?: Key
  [PACKAGE_KEY]?: Key
  [VERSION_KEY]?: Key
}

type AddPackageDialogProps = {
  packageObject: Package | null
}

export const AddPackageDialog: FC<AddPackageDialogProps> = memo(({ packageObject }) => {
  return (
    <PopupDelegate
      type={SHOW_ADD_PACKAGE_DIALOG}
      render={props => <AddPackagePopup {...props} packageObject={packageObject}/>}
    />
  )
})

type AddPackagePopupProps = PopupProps & AddPackageDialogProps

type ControllerRenderFunctionProps<FieldName extends keyof AddPackageForm> = {
  field: ControllerRenderProps<AddPackageForm, FieldName>
  fieldState: ControllerFieldState
  formState: UseFormStateReturn<AddPackageForm>
}

const AddPackagePopup: FC<AddPackagePopupProps> = memo<AddPackagePopupProps>(({ open, setOpen, packageObject }) => {
  const setConfigurableReferences = useSetDashboardReferences()
  const configurableReferences = useDashboardReferences()

  const isAlreadyAddedReference = useCallback((packageObject: Package) => {
    return configurableReferences.some(ref => ref.packageReference.key === packageObject.key)
  }, [configurableReferences])

  const defaultWorkspace = useMemo(
    () => (packageObject?.parents ?? []).find(parent => parent.kind === WORKSPACE_KIND),
    [packageObject?.parents],
  )

  // States for selections
  const [selectedWorkspace, setSelectedWorkspace] = useState<Package | null>(null)
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null)
  const [selectedVersion, setSelectedVersion] = useState<PackageVersion | null>(null)

  const [selectedPackageInput, setSelectedPackageInput] = useState('')
  const onSelectedPackageInputValueChange = useCallback((_: SyntheticEvent, value: string) => setSelectedPackageInput(value), [])

  const handleAddedReferences = useHandleAddedReferences()

  const onAddPackageToDashboard = useCallback(async () => {
    const versionReferences = toVersionReferences(await getReferences(selectedPackage!.key!, selectedVersion!.key!))
    setConfigurableReferences([...configurableReferences, {
      packageReference: {
        key: selectedPackage?.key,
        name: selectedPackage?.name,
        kind: selectedPackage?.kind as ReferenceKind,
        version: selectedVersion?.key,
        status: selectedVersion?.status,
      },
      added: true,
    }])
    handleAddedReferences(versionReferences, selectedPackage?.key)
    setOpen(false)
  }, [selectedPackage, selectedVersion, setConfigurableReferences, configurableReferences, handleAddedReferences, setOpen])

  // Load data for connected fields
  const [workspaces] = usePackages({ kind: WORKSPACE_KIND })
  const [packages, isPackagesLoading] = usePackages({
    parentId: selectedWorkspace?.key,
    kind: [PACKAGE_KIND, DASHBOARD_KIND],
    showAllDescendants: true,
    textFilter: selectedPackageInput,
    enabled: !!selectedWorkspace,
  })
  const unusedPackages = useMemo(
    () => packages.filter(packageObject => !isAlreadyAddedReference(packageObject)),
    [packages, isAlreadyAddedReference],
  )
  const [versions] = usePagedPackageVersions({
    packageKey: selectedPackage?.key,
  })
  const flattenVersions = versions.flat()

  // Form initializing
  const defaultFormData = useMemo<AddPackageForm>(() => ({
    workspaceKey: selectedWorkspace?.key,
    packageKey: selectedPackage?.key,
    versionKey: selectedVersion?.key,
  }), [selectedWorkspace?.key, selectedPackage?.key, selectedVersion?.key])
  const { handleSubmit, control, setValue } = useForm<AddPackageForm>({
    defaultValues: defaultFormData,
  })

  useEffectOnce(() => {
    if (!selectedWorkspace) {
      setValue(WORKSPACE_KEY, defaultWorkspace?.key ?? '')
      setSelectedWorkspace(defaultWorkspace as Package)
    }
  })

  // Rendering functions

  const renderSelectWorkspace = useCallback(({ field }: ControllerRenderFunctionProps<typeof WORKSPACE_KEY>) => (
    <Autocomplete
      key="workspaceAutocomplete"
      options={workspaces}
      value={selectedWorkspace}
      getOptionLabel={({ name }: Package) => name}
      renderOption={(props, { key, name }) => (
        <ListItem {...props} key={key}>
          <Box
            sx={{
              height: '16px',
              width: '16px',
              marginRight: '6px',
            }}
          >
            <GroupIcon/>
          </Box>
          {name}
        </ListItem>
      )}
      isOptionEqualToValue={(option, value) => option.key === value?.key}
      renderInput={(params) => (
        <TextField {...field} {...params} required label="Workspace"/>
      )}
      onChange={(_, value) => {
        setValue(WORKSPACE_KEY, value?.key ?? '')
        setSelectedWorkspace(value)
        setSelectedPackage(null)
        setSelectedVersion(null)
      }}
      data-testid="WorkspaceAutocomplete"
    />
  ), [workspaces, selectedWorkspace, setValue])

  const renderSelectPackage = useCallback(({ field }: ControllerRenderFunctionProps<typeof PACKAGE_KEY>) => (
    <Autocomplete
      key="packageAutocomplete"
      filterOptions={disableAutocompleteSearch}
      onInputChange={debounce(onSelectedPackageInputValueChange, DEFAULT_DEBOUNCE)}
      options={unusedPackages}
      getOptionLabel={({ name }: Package) => name}
      value={selectedPackage}
      loading={isPackagesLoading}
      renderOption={(props, { key, name }) => (
        <OptionItem key={key} props={props} title={name} subtitle={key}/>
      )}
      isOptionEqualToValue={(option, value) => option.key === value?.key}
      renderInput={(params) => (
        <TextField {...field} {...params} required label="Package / Dashboard"/>
      )}
      onChange={(_, value) => {
        setValue(PACKAGE_KEY, value?.key ?? '')
        setSelectedPackage(value)
        setSelectedVersion(null)
      }}
      data-testid="PackageAutocomplete"
    />
  ), [onSelectedPackageInputValueChange, unusedPackages, selectedPackage, isPackagesLoading, setValue])

  const renderSelectVersion = useCallback((
      { field }: ControllerRenderFunctionProps<typeof VERSION_KEY>) => (
      <Autocomplete<PackageVersion>
        key="versionAutocomplete"
        disabled={isEmpty(flattenVersions)}
        options={flattenVersions}
        getOptionLabel={({ key }: PackageVersion) => getSplittedVersionKey(key).versionKey}
        value={selectedVersion}
        renderOption={(props, { key, status }) => (
          <ListItem {...props}>
            <ListItemText>{getSplittedVersionKey(key).versionKey}</ListItemText>
            <CustomChip value={status}/>
          </ListItem>
        )}
        isOptionEqualToValue={(option, value) => option.key === value?.key}
        renderInput={(params) => (
          <TextField {...field} {...params} required label="Version"/>
        )}
        onChange={(_, value) => {
          setValue(VERSION_KEY, value?.key ?? '')
          setSelectedVersion(value)
        }}
        data-testid="VersionAutocomplete"
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [versions, selectedVersion, setValue],
  )

  return (
    <DialogForm
      open={open}
      onClose={() => setOpen(false)}
      onSubmit={handleSubmit(onAddPackageToDashboard)}
    >
      <DialogTitle>
        Add Package
      </DialogTitle>

      <DialogContent>
        <Controller
          name={WORKSPACE_KEY}
          control={control}
          render={renderSelectWorkspace}
        />
        <Controller
          name={PACKAGE_KEY}
          control={control}
          render={renderSelectPackage}
        />
        <Controller
          name={VERSION_KEY}
          control={control}
          render={renderSelectVersion}
        />
      </DialogContent>

      <DialogActions>
        <LoadingButton variant="contained" type="submit" loading={false} data-testid="AddButton">
          Add
        </LoadingButton>
        <Button variant="outlined" onClick={() => setOpen(false)} data-testid="CancelButton">
          Cancel
        </Button>
      </DialogActions>
    </DialogForm>
  )
})

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

import type { ChangeEvent, FC, SyntheticEvent } from 'react'
import * as React from 'react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Autocomplete, Box, Button, debounce, ListItem, TextField, Tooltip, Typography } from '@mui/material'
import { Controller, useForm } from 'react-hook-form'
import { usePackageVersions } from '@netcracker/qubership-apihub-ui-shared/hooks/versions/usePackageVersions'

import type { DateObject } from 'react-multi-date-picker'
import DatePicker from 'react-multi-date-picker'

import { usePackages } from '@netcracker/qubership-apihub-ui-shared/hooks/packages/usePackages'
import { useDebounce } from 'react-use'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { VersionStatus } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import {
  PUBLISH_STATUSES,
  RELEASE_VERSION_STATUS,
  VERSION_STATUSES,
} from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import type { Package } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { GROUP_KIND, PACKAGE_KIND, WORKSPACE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { handleVersionsRevision } from '@netcracker/qubership-apihub-ui-shared/utils/versions'
import { useEventBus } from '@apihub/routes/EventBusProvider'
import { disableAutocompleteSearch } from '@netcracker/qubership-apihub-ui-shared/utils/mui'
import { OptionItem } from '@netcracker/qubership-apihub-ui-shared/components/OptionItem'
import { VersionStatusChip } from '@netcracker/qubership-apihub-ui-shared/components/VersionStatusChip'
import { CalendarIcon } from '@netcracker/qubership-apihub-ui-shared/icons/CalendarIcon'
import {
  API_TYPE_REST,
  API_TYPES,
} from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import type { ApiContract } from '@apihub/entities/global-search'
import {
  CONTRACT_TYPES,
  getRouteApiTypeTitle,
} from '@netcracker/qubership-apihub-ui-shared/entities/contract-types'
import { DEFAULT_DEBOUNCE } from '@netcracker/qubership-apihub-ui-shared/utils/constants'
import { usePackage } from '@apihub/routes/root/usePackage'
import { toISODateRange } from '@netcracker/qubership-apihub-ui-shared/utils/date'
import {
  useSystemConfiguration,
} from '@netcracker/qubership-apihub-ui-shared/hooks/authorization/useSystemConfiguration'

const DEFAULT_WORKSPACE_ID = ''

const API_CONTRACT_OPTIONS = [...API_TYPES, ...CONTRACT_TYPES]

type FiltersData = Partial<{
  workspace: Package | null
  group: Package | null
  pkg: Package | null
  version: Key
  status: VersionStatus
  publicationDatePeriod: string[]
  apiContract: ApiContract
}>

type SearchFilters = {
  enabledFilters: boolean
}

export const SearchFilters: FC<SearchFilters> = memo(({ enabledFilters }) => {
  const defaultPublicationDatePeriod = useMemo(() => {
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
    return toISODateRange(oneYearAgo, new Date())
  }, [])
  const [systemConfiguration] = useSystemConfiguration()
  const defaultWorkspaceId = useMemo(() => {
    return systemConfiguration?.defaultWorkspaceId ?? DEFAULT_WORKSPACE_ID
  }, [systemConfiguration])

  const [defaultWorkspace] = usePackage({ packageKey: defaultWorkspaceId, hideError: true })

  const {
    control,
    setValue,
    reset,
    watch,
    formState: { errors },
    handleSubmit,
  } = useForm<FiltersData>({
    defaultValues: {
      workspace: null,
      group: null,
      pkg: null,
      status: RELEASE_VERSION_STATUS,
      apiContract: API_TYPE_REST,
      publicationDatePeriod: defaultPublicationDatePeriod,
    },
  })

  useEffect(() => {
    reset({
      workspace: defaultWorkspace,
      group: null,
      pkg: null,
      status: RELEASE_VERSION_STATUS,
      apiContract: API_TYPE_REST,
      publicationDatePeriod: defaultPublicationDatePeriod,
    })
  }, [defaultPublicationDatePeriod, defaultWorkspace, reset])

  const {
    apiContract,
    version,
    status,
    publicationDatePeriod,
  } = watch()

  const workspaceKey = watch().workspace?.key
  const packageKey = watch().pkg?.key

  const [workspacesFilter, setWorkspacesFilter] = useState('')
  const { packages: workspaces, isLoading: isWorkspacesLoading } = usePackages({
    kind: WORKSPACE_KIND,
    enabled: enabledFilters,
    textFilter: workspacesFilter,
  })
  const onWorkspaceInputChange = useMemo(() => debounce((_: SyntheticEvent, value: string, reason: string) =>
    reason === 'input' && setWorkspacesFilter(value), DEFAULT_DEBOUNCE), [])

  const groupKey = watch().group?.key

  const [groupsFilter, setGroupsFilter] = useState('')
  const { packages: groups, isLoading: isGroupsLoading } = usePackages({
    kind: GROUP_KIND,
    parentId: workspaceKey,
    enabled: enabledFilters && !!workspaceKey,
    textFilter: groupsFilter,
    showAllDescendants: true,
  })
  const onGroupInputChange = useMemo(() => debounce((_: SyntheticEvent, value: string) =>
    setGroupsFilter(value), DEFAULT_DEBOUNCE), [])

  const [packagesFilter, setPackagesFilter] = useState('')
  const { packages, isLoading: isPackagesLoading } = usePackages({
    kind: PACKAGE_KIND,
    parentId: groupKey || workspaceKey,
    enabled: enabledFilters && !!workspaceKey,
    textFilter: packagesFilter,
    showAllDescendants: true,
  })
  const onPackageInputChange = useMemo(() => debounce((_: SyntheticEvent, value: string) =>
    setPackagesFilter(value), DEFAULT_DEBOUNCE), [])

  const [versionsFilter, setVersionsFilter] = useState('')
  const { versions: packageVersions, areVersionsInitiallyLoading } = usePackageVersions({
    packageKey: packageKey,
    enabled: enabledFilters && !!packageKey,
    textFilter: versionsFilter,
  })
  const handledVersions = handleVersionsRevision(packageVersions)
  const onVersionInputChange = useMemo(() => debounce((_: SyntheticEvent, value: string) =>
    setVersionsFilter(value), DEFAULT_DEBOUNCE), [])

  const ref = useRef<DatePickerRef>()
  const { applyGlobalSearchFilters } = useEventBus()

  const formatPublicationDate = useCallback((periodOfTime: DateObject[] | null): void => {
    if (!periodOfTime) {
      setValue('publicationDatePeriod', undefined)
      return
    }
    const [start, end] = periodOfTime.map(dateObj => dateObj.toDate())
    setValue('publicationDatePeriod', toISODateRange(start, end))
  }, [setValue])

  const packageIdsDataForPackageAndGroup = useMemo(() => {
    if (packageKey) {
      return [packageKey]
    }
    if (groupKey) {
      return [groupKey]
    }
    return []
  }, [packageKey, groupKey])

  const onSubmit = useMemo(
    () => handleSubmit((value) => {
      const {
        version,
        status,
        publicationDatePeriod,
        apiContract,
      } = value

      const versionData = version ? [version] : []

      const globalSearchFilter = {
        filters: {
          workspace: workspaceKey,
          packageIds: packageIdsDataForPackageAndGroup,
          versions: versionData,
          status: status as VersionStatus,
          creationDateInterval: {
            startDate: publicationDatePeriod?.[0] ?? '',
            endDate: publicationDatePeriod?.[1] ?? '',
          },
          apiContract: apiContract,
        },
      }

      applyGlobalSearchFilters(globalSearchFilter)
    }),
    [handleSubmit, workspaceKey, packageIdsDataForPackageAndGroup, applyGlobalSearchFilters],
  )

  useDebounce(
    onSubmit,
    500,
    [
      workspaceKey,
      groupKey,
      packageKey,
      apiContract,
      status,
      version,
      publicationDatePeriod,
    ],
  )

  return <>
    <Typography sx={{ mb: 2, mt: 1 }} variant="h3">Filters</Typography>
    <Box component="form" sx={{ overflow: 'scroll', height: 'calc(100% - 60px)', pr: 1 }}>
      <Controller
        name="apiContract"
        control={control}
        render={({ field: { value, onChange } }) => <Autocomplete
          value={value ?? null}
          options={API_CONTRACT_OPTIONS}
          getOptionLabel={(option) => getRouteApiTypeTitle(option)}
          isOptionEqualToValue={(option, value) => option === value}
          renderOption={(props, option) => (
            <ListItem
              {...props}
              key={option}
              data-testid={`Option-${option}`}
            >
              {getRouteApiTypeTitle(option)}
            </ListItem>
          )}
          onChange={(_, type) => {
            onChange(type)
          }}
          renderInput={(params) => (
            <TextField
              required
              {...params}
              label="API Contract"
              sx={{ mt: 0 }}
              error={!!errors.apiContract}
            />
          )}
          data-testid="ApiTypeAutocomplete"
        />}
      />
      <Controller
        name="workspace"
        control={control}
        render={({ field: { value } }) => <Autocomplete<Package>
          sx={AUTOCOMPLETE_STYLE}
          value={value}
          isOptionEqualToValue={(option, value) => option.key === value.key}
          options={workspaces}
          filterOptions={disableAutocompleteSearch}
          loading={isWorkspacesLoading}
          getOptionLabel={({ name }: Package) => name}
          renderOption={(props, { key, name }) =>
            <OptionItem key={key} props={props} title={name} subtitle={key}/>}
          onChange={(_, value) => {
            setValue('workspace', value)
            setValue('group', null)
            setValue('pkg', null)
            onWorkspaceInputChange.clear()
            setWorkspacesFilter('')
          }}
          renderInput={(params) =>
            <TextField
              {...params}
              required
              label="Workspace"/>}
          onInputChange={onWorkspaceInputChange}
          onBlur={() => {
            onWorkspaceInputChange.clear()
            setWorkspacesFilter('')
          }}
          data-testid="WorkspaceAutocomplete"
        />}
      />

      <Tooltip
        disableHoverListener={!!workspaceKey}
        disableFocusListener={!!workspaceKey}
        title="Specify Workspace for Group selection"
      >
        <Box>
          <Controller
            name="group"
            control={control}
            render={({ field: { value } }) => <Autocomplete<Package>
              sx={AUTOCOMPLETE_STYLE}
              value={value}
              disabled={!workspaceKey}
              isOptionEqualToValue={(option, value) => option.key === value.key}
              options={groups}
              filterOptions={disableAutocompleteSearch}
              loading={isGroupsLoading}
              getOptionLabel={({ name }: Package) => name}
              renderOption={(props, { key, name }) =>
                <OptionItem key={key} props={props} title={name} subtitle={key}/>}
              onChange={(_, value) => {
                setValue('group', value)
                setValue('pkg', null)
                onGroupInputChange.clear()
                setGroupsFilter('')
              }}
              renderInput={(params) =>
                <TextField {...params} label="Group"/>}
              onInputChange={onGroupInputChange}
              onBlur={() => {
                onGroupInputChange.clear()
                setGroupsFilter('')
              }}
              data-testid="GroupAutocomplete"
            />}
          />
        </Box>
      </Tooltip>

      <Tooltip
        disableHoverListener={!!workspaceKey}
        disableFocusListener={!!workspaceKey}
        title="Specify Workspace for Package selection"
      >
        <Box>
          <Controller
            name="pkg"
            control={control}
            render={({ field: { value } }) => <Autocomplete<Package>
              sx={AUTOCOMPLETE_STYLE}
              value={value}
              disabled={!workspaceKey}
              isOptionEqualToValue={(option, value) => option.key === value.key}
              options={packages}
              filterOptions={disableAutocompleteSearch}
              loading={isPackagesLoading}
              getOptionLabel={({ name }: Package) => name}
              renderOption={(props, { key, name }) =>
                <OptionItem key={key} props={props} title={name} subtitle={key}/>}
              onChange={(_, value) => {
                setValue('pkg', value)
                onPackageInputChange.clear()
                setPackagesFilter('')
              }}
              renderInput={(params) =>
                <TextField {...params} label="Package"/>}
              onInputChange={onPackageInputChange}
              onBlur={() => {
                onPackageInputChange.clear()
                setPackagesFilter('')
              }}
              data-testid="PackageAutocomplete"
            />}
          />
        </Box>
      </Tooltip>

      <Controller
        name="version"
        control={control}
        render={({ field }) => <Autocomplete
          forcePopupIcon={false}
          value={field.value ?? null}
          options={handledVersions?.map(version => version.key)}
          isOptionEqualToValue={(option, value) => option === value}
          filterOptions={disableAutocompleteSearch}
          loading={areVersionsInitiallyLoading}
          renderInput={(params) => <TextField {...field} {...params} label="Package version"/>}
          onInputChange={onVersionInputChange}
          onChange={(_, version) => setValue('version', version ?? '')}
          data-testid="PackageVersionAutocomplete"
        />}
      />

      <Controller
        name="status"
        control={control}
        render={({ field }) => <Autocomplete
          freeSolo
          forcePopupIcon={true}
          value={field.value}
          options={VERSION_STATUSES}
          renderOption={(props, option) => <ListItem
            {...props}
            key={option}
            data-testid={`${PUBLISH_STATUSES.get(option)}Option`}
          >
            <VersionStatusChip
              status={option}
              data-testid={`${PUBLISH_STATUSES.get(option)}Chip`}
            />
          </ListItem>}
          onChange={(_, status) => setValue('status', status as VersionStatus)}
          renderInput={(params) =>
            <TextField
              {...field}
              {...params}
              label="Version status"
              required
              InputProps={{
                ...params.InputProps,
                // These styles hide the text in the input for correct view
                sx: {
                  ['& .MuiInputBase-input']: {
                    color: 'transparent',
                    caretColor: 'transparent',
                    '::selection': {
                      background: 'transparent',
                      color: 'transparent',
                    },
                  },
                  ['& .Mui-disabled']: {
                    WebkitTextFillColor: 'transparent',
                  },
                },
                startAdornment: status
                  ? <VersionStatusChip
                    sx={{ height: 16, mb: 1 }}
                    status={status}
                    data-testid={`${PUBLISH_STATUSES.get(status)}Chip`}/>
                  : null,
              }}
            />
          }
          data-testid="VersionStatusAutocomplete"
        />}
      />

      <Controller
        control={control}
        name="publicationDatePeriod"
        render={({ field }) => <DatePicker
          range
          containerStyle={{ width: '100%' }}
          ref={ref}
          value={field.value ?? null}
          calendarPosition="bottom"
          onChange={formatPublicationDate}
          render={(
            value: string | null,
            openCalendar: () => void,
            handleValueChange: (e: ChangeEvent) => void,
          ) =>
            <TextField
              {...field}
              value={value ?? null}
              label="Version publication date"
              onClick={() => ref.current?.openCalendar()}
              onChange={handleValueChange}
              InputProps={{ endAdornment: <CalendarIcon/> }}
              data-testid="DatePicker"/>
          }
        />}
      />
    </Box>

    <Box sx={{ position: 'absolute', bottom: '16px', display: 'flex' }}>
      <Button
        variant="outlined"
        onClick={() => {
          reset()
        }}
        data-testid="ResetButton"
      >
        Reset
      </Button>
    </Box>
  </>
})

type DatePickerRef = {
  openCalendar: () => void
}

const AUTOCOMPLETE_STYLE = {
  '& .MuiAutocomplete-tag': {
    height: '24px',
    marginTop: '4px',
  },
}

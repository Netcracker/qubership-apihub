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
import type {
  GraphQlOperationTypes,
  OptionRestDetailedScope,
  Scopes,
  SearchAsyncApiParams,
  SearchGQLParams,
  SearchRestParams,
} from '@apihub/entities/global-search'
import {
  ANNOTATION_SCOPE,
  ARGUMENT_SCOPE,
  detailedScopeMapping,
  MUTATION_OPERATION_TYPES,
  PROPERTY_SCOPE,
  QUERY_OPERATION_TYPES,
  REQUEST_SCOPE,
  RESPONSE_SCOPE,
  SUBSCRIPTION_OPERATION_TYPES,
} from '@apihub/entities/global-search'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { VersionStatus } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import {
  ARCHIVED_VERSION_STATUS,
  DRAFT_VERSION_STATUS,
  PUBLISH_STATUSES,
  RELEASE_VERSION_STATUS,
  VERSION_STATUSES,
} from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import type { MethodType } from '@netcracker/qubership-apihub-ui-shared/entities/method-types'
import type { Package } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { GROUP_KIND, PACKAGE_KIND, WORKSPACE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { handleVersionsRevision } from '@netcracker/qubership-apihub-ui-shared/utils/versions'
import { useEventBus } from '@apihub/routes/EventBusProvider'
import { disableAutocompleteSearch } from '@netcracker/qubership-apihub-ui-shared/utils/mui'
import { OptionItem } from '@netcracker/qubership-apihub-ui-shared/components/OptionItem'
import { CustomChip } from '@netcracker/qubership-apihub-ui-shared/components/CustomChip'
import { CalendarIcon } from '@netcracker/qubership-apihub-ui-shared/icons/CalendarIcon'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import {
  API_TYPE_ASYNCAPI,
  API_TYPE_GRAPHQL,
  API_TYPE_REST,
  API_TYPE_TITLE_MAP,
  API_TYPES,
} from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import { DEFAULT_DEBOUNCE } from '@netcracker/qubership-apihub-ui-shared/utils/constants'
import { useSystemInfo } from '@netcracker/qubership-apihub-ui-shared/features/system-info'
import {
  useSystemConfigurationContext,
} from '@netcracker/qubership-apihub-ui-agents/src/routes/root/NamespacePage/SystemConfigurationProvider'
import { usePackage } from '@apihub/routes/root/usePackage'

const DEFAULT_WORKSPACE_ID = ''

type FiltersData = Partial<{
  workspace: Package | null
  group: Package | null
  pkg: Package | null
  version: Key
  status: VersionStatus
  publicationDatePeriod: string[]
  apiType: ApiType
  scope: Scopes[]
  detailedScope: OptionRestDetailedScope[]
  operationTypes: GraphQlOperationTypes[]
  methods: MethodType[]
}>

type SearchFilters = {
  enabledFilters: boolean
}

export const SearchFilters: FC<SearchFilters> = memo(({ enabledFilters }) => {
  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
  const defaultPublicationDatePeriod = [oneYearAgo.toISOString(), new Date().toISOString()]

  const systemConfiguration = useSystemConfigurationContext()
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
      apiType: API_TYPE_REST,
      publicationDatePeriod: defaultPublicationDatePeriod,
    },
  })

  useEffect(() => {
    reset({
      workspace: defaultWorkspace,
      group: null,
      pkg: null,
      status: RELEASE_VERSION_STATUS,
      apiType: API_TYPE_REST,
      publicationDatePeriod: defaultPublicationDatePeriod,
    })
  }, [defaultWorkspace])

  const {
    operationTypes,
    apiType,
    methods,
    version,
    status,
    publicationDatePeriod,
    detailedScope,
    scope,
  } = watch()

  const workspaceKey = watch().workspace?.key
  const packageKey = watch().pkg?.key

  const [workspacesFilter, setWorkspacesFilter] = useState('')
  const { packages: workspaces, isLoading: isWorkspacesLoading } = usePackages({
    kind: WORKSPACE_KIND,
    enabled: enabledFilters,
    textFilter: workspacesFilter,
  })
  const onWorkspaceInputChange = useMemo(() => debounce((_: SyntheticEvent, value: string) =>
    setWorkspacesFilter(value), DEFAULT_DEBOUNCE), [])

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
    const formattedPublicationDate = periodOfTime
      ? (periodOfTime as DateObject[]).map((period, index) => {
        const date = period.toDate()

        if (index === 0) {
          date.setHours(0, 0, 0, 0)
        } else {
          date.setHours(23, 59, 59, 999)
        }

        return date.toISOString()
      })
      : undefined

    setValue('publicationDatePeriod', formattedPublicationDate)
  }, [setValue])

  const { useV3Search } = useSystemInfo()

  const onSubmit = useMemo(
    () => handleSubmit((value) => {
      const {
        version,
        status,
        publicationDatePeriod,
        apiType,
      } = value

      const versionData = version ? [version] : []
      const packageIdsData = (): string[] => {
        if (packageKey) {
          return [packageKey]
        }
        if (groupKey) {
          return [groupKey]
        }
        if (workspaceKey) {
          return [workspaceKey]
        }
        return []
      }
      const restDetailedScope = detailedScope?.map(scope => detailedScopeMapping[scope])

      const apiTypeOperationsParams: Record<ApiType, SearchRestParams | SearchGQLParams> =
        {
          [API_TYPE_REST]: {
            apiType: apiType,
            scope: [REQUEST_SCOPE, RESPONSE_SCOPE],
            detailedScope: restDetailedScope,
            methods: methods,
          } satisfies SearchRestParams,
          [API_TYPE_GRAPHQL]: {
            apiType: apiType,
            scope: [ARGUMENT_SCOPE, PROPERTY_SCOPE, ANNOTATION_SCOPE],
            operationTypes: [QUERY_OPERATION_TYPES, MUTATION_OPERATION_TYPES, SUBSCRIPTION_OPERATION_TYPES],
          } satisfies SearchGQLParams,
          [API_TYPE_ASYNCAPI]: {
            apiType: apiType,
          } as SearchAsyncApiParams,
        }

      const globalSearchFilter = useV3Search
        ? {
          filters: {
            packageIds: packageIdsData(),
            versions: versionData,
            statuses: [DRAFT_VERSION_STATUS, RELEASE_VERSION_STATUS, ARCHIVED_VERSION_STATUS] as VersionStatus[],
            creationDateInterval: {
              startDate: publicationDatePeriod?.[0] ?? '',
              endDate: publicationDatePeriod?.[1] ?? '',
            },
            operationParams:
              apiType
                ? apiTypeOperationsParams[apiType]
                : {},
          },
          apiSearchMode: true,
        }
        : {
          filters: {
            workspace: workspaceKey,
            packageIds: packageKey ? [packageKey] : [],
            versions: versionData,
            status: status as VersionStatus,
            creationDateInterval: {
              startDate: publicationDatePeriod?.[0] ?? '',
              endDate: publicationDatePeriod?.[1] ?? '',
            },
            apiType: apiType,
          },
        }

      applyGlobalSearchFilters(globalSearchFilter)
    }),
    [handleSubmit, useV3Search, applyGlobalSearchFilters, packageKey, groupKey, workspaceKey],
  )

  useDebounce(
    onSubmit,
    500,
    [
      workspaceKey,
      groupKey,
      operationTypes,
      packageKey,
      apiType,
      detailedScope,
      methods,
      scope,
      status,
      version,
      publicationDatePeriod,
    ],
  )

  return <>
    <Typography sx={{ mb: 2, mt: 1 }} variant="h3">Filters</Typography>
    <Box component="form" sx={{ overflow: 'scroll', height: 'calc(100% - 60px)', pr: 1 }}>
      <Controller
        name="apiType"
        control={control}
        render={({ field: { value, onChange } }) => <Autocomplete
          value={value ?? null}
          options={API_TYPES}
          getOptionLabel={(option) => API_TYPE_TITLE_MAP[option]!}
          isOptionEqualToValue={(option, value) => option === value}
          renderOption={(props, option) => (
            <ListItem
              {...props}
              key={option}
              data-testid={`Option-${option}`}
            >
              {API_TYPE_TITLE_MAP[option]!}
            </ListItem>
          )}
          onChange={(_, type) => {
            setValue('scope', [])
            setValue('detailedScope', [])
            setValue('methods', [])
            setValue('operationTypes', [])
            onChange(type)
          }}
          renderInput={(params) => (
            <TextField
              required
              {...params}
              label="API type"
              sx={{ mt: 0 }}
              error={!!errors.apiType}
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
            <CustomChip
              value={option}
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
                  ? <CustomChip
                    sx={{ height: 16, mb: 1 }}
                    value={status}
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

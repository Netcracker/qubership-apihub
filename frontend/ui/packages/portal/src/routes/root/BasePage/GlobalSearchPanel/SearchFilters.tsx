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

import type { ChangeEvent, FC, ReactElement, SyntheticEvent } from 'react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Autocomplete,
  type AutocompleteChangeReason,
  Box,
  Button,
  capitalize,
  Checkbox,
  debounce,
  Divider,
  FormControlLabel,
  ListItem,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { Controller, useForm } from 'react-hook-form'
import { usePackageVersions } from '@netcracker/qubership-apihub-ui-shared/hooks/versions/usePackageVersions'

import type { DateObject } from 'react-multi-date-picker'
import DatePicker from 'react-multi-date-picker'

import { usePackages } from '@netcracker/qubership-apihub-ui-shared/hooks/packages/usePackages'
import { useDebounce } from 'react-use'
import { OPERATIONS_TAB, useGlobalSearchActiveTab } from './GlobalSearchTextProvider'
import type {
  GraphQlOperationTypes,
  OptionRestDetailedScope,
  Scopes,
  SearchGQLParams,
  SearchRestParams,
} from '@apihub/entities/global-search'
import {
  API_TYPE_SCOPES_MAP,
  DETAILED_SCOPES,
  detailedScopeMapping,
  OPERATIONS_TYPES,
} from '@apihub/entities/global-search'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { VersionStatus } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import {
  PUBLISH_STATUSES,
  RELEASE_VERSION_STATUS,
  VERSION_STATUSES,
} from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import type { MethodType } from '@netcracker/qubership-apihub-ui-shared/entities/method-types'
import { METHOD_TYPES } from '@netcracker/qubership-apihub-ui-shared/entities/method-types'
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
  API_TYPE_GRAPHQL,
  API_TYPE_REST,
  API_TYPE_TITLE_MAP,
  API_TYPES,
} from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import { DEFAULT_API_TYPE } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { DEFAULT_DEBOUNCE } from '@netcracker/qubership-apihub-ui-shared/utils/constants'

type FiltersData = Partial<{
  workspace: Package | null
  group: Package | null
  pkg: Package | null
  versions: Key
  statuses: VersionStatus[]
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
      statuses: [RELEASE_VERSION_STATUS],
      publicationDatePeriod: defaultPublicationDatePeriod,
    },
  })

  const {
    operationTypes,
    apiType,
    methods,
    versions,
    statuses,
    publicationDatePeriod,
    detailedScope,
    scope,
  } = watch()

  const activeTab = useGlobalSearchActiveTab()

  const workspaceKey = watch().workspace?.key

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

  const packageKey = watch().pkg?.key

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

  const [packageVersions] = usePackageVersions({ packageKey })
  const handledVersions = handleVersionsRevision(packageVersions)

  const ref = useRef<DatePickerRef>()

  const [apiSearchMode, setApiSearchMode] = useState(false)
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

  useEffect(() => {
    if (activeTab !== OPERATIONS_TAB) {
      setApiSearchMode(false)
      setValue('apiType', undefined)
      setValue('scope', [])
      setValue('detailedScope', [])
      setValue('methods', [])
      setValue('operationTypes', [])
    }
  }, [activeTab, setValue])

  const onSubmit = useMemo(
    () => handleSubmit((value) => {
      const {
        versions,
        statuses,
        publicationDatePeriod,
        apiType,
        scope,
        detailedScope,
        operationTypes,
        methods,
      } = value

      const versionData = versions ? [versions] : []
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

      const apiTypeOperationsParams: Record<ApiType, SearchRestParams | SearchGQLParams> = {
        [API_TYPE_REST]: {
          apiType: apiType,
          scope: scope,
          detailedScope: restDetailedScope,
          methods: methods,
        } satisfies SearchRestParams,
        [API_TYPE_GRAPHQL]: {
          apiType: apiType,
          scope: scope,
          operationTypes: operationTypes,
        } satisfies SearchGQLParams,
      }

      applyGlobalSearchFilters({
        filters: {
          packageIds: packageIdsData(),
          versions: versionData,
          statuses: statuses,
          creationDateInterval: {
            startDate: publicationDatePeriod?.[0] ?? '',
            endDate: publicationDatePeriod?.[1] ?? '',
          },
          operationParams:
            apiType
              ? apiTypeOperationsParams[apiType]
              : {},
        },
        apiSearchMode: apiSearchMode,
      })
    }),
    [apiSearchMode, applyGlobalSearchFilters, packageKey, groupKey, handleSubmit, workspaceKey],
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
      statuses,
      versions,
      publicationDatePeriod,
    ],
  )

  const apiTypeFormMap: Record<ApiType, ReactElement> = useMemo(() => ({
    [API_TYPE_REST]: (
      <>
        <Controller
          name="detailedScope"
          control={control}
          render={({ field }) => <Autocomplete<OptionRestDetailedScope, true>
            disabled={!apiSearchMode}
            sx={AUTOCOMPLETE_STYLE}
            multiple
            value={field.value ?? []}
            options={DETAILED_SCOPES}
            renderOption={(props, option) => <ListItem
              {...props}
              key={option}
              data-testid={`${capitalize(option)}Option`}
            >
              {capitalize(option)}
            </ListItem>}
            onChange={(_, scopes) => setValue('detailedScope', scopes)}
            renderInput={(params) =>
              <TextField
                {...field}
                {...params}
                label="Detailed search scope"
                inputProps={{
                  ...params.inputProps,
                  readOnly: true,
                }}
              />
            }
            data-testid="DetailedSearchScopeAutocomplete"
          />}
        />

        <Controller
          name="methods"
          control={control}
          render={({ field }) => <Autocomplete<MethodType, true>
            disabled={!apiSearchMode}
            sx={AUTOCOMPLETE_STYLE}
            multiple
            value={field.value ?? []}
            options={Array.from(METHOD_TYPES)}
            isOptionEqualToValue={(option, value) => option === value}
            renderOption={(props, option) => <ListItem
              {...props}
              key={option}
              data-testid={`${capitalize(option)}Option`}
            >
              {option.toUpperCase()}
            </ListItem>}
            onChange={(_, methods) => setValue('methods', methods)}
            renderInput={(params) =>
              <TextField
                {...field}
                {...params}
                label="Methods"
                inputProps={{
                  ...params.inputProps,
                  readOnly: true,
                }}
              />
            }
            data-testid="MethodsAutocomplete"
          />}
        />
      </>
    ),
    [API_TYPE_GRAPHQL]: (
      <>
        <Controller
          name="operationTypes"
          control={control}
          render={({ field: { value } }) => (
            <Autocomplete<GraphQlOperationTypes, true>
              disabled={!apiSearchMode}
              sx={AUTOCOMPLETE_STYLE}
              multiple
              value={value ?? []}
              options={OPERATIONS_TYPES}
              renderOption={(props, option) => <ListItem
                {...props}
                key={option}
                data-testid={`${capitalize(option)}Option`}
              >
                {capitalize(option)}
              </ListItem>}
              onChange={(_, operationType) => setValue('operationTypes', operationType)}
              renderInput={(params) =>
                <TextField
                  {...params}
                  label="Operation type"
                  inputProps={{
                    ...params.inputProps,
                    readOnly: true,
                  }}
                />
              }
              data-testid="OperationTypesAutocomplete"
            />
          )}
        />
      </>
    ),
  }), [apiSearchMode, control, setValue])

  return useMemo(() => (<>
      <Typography sx={{ mb: 2 }} variant="subtitle1">Filters</Typography>
      <Box component="form" sx={{ overflow: 'scroll', height: 'calc(100% - 60px)', pr: 1 }}>
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
              <TextField {...params} label="Workspace"/>}
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
          name="versions"
          control={control}
          render={({ field }) => <Autocomplete
            forcePopupIcon={false}
            value={field.value ?? null}
            options={handledVersions?.map(version => version.key)}
            isOptionEqualToValue={(option, value) => option === value}
            renderInput={(params) => <TextField {...field} {...params} label="Package version"/>}
            onChange={(_, version) => setValue('versions', version ?? '')}
            data-testid="PackageVersionAutocomplete"
          />}
        />

        <Controller
          name="statuses"
          control={control}
          render={({ field }) => <Autocomplete
            multiple freeSolo
            forcePopupIcon={true}
            value={field.value ?? []}
            options={VERSION_STATUSES}
            renderOption={(props, option) => <ListItem
              {...props}
              key={option}
              data-testid={`${PUBLISH_STATUSES.get(option)}Option`}
            >
              {PUBLISH_STATUSES.get(option)}
            </ListItem>}
            renderTags={(value, getTagProps) => (
              value.map((option, index) => <CustomChip
                {...getTagProps({ index })}
                key={index}
                value={option}
                data-testid={`${PUBLISH_STATUSES.get(option)}Chip`}
              />)
            )}
            onChange={(_, statuses) => setValue('statuses', statuses as VersionStatus[])}
            renderInput={(params) =>
              <TextField
                {...field}
                {...params}
                label="Version status"
                inputProps={{
                  ...params.inputProps,
                  readOnly: true,
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

        <Divider orientation="horizontal" variant="fullWidth" sx={{ mt: 1, mb: 1 }}/>
        <Typography sx={{ mb: 2 }} variant="subtitle1">API specific params</Typography>

        <Box display="flex" gap={1}>
          <FormControlLabel
            label="Search only"
            control={<Checkbox
              onChange={(_, checked) => {
                setApiSearchMode(checked)
                setValue('apiType', checked ? DEFAULT_API_TYPE : undefined)
                setValue('scope', undefined)
                setValue('detailedScope', undefined)
                setValue('methods', undefined)
              }}
              checked={apiSearchMode}
              disabled={activeTab !== OPERATIONS_TAB}
              data-testid="SearchOnlyCheckbox"
            />}
          />

          <Box sx={{ m: 0, width: '150px', ml: 'auto' }}>
            <Controller
              name="apiType"
              control={control}
              rules={{ required: apiSearchMode }}
              render={({ field: { value, onChange } }) => <Autocomplete
                disabled={!apiSearchMode}
                sx={AUTOCOMPLETE_STYLE}
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
                    required={apiSearchMode}
                    {...params}
                    label="API type"
                    error={!!errors.apiType}
                  />
                )}
                data-testid="ApiTypeAutocomplete"
              />}
            />
          </Box>
        </Box>

        {apiType &&
          <>
            <Controller
              name="scope"
              control={control}
              render={({ field }) => <ScopesAutocomplete<Scopes>
                value={field.value ?? []}
                options={API_TYPE_SCOPES_MAP[apiType]}
                onChange={(_, scopes) => setValue('scope', scopes)}
                label="Search scope"
                disabled={!apiSearchMode}
              />}
            />
            {apiTypeFormMap[apiType]}
          </>
        }
      </Box>

      <Box sx={{ position: 'absolute', bottom: '16px', display: 'flex' }}>
        <Button
          variant="outlined"
          onClick={() => {
            reset()
            setApiSearchMode(false)
          }}
          data-testid="ResetButton"
        >
          Reset
        </Button>
      </Box>
    </>
  ), [activeTab, apiSearchMode, apiType, apiTypeFormMap, control, errors.apiType, formatPublicationDate, groups, handledVersions, isWorkspacesLoading, isGroupsLoading, isPackagesLoading, packages, reset, setValue, workspaceKey, workspaces, onGroupInputChange, onPackageInputChange, onWorkspaceInputChange])
})

function ScopesAutocomplete<T extends Key>({
  value,
  options,
  onChange,
  label,
  disabled,
}: ScopesAutocompleteProps<T>): JSX.Element {
  return (
    <Autocomplete<T, true>
      sx={AUTOCOMPLETE_STYLE}
      disabled={disabled}
      multiple
      value={value ?? []}
      options={options}
      isOptionEqualToValue={(option, value) => option === value}
      renderOption={(props, option) => <ListItem
        {...props}
        key={option}
        data-testid={`${capitalize(option)}Option`}
      >
        {capitalize(option)}
      </ListItem>}
      onChange={onChange}
      renderInput={(params) =>
        <TextField
          {...params}
          label={label}
          value={value?.map(item => capitalize(item))}
          inputProps={{
            ...params.inputProps,
            readOnly: true,
          }}
        />
      }
      data-testid="SearchScopeAutocomplete"
    />
  )
}

type ScopesAutocompleteProps<T> = {
  value: T[]
  options: T[]
  onChange: (
    event: SyntheticEvent,
    value: T[] | undefined,
    reason: AutocompleteChangeReason,
  ) => void
  label: string
  disabled: boolean
}

type DatePickerRef = {
  openCalendar: () => void
}

const AUTOCOMPLETE_STYLE = {
  '& .MuiAutocomplete-tag': {
    height: '24px',
    marginTop: '4px',
  },
}

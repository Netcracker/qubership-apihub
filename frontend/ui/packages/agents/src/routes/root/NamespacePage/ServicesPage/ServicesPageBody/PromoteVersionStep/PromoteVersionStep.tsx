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

import { type FC, memo, useCallback, useEffect, useMemo, useState } from 'react'
import { Autocomplete, Box, Checkbox, FormControlLabel, MenuItem, styled, TextField, Typography } from '@mui/material'
import { useServices } from '../../../useServices'
import type { Control, FieldErrors } from 'react-hook-form'
import { Controller, useForm } from 'react-hook-form'
import { LoadingButton } from '@mui/lab'

import type { IsLoading, IsSuccess } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'

import { filterServices } from '../../services'
import { PromoteVersionStepTable } from './PromoteVersionStepTable'
import type { PromoteVersion } from './usePromoteVersion'
import { usePromoteVersion } from './usePromoteVersion'
import type { Service } from '@agents/entities/services'
import type { ServicePublishInfo } from '@agents/entities/service-publish-info'
import { usePromoteVersionStepStatus } from './usePromoteVersionStepStatus'
import type { BaselineOptions } from '../../../baselineOptions'
import { useBaselineOptions } from '../../../useBaselineOptions'
import { useVersionOptions } from '../../../AutomationPage/useVersionOptions'
import {
  DRAFT_VERSION_STATUS,
  PUBLISH_STATUSES,
  RELEASE_VERSION_STATUS,
  type VersionStatus,
} from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import {
  checkVersionNotEqualToPrevious,
  checkVersionRestrictedSymbols,
} from '@netcracker/qubership-apihub-ui-shared/utils/validations'
import { SearchBar } from '@netcracker/qubership-apihub-ui-shared/components/SearchBar'
import { VersionSelectorAutocomplete } from '@netcracker/qubership-apihub-ui-shared/components/Autocompletes/VersionSelectorAutocomplete'
import { VersionErrorFormMessage } from '@netcracker/qubership-apihub-ui-shared/components/ErrorIndicators/VersionErrorFormMessage'
import { VersionErrorIndicator } from '@netcracker/qubership-apihub-ui-shared/components/ErrorIndicators/VersionErrorIndicator'
import { agent } from '@netcracker/qubership-apihub-ui-shared/utils/version-info'
import { ErrorIndicator } from '@netcracker/qubership-apihub-ui-shared/components/ErrorIndicators/ErrorIndicator'
import { PUBLICATION_ERROR_MESSAGES } from '@netcracker/qubership-apihub-ui-shared/utils/publicationErrorMessages'
import { useVersionProblemDetails } from '@netcracker/qubership-apihub-ui-shared/hooks/versions/useVersionProblemDetails'
import { VERSION_PROBLEM_DIALOG_SURFACE } from '@netcracker/qubership-apihub-ui-shared/hooks/versions/versionProblemDetails'
import {
  CONTENT_PLACEHOLDER_AREA,
  NO_SEARCH_RESULTS,
  Placeholder,
} from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import type { ServiceKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import {
  useCreateSnapshotPublicationOptions,
  usePromoteVersionPublicationOptions,
} from '../../ServicesPageProvider/ServicesPublicationOptionsProvider'
import {
  RUNNING_STEP_STATUS,
  SUCCESS_STEP_STATUS,
  usePromoteVersionStep,
} from '../../ServicesPageProvider/ServicesStepsProvider'
import { useSnapshotPublicationInfo } from '../../../useSnapshotPublicationInfo'

export const PromoteVersionStep: FC = memo(() => {
  const [promoteVersion, isLoading] = usePromoteVersion()
  const [
    control,
    nameOptions,
    baselineOptions,
    onSubmit,
    isCreateSnapshotRunning,
    isCreateSnapshotSuccess,
    isPromoteAvailable,
    status,
    previousVersion,
    formErrors,
    isReleaseRefused,
  ] = useToolbarData(promoteVersion)

  const previousVersionFlags = baselineOptions.flagsByVersionKey.get(previousVersion)
  const {
    hasProblems: previousVersionHasProblems,
    isBlocking: isPreviousVersionBlocking,
    formHelperText: previousVersionErrorMessage,
  } = useVersionProblemDetails({
    versionKey: previousVersion,
    hasErrors: previousVersionFlags?.hasErrors,
    changelogHasErrors: previousVersionFlags?.changelogHasErrors,
    apiProcessorVersion: previousVersionFlags?.apiProcessorVersion,
    surface: VERSION_PROBLEM_DIALOG_SURFACE.PUBLISH_PREVIOUS_VERSION,
  })

  const areControlsDisabled = isLoading || isCreateSnapshotRunning
  const [repromoteEnabled, setRepromoteEnabled] = useState(false)
  useEffect(() => {
    if (!repromoteEnabled && isCreateSnapshotSuccess) {
      setRepromoteEnabled(true)
    }
  }, [repromoteEnabled, isCreateSnapshotSuccess, setRepromoteEnabled])
  const [{ services }, isServicesLoading] = useServices({ onlyWithSpecs: true })

  const [searchValue, setSearchValue] = useState('')
  const [showOnlyPromotable, setShowOnlyPromotable] = useState(false)

  const filteredServices = useMemo(() => {
    const filteredData = filterServices(searchValue, services)
    return showOnlyPromotable
      ? filteredData.filter(service => service.availablePromoteStatuses?.includes(status))
      : filteredData
  }, [status, searchValue, services, showOnlyPromotable])

  const promotableFilter = useCallback(
    (service: Service): boolean => (showOnlyPromotable ? !!service.availablePromoteStatuses?.includes(status) : true),
    [showOnlyPromotable, status],
  )

  return (
    <Box
      height="100%"
      component="form"
      onSubmit={onSubmit}
    >
      <Box
        sx={{
          gap: 2,
          alignItems: 'flex-start',
          display: 'grid',
          gridTemplateRows: 'max-content',
          gridTemplateColumns: '200px 200px 200px 200px 1fr',
        }}
      >
        <Controller
          name="version"
          control={control}
          rules={{
            validate: {
              checkSpaces: (version) => {
                if (status === RELEASE_VERSION_STATUS) {
                  return /^[1-9][0-9]{3}\.[1-4]{1}$/ig.test(version) ||
                    'The release version must have the format: YYYY.Q, where YYYY is the year, Q is the quarter of the year'
                }
              },
              restrictedSymbols: checkVersionRestrictedSymbols,
              notEqualToPrevious: (version) => checkVersionNotEqualToPrevious(version, previousVersion),
            },
          }}
          render={({ field: { value, onChange } }) => (
            <Autocomplete
              freeSolo
              disabled={areControlsDisabled}
              value={value}
              options={nameOptions}
              renderInput={(params) => (
                <TextField
                  {...params}
                  data-testid="VersionAutocomplete"
                  required
                  label="Version"
                  variant="outlined"
                  onChange={onChange}
                  error={!!formErrors.version}
                />
              )}
              onChange={(_, value) => onChange(value)}
            />
          )}
        />

        <Controller
          name="previousVersion"
          control={control}
          render={({ field: { value, onChange } }) => (
            <VersionSelectorAutocomplete
              freeSolo
              disabled
              value={value}
              options={baselineOptions.versionKeys}
              inputIndicator={previousVersionHasProblems && previousVersionFlags && (
                <VersionErrorIndicator
                  app={agent}
                  versionKey={previousVersion}
                  hasErrors={previousVersionFlags.hasErrors}
                  changelogHasErrors={previousVersionFlags.changelogHasErrors}
                  apiProcessorVersion={previousVersionFlags.apiProcessorVersion}
                />
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  data-testid="PreviousVersionAutocomplete"
                  required
                  label="Previous Version"
                  variant="outlined"
                  error={isPreviousVersionBlocking}
                  onChange={onChange}
                />
              )}
              onChange={(_, value) => onChange(value)}
            />
          )}
        />

        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              data-testid="StatusSelect"
              select required
              type="select"
              disabled={areControlsDisabled}
              label="Status"
              variant="outlined"
              SelectProps={{
                renderValue: () => <StatusSelectValue status={status} isReleaseRefused={isReleaseRefused}/>,
              }}
            >
              <MenuItem value={DRAFT_VERSION_STATUS}>Draft</MenuItem>
              <MenuItem value={RELEASE_VERSION_STATUS}>Release</MenuItem>
            </TextField>
          )}
        />

        <Box sx={{ ml: 'auto', alignSelf: 'baseline', mt: 1 }}>
          <LoadingButton
            data-testid={repromoteEnabled ? 'RePromoteVersionButton' : 'PromoteVersionButton'}
            sx={{ width: repromoteEnabled ? 180 : 160 }}
            disabled={areControlsDisabled || !isPromoteAvailable || isPreviousVersionBlocking || isReleaseRefused}
            variant={repromoteEnabled ? 'outlined' : 'contained'}
            loading={isLoading || isCreateSnapshotRunning}
            type="submit"
          >
            {repromoteEnabled ? 'Re-promote Version' : 'Promote Version'}
          </LoadingButton>
        </Box>

        <Box sx={{ alignSelf: 'center', ml: 'auto' }}>
          <SearchBar
            value={searchValue}
            onValueChange={setSearchValue}
          />
        </Box>
      </Box>

      <Box height="100%">
        <Typography
          data-testid="VersionFormatErrorTypography"
          noWrap
          variant="subtitle2"
          color="#FF5260"
        >
          {formErrors.version?.message}
        </Typography>

        <VersionErrorFormMessage
          message={previousVersionErrorMessage}
          data-testid="PreviousVersionErrorMessage"
        />

        <FormControlLabel
          data-testid="OnlyPromotableCheckbox"
          label="Show only available services"
          control={<Checkbox onChange={(_, checked) => setShowOnlyPromotable(checked)}/>}
        />

        <Controller
          name="serviceKeys"
          control={control}
          render={({ field: { onChange, value } }) => (
            <Placeholder
              invisible={isNotEmpty(filteredServices) || isServicesLoading}
              area={CONTENT_PLACEHOLDER_AREA}
              message={NO_SEARCH_RESULTS}
            >
              <PromoteVersionStepTable
                selectable={!areControlsDisabled}
                selected={value}
                onSelect={onChange}
                services={services}
                promoteStatus={status}
                searchValue={searchValue}
                filter={promotableFilter}
                isServicesLoading={isServicesLoading}
              />
            </Placeholder>
          )}
        />
      </Box>
    </Box>
  )
})

type StatusSelectValueProps = {
  status: VersionStatus
  isReleaseRefused: boolean
}

const StatusSelectValue: FC<StatusSelectValueProps> = memo<StatusSelectValueProps>(({ status, isReleaseRefused }) => (
  <StatusValue>
    <Typography noWrap variant="inherit">{PUBLISH_STATUSES.get(status)}</Typography>
    <ErrorIndicator
      hasProblems={isReleaseRefused}
      tooltip={PUBLICATION_ERROR_MESSAGES.agent.promoteReleaseRefused}
      fontSize="extra-small"
      tabIndex={-1}
      data-testid="ReleaseRefusedIndicator"
    />
  </StatusValue>
))

StatusSelectValue.displayName = 'StatusSelectValue'

type FormData = {
  version: string
  previousVersion: string
  serviceKeys: ServiceKey[]
  status: VersionStatus
}

type VersionOptions = string[]
type OnSubmit = () => void
type IsPromoteAvailable = boolean
type IsReleaseRefused = boolean

const StatusValue = styled(Box)(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}))

function useToolbarData(
  promoteVersion: PromoteVersion,
): [
  Control<FormData>,
  VersionOptions,
  BaselineOptions,
  OnSubmit,
  IsLoading,
  IsSuccess,
  IsPromoteAvailable,
  VersionStatus,
  FormData['previousVersion'],
  FieldErrors<FormData>,
  IsReleaseRefused,
] {
  const { createSnapshotPublicationOptions: { baseline, name } } = useCreateSnapshotPublicationOptions()
  const {
    promotePublicationOptions: {
      previousVersion,
      serviceKeys,
      status,
      version,
    },
  } = usePromoteVersionPublicationOptions()

  const defaultValues: FormData = useMemo(() => ({
    version: version || name,
    previousVersion: previousVersion || baseline,
    status: status,
    serviceKeys: serviceKeys,
  }), [baseline, name, previousVersion, serviceKeys, status, version])

  const { reset, handleSubmit, watch, control, formState: { errors } } = useForm<FormData>({ defaultValues })

  useEffect(() => reset(defaultValues), [defaultValues, reset])

  const onSubmit = useMemo(
    () => handleSubmit(promotionOptions => promoteVersion(promotionOptions)),
    [handleSubmit, promoteVersion],
  )

  const versionOptions = useVersionOptions()

  const [, setPromoteVersionStep] = usePromoteVersionStep()
  const stepStatus = usePromoteVersionStepStatus()
  useEffect(() => setPromoteVersionStep(prevState => ({
    ...prevState,
    status: stepStatus,
  })), [setPromoteVersionStep, stepStatus])

  const {
    previousVersion: previousVersionForm,
    version: versionForm,
    status: statusForm,
    serviceKeys: serviceKeysForm,
  } = watch()

  // Create Snapshot already blocks a previous version with problems for the services of the snapshot, so this field
  // normally shows no problem. The check stays as a safeguard.
  const previousVersionOptions = useBaselineOptions({ selectedServiceKeys: serviceKeysForm })

  const { snapshotPublicationInfo } = useSnapshotPublicationInfo({ promote: true })

  const isPromoteVersionAvailable = !!previousVersionForm && !!versionForm && !!statusForm && isNotEmpty(serviceKeysForm)

  const isReleaseRefused = statusForm === RELEASE_VERSION_STATUS &&
    hasUnsoundSnapshotVersion(snapshotPublicationInfo.services, serviceKeysForm)

  return [
    control,
    versionOptions,
    previousVersionOptions,
    onSubmit,
    stepStatus === RUNNING_STEP_STATUS,
    stepStatus === SUCCESS_STEP_STATUS,
    isPromoteVersionAvailable,
    statusForm,
    previousVersionForm,
    errors,
    isReleaseRefused,
  ]
}

function hasUnsoundSnapshotVersion(
  services: ReadonlyArray<ServicePublishInfo>,
  selectedServiceKeys: ReadonlyArray<ServiceKey>,
): boolean {
  return services.some(({ key, hasErrors, changelogHasErrors }) =>
    (hasErrors || changelogHasErrors) && selectedServiceKeys.includes(key),
  )
}

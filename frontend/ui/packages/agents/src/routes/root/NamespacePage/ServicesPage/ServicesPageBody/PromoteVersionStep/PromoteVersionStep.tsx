import { type FC, memo, useCallback, useEffect, useMemo, useState } from 'react'
import { Autocomplete, Box, Button, Checkbox, FormControlLabel, MenuItem, styled, Typography } from '@mui/material'
import { useServices } from '../../../useServices'
import type { Control, FieldErrors } from 'react-hook-form'
import { Controller, useForm } from 'react-hook-form'

import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'

import { PromoteVersionStepSections } from './PromoteVersionStepSections'
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
import { OutlinedTextField } from '@netcracker/qubership-apihub-ui-shared/components/TextFields/OutlinedTextField'
import { SearchBar } from '@netcracker/qubership-apihub-ui-shared/components/SearchBar'
import { VersionSelectorAutocomplete } from '@netcracker/qubership-apihub-ui-shared/components/Autocompletes/VersionSelectorAutocomplete'
import { VersionErrorFormMessage } from '@netcracker/qubership-apihub-ui-shared/components/ErrorIndicators/VersionErrorFormMessage'
import { VersionFieldErrorIndicator } from '@netcracker/qubership-apihub-ui-shared/components/ErrorIndicators/VersionFieldErrorIndicator'
import { agent } from '@netcracker/qubership-apihub-ui-shared/utils/version-info'
import { ErrorIndicator } from '@netcracker/qubership-apihub-ui-shared/components/ErrorIndicators/ErrorIndicator'
import { PUBLICATION_ERROR_MESSAGES } from '@netcracker/qubership-apihub-ui-shared/utils/publicationErrorMessages'
import { useVersionProblemDetails } from '@netcracker/qubership-apihub-ui-shared/hooks/versions/useVersionProblemDetails'
import { VERSION_PROBLEM_DIALOG_SURFACE } from '@netcracker/qubership-apihub-ui-shared/hooks/versions/versionProblemDetails'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import type { ServiceKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import {
  useLastSnapshotPublication,
  usePromoteVersionPublicationOptions,
} from '../../ServicesPageProvider/ServicesPublicationOptionsProvider'
import {
  COMPLETE_STEP_STATUS,
  PROMOTE_VERSION_STEP_KEY,
  RUNNING_STEP_STATUS,
} from '../../ServicesPageProvider/servicesSteps'
import { useSetStepStatus } from '../../ServicesPageProvider/ServicesStepsProvider'
import { useSnapshotPublicationInfo } from '../../../useSnapshotPublicationInfo'

export const PromoteVersionStep: FC = memo(() => {
  const [promoteVersion, isPromoting] = usePromoteVersion()
  const [
    control,
    nameOptions,
    baselineOptions,
    onSubmit,
    isPromotionRunning,
    isRepromotion,
    isPromoteAvailable,
    status,
    previousVersion,
    formErrors,
    isReleaseRefused,
  ] = useToolbarData(promoteVersion, isPromoting)

  const previousVersionFlags = baselineOptions.flagsByVersionKey.get(previousVersion)
  const previousVersionProblem = useVersionProblemDetails({
    versionKey: previousVersion,
    hasErrors: previousVersionFlags?.hasErrors,
    changelogHasErrors: previousVersionFlags?.changelogHasErrors,
    apiProcessorVersion: previousVersionFlags?.apiProcessorVersion,
    surface: VERSION_PROBLEM_DIALOG_SURFACE.PUBLISH_PREVIOUS_VERSION,
    app: agent,
  })

  const areControlsDisabled = isPromotionRunning
  const [{ services }, isServicesLoading] = useServices({ onlyWithSpecs: true })

  const [searchValue, setSearchValue] = useState('')
  const [showOnlyPromotable, setShowOnlyPromotable] = useState(false)

  const promotableFilter = useCallback(
    (service: Service): boolean => (showOnlyPromotable ? !!service.availablePromoteStatuses?.includes(status) : true),
    [showOnlyPromotable, status],
  )

  return (
    <Box
      component="form"
      display="flex"
      flexDirection="column"
      flex={1}
      minHeight={0}
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
                <OutlinedTextField
                  {...params}
                  data-testid="VersionAutocomplete"
                  required
                  label="Version"
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
              inputIndicator={previousVersionProblem.hasProblems && (
                <VersionFieldErrorIndicator problem={previousVersionProblem}/>
              )}
              renderInput={(params) => (
                <OutlinedTextField
                  {...params}
                  data-testid="PreviousVersionAutocomplete"
                  required
                  label="Previous Version"
                  error={previousVersionProblem.isBlocking}
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
            <OutlinedTextField
              {...field}
              data-testid="StatusSelect"
              select required
              type="select"
              disabled={areControlsDisabled}
              label="Status"
              SelectProps={{
                renderValue: () => <StatusSelectValue status={status} isReleaseRefused={isReleaseRefused}/>,
              }}
            >
              <MenuItem value={DRAFT_VERSION_STATUS}>Draft</MenuItem>
              <MenuItem value={RELEASE_VERSION_STATUS}>Release</MenuItem>
            </OutlinedTextField>
          )}
        />

        <Box sx={{ ml: 'auto', alignSelf: 'center' }}>
          <Button
            data-testid={isRepromotion ? 'RePromoteVersionButton' : 'PromoteVersionButton'}
            sx={{ width: isRepromotion ? 180 : 160 }}
            disabled={areControlsDisabled || !isPromoteAvailable || previousVersionProblem.isBlocking || isReleaseRefused}
            variant={isRepromotion ? 'outlined' : 'contained'}
            type="submit"
          >
            {isRepromotion ? 'Re-promote Version' : 'Promote Version'}
          </Button>
        </Box>

        <Box sx={{ alignSelf: 'center', ml: 'auto' }}>
          <SearchBar
            value={searchValue}
            onValueChange={setSearchValue}
          />
        </Box>
      </Box>

      <Box display="flex" flexDirection="column" flex={1} minHeight={0}>
        <Typography
          data-testid="VersionFormatErrorTypography"
          noWrap
          variant="subtitle2"
          color="#FF5260"
        >
          {formErrors.version?.message}
        </Typography>

        <VersionErrorFormMessage
          message={previousVersionProblem.formHelperText}
          data-testid="PreviousVersionErrorMessage"
        />

        <FormControlLabel
          sx={{ alignSelf: 'flex-start' }}
          data-testid="OnlyPromotableCheckbox"
          label="Show only available services"
          control={<Checkbox onChange={(_, checked) => setShowOnlyPromotable(checked)}/>}
        />

        <Controller
          name="serviceKeys"
          control={control}
          render={({ field: { onChange, value } }) => (
            <PromoteVersionStepSections
              selectable={!areControlsDisabled}
              selected={value}
              onSelect={onChange}
              services={services}
              promoteStatus={status}
              searchValue={searchValue}
              filter={promotableFilter}
              isServicesLoading={isServicesLoading}
            />
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
type IsRepromotion = boolean
type IsReleaseRefused = boolean

const StatusValue = styled(Box)(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}))

function useToolbarData(
  promoteVersion: PromoteVersion,
  isPromoting: IsLoading,
): [
  Control<FormData>,
  VersionOptions,
  BaselineOptions,
  OnSubmit,
  IsLoading,
  IsRepromotion,
  IsPromoteAvailable,
  VersionStatus,
  FormData['previousVersion'],
  FieldErrors<FormData>,
  IsReleaseRefused,
] {
  const lastSnapshotPublication = useLastSnapshotPublication()
  const {
    promotePublicationOptions: {
      previousVersion,
      serviceKeys,
      status,
      version,
      isPromoted,
    },
    setPromotePublicationOptions,
  } = usePromoteVersionPublicationOptions()

  const defaultValues: FormData = useMemo(() => ({
    version: version || (lastSnapshotPublication?.name ?? ''),
    previousVersion: previousVersion || (lastSnapshotPublication?.baseline ?? ''),
    status: status,
    serviceKeys: serviceKeys,
  }), [lastSnapshotPublication, previousVersion, serviceKeys, status, version])

  const { reset, handleSubmit, watch, control, formState: { errors } } = useForm<FormData>({ defaultValues })

  useEffect(() => reset(defaultValues), [defaultValues, reset])

  const setStepStatus = useSetStepStatus()
  const publishStatus = usePromoteVersionStepStatus()
  // The promote request counts as the run, so the tab spins and the controls stay disabled from the click on
  const stepStatus = isPromoting ? RUNNING_STEP_STATUS : publishStatus
  useEffect(() => setStepStatus(PROMOTE_VERSION_STEP_KEY, stepStatus), [setStepStatus, stepStatus])

  const onSubmit = useMemo(
    () => handleSubmit(promotionOptions => {
      // Once this promotion starts, the step status no longer shows that the last one completed, so the options keep it
      if (stepStatus === COMPLETE_STEP_STATUS) {
        setPromotePublicationOptions(options => ({ ...options, isPromoted: true }))
      }
      promoteVersion(promotionOptions)
    }),
    [handleSubmit, promoteVersion, setPromotePublicationOptions, stepStatus],
  )

  const versionOptions = useVersionOptions()

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
    !!isPromoted || stepStatus === COMPLETE_STEP_STATUS,
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

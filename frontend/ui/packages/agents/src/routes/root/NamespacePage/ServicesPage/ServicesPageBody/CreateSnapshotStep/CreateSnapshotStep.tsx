import {
  type AutocompleteInputChangeReason,
  Box,
  Button,
  debounce,
  styled,
} from '@mui/material'
import {
  type FC,
  type FormEvent,
  memo,
  type SyntheticEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
} from 'react'

import { VersionSelectorAutocomplete } from '@netcracker/qubership-apihub-ui-shared/components/Autocompletes/VersionSelectorAutocomplete'
import { ErrorIndicator } from '@netcracker/qubership-apihub-ui-shared/components/ErrorIndicators/ErrorIndicator'
import { VersionErrorIndicator } from '@netcracker/qubership-apihub-ui-shared/components/ErrorIndicators/VersionErrorIndicator'
import { VersionFieldErrorIndicator } from '@netcracker/qubership-apihub-ui-shared/components/ErrorIndicators/VersionFieldErrorIndicator'
import { OutlinedTextField } from '@netcracker/qubership-apihub-ui-shared/components/TextFields/OutlinedTextField'
import { InfoHint } from '@netcracker/qubership-apihub-ui-shared/components/InfoHint'
import { OptionItem } from '@netcracker/qubership-apihub-ui-shared/components/OptionItem'
import { SearchBar } from '@netcracker/qubership-apihub-ui-shared/components/SearchBar'
import type { ServiceKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { VersionProblemDetails } from '@netcracker/qubership-apihub-ui-shared/hooks/versions/versionProblemDetails'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { DEFAULT_DEBOUNCE } from '@netcracker/qubership-apihub-ui-shared/utils/constants'
import { agent } from '@netcracker/qubership-apihub-ui-shared/utils/version-info'

import type { VersionKey } from '@agents/entities/keys'
import { useVersionOptions } from '../../../AutomationPage/useVersionOptions'
import {
  useCreateSnapshotDraft,
  useCreateSnapshotPublicationOptions,
} from '../../ServicesPageProvider/ServicesPublicationOptionsProvider'
import {
  COMPLETE_STEP_STATUS,
  CREATE_SNAPSHOT_STEP_KEY,
  ERROR_STEP_STATUS,
  RUNNING_STEP_STATUS,
  type StepStatus,
} from '../../ServicesPageProvider/servicesSteps'
import { useResetStepsAfter, useSetStepStatus } from '../../ServicesPageProvider/ServicesStepsProvider'
import { CreateSnapshotStepSections } from './CreateSnapshotStepSections'
import { getSnapshotVersionError, splitByBaselineVersion } from './snapshotForm'
import { useCreateSnapshot } from './useCreateSnapshot'
import { useCreateSnapshotStepStatus } from './useCreateSnapshotStepStatus'
import { useSnapshotBaseline } from './useSnapshotBaseline'

const BASELINE_VERSION_TOOLTIP =
  'Released baseline version to compare against when publishing the selected services in this snapshot.'
const BASELINE_CHECK_ERROR = 'Cannot check which baseline packages hold this version. Open the list to try again.'

export const CreateSnapshotStep: FC = memo(() => {
  const {
    createSnapshotDraft: { name, baseline, serviceKeys, searchValue },
    setCreateSnapshotDraft,
  } = useCreateSnapshotDraft()
  const { resetCreateSnapshotPublicationOptions } = useCreateSnapshotPublicationOptions()
  const [createSnapshot, isCreating] = useCreateSnapshot()
  const resetStepsAfter = useResetStepsAfter()
  const status = useCreateSnapshotStatus(isCreating)
  const snapshotNameOptions = useVersionOptions()
  const baselineHintId = useId()

  const [baselineSearch, setBaselineSearch] = useState('')
  // The debounced setter must stay the same function, or a pending call would set a stale text
  const setBaselineSearchDebounced = useMemo(() => debounce(setBaselineSearch, DEFAULT_DEBOUNCE), [])
  const {
    services,
    areServicesLoading,
    options,
    problem,
    isSearching,
    isBaselineChecked,
    isBaselineCheckFailed,
    recheckBaseline,
  } = useSnapshotBaseline(baselineSearch)

  const isRunning = status === RUNNING_STEP_STATUS
  const isFinished = status === COMPLETE_STEP_STATUS || status === ERROR_STEP_STATUS
  const nameError = getSnapshotVersionError(name, baseline)
  // Until the search of the selected version answers, a package that holds the version can lack it, and the split
  // would put its services under "Not Matching Baseline Version"
  const isSplitShown = name !== '' && baseline !== '' && isBaselineChecked

  const split = useMemo(
    () => (isSplitShown ? splitByBaselineVersion(services, baseline) : undefined),
    [isSplitShown, baseline, services],
  )
  // A selected service that left "Matching Baseline Version" stays in the draft and is not sent
  const selectedServiceKeys = useMemo(() => {
    if (!split) {
      return []
    }
    const matchingServiceKeys = new Set(split.matching.map(({ key }) => key))
    return serviceKeys.filter(key => matchingServiceKeys.has(key))
  }, [serviceKeys, split])

  const isCreateSnapshotEnabled = split !== undefined &&
    nameError === undefined &&
    !problem.isBlocking &&
    isNotEmpty(selectedServiceKeys) &&
    !isRunning &&
    status !== COMPLETE_STEP_STATUS

  const handleNameInputChange = (_: SyntheticEvent, value: string): void =>
    setCreateSnapshotDraft(draft => ({ ...draft, name: value }))

  const handleBaselineChange = (_: SyntheticEvent, value: VersionKey | null): void =>
    setCreateSnapshotDraft(draft => ({ ...draft, baseline: value ?? '' }))

  const handleBaselineInputChange = (
    _: SyntheticEvent,
    value: string,
    reason: AutocompleteInputChangeReason,
  ): void => {
    // MUI also sets the text when an option is selected; only typed text searches the portal
    if (reason === 'input') {
      setBaselineSearchDebounced(value)
    }
  }

  const handleBaselineOpen = (): void => {
    if (isBaselineCheckFailed) {
      recheckBaseline()
    }
  }

  const handleBaselineClose = (): void => setBaselineSearchDebounced('')

  // The sections are memoized, so the handler keeps its identity
  const handleSelect = useCallback(
    (selected: ServiceKey[]) => setCreateSnapshotDraft(draft => ({ ...draft, serviceKeys: selected })),
    [setCreateSnapshotDraft],
  )

  const handleSearchValueChange = (value: string): void =>
    setCreateSnapshotDraft(draft => ({ ...draft, searchValue: value }))

  const handleResetClick = (): void => {
    resetCreateSnapshotPublicationOptions()
    resetStepsAfter(CREATE_SNAPSHOT_STEP_KEY)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    // Enter in a field submits the form even while the button is disabled
    if (!isCreateSnapshotEnabled) {
      return
    }
    resetStepsAfter(CREATE_SNAPSHOT_STEP_KEY)
    createSnapshot({ name: name, baseline: baseline, serviceKeys: selectedServiceKeys })
  }

  const areFieldsDisabled = isRunning || isFinished
  const hasBaselineError = problem.hasProblems || isBaselineCheckFailed

  return (
    <Form onSubmit={handleSubmit}>
      <Toolbar>
        <VersionSelectorAutocomplete
          data-testid="SnapshotNameAutocomplete"
          freeSolo
          disabled={areFieldsDisabled}
          value={name}
          options={snapshotNameOptions}
          inputIndicator={nameError !== undefined && (
            <ErrorIndicator hasProblems tooltip={nameError} data-testid="SnapshotNameErrorIndicator" />
          )}
          renderOption={(props, snapshotName) => (
            <OptionItem key={snapshotName} props={props} title={snapshotName} />
          )}
          renderInput={(params) => (
            <OutlinedTextField
              {...params}
              required
              label="Snapshot Version"
              error={nameError !== undefined}
            />
          )}
          onInputChange={handleNameInputChange}
        />

        <VersionSelectorAutocomplete
          data-testid="BaselineAutocomplete"
          disabled={areFieldsDisabled}
          value={baseline || null}
          options={options.versionKeys}
          loading={isSearching}
          inputIndicator={
            <BaselineFieldIndicator
              problem={problem}
              isCheckFailed={isBaselineCheckFailed}
              descriptionId={baselineHintId}
            />
          }
          renderOption={(props, versionKey) => {
            const flags = options.flagsByVersionKey.get(versionKey)
            return (
              <OptionItem
                key={versionKey}
                props={props}
                title={versionKey}
                indicator={flags && (
                  <VersionErrorIndicator
                    app={agent}
                    versionKey={versionKey}
                    hasErrors={flags.hasErrors}
                    changelogHasErrors={flags.changelogHasErrors}
                    apiProcessorVersion={flags.apiProcessorVersion}
                    fontSize="extra-small"
                    showTooltip={false}
                  />
                )}
              />
            )
          }}
          renderInput={(params) => (
            <OutlinedTextField
              {...params}
              required
              label="Baseline Version"
              error={problem.isBlocking || isBaselineCheckFailed}
              inputProps={{
                ...params.inputProps,
                'aria-describedby': hasBaselineError ? undefined : baselineHintId,
              }}
            />
          )}
          onChange={handleBaselineChange}
          onInputChange={handleBaselineInputChange}
          onOpen={handleBaselineOpen}
          onClose={handleBaselineClose}
        />

        <Actions>
          <ResetButton data-testid="ResetButton" variant="outlined" disabled={isRunning} onClick={handleResetClick}>
            Reset
          </ResetButton>
          <CreateSnapshotButton
            data-testid="CreateSnapshotButton"
            type="submit"
            variant="contained"
            disabled={!isCreateSnapshotEnabled}
          >
            Create Snapshot
          </CreateSnapshotButton>
        </Actions>

        <Search>
          <SearchBar value={searchValue} onValueChange={handleSearchValueChange} />
        </Search>
      </Toolbar>

      <CreateSnapshotStepSections
        services={services}
        areServicesLoading={areServicesLoading}
        split={split}
        baselineVersion={baseline}
        selectable={!areFieldsDisabled}
        selected={selectedServiceKeys}
        onSelect={handleSelect}
        searchValue={searchValue}
      />
    </Form>
  )
})

CreateSnapshotStep.displayName = 'CreateSnapshotStep'

type BaselineFieldIndicatorProps = {
  problem: VersionProblemDetails
  isCheckFailed: boolean
  descriptionId: string
}

// The error indicator takes the place of the info icon, so the text of the field keeps its width
const BaselineFieldIndicator: FC<BaselineFieldIndicatorProps> = memo<BaselineFieldIndicatorProps>(({
  problem,
  isCheckFailed,
  descriptionId,
}) => {
  // Every problem of a baseline version blocks it, so the tooltip asks for another version whatever the problem is
  if (problem.hasProblems) {
    return <VersionFieldErrorIndicator problem={problem} tooltip={problem.formHelperText} />
  }
  if (isCheckFailed) {
    return <ErrorIndicator hasProblems tooltip={BASELINE_CHECK_ERROR} data-testid="BaselineCheckErrorIndicator" />
  }
  return (
    <InfoHint
      alwaysVisible
      tooltip={BASELINE_VERSION_TOOLTIP}
      descriptionId={descriptionId}
      data-testid="BaselineInfoHint"
    />
  )
})

BaselineFieldIndicator.displayName = 'BaselineFieldIndicator'

const Form = styled('form')({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
})

// The fields and the buttons keep their widths, and the search takes the rest of the row
const Toolbar = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateRows: 'max-content',
  gridTemplateColumns: '200px 200px 280px 1fr',
  gap: theme.spacing(2),
}))

const Actions = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2),
  alignSelf: 'center',
  marginLeft: 'auto',
}))

const ResetButton = styled(Button)({
  width: 90,
})

const CreateSnapshotButton = styled(Button)({
  width: 156,
})

const Search = styled(Box)({
  alignSelf: 'center',
  marginLeft: 'auto',
})

function useCreateSnapshotStatus(isCreating: boolean): StepStatus {
  const setStepStatus = useSetStepStatus()
  const publishStatus = useCreateSnapshotStepStatus()
  // The create request counts as the run, so the tab spins and the controls stay disabled from the click on
  const status = isCreating ? RUNNING_STEP_STATUS : publishStatus
  useEffect(() => setStepStatus(CREATE_SNAPSHOT_STEP_KEY, status), [setStepStatus, status])
  return status
}

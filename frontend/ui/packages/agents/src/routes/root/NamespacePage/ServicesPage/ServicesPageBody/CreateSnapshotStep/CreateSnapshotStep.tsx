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

import { EmptyState, FAILED_EMPTY_STATE_VARIANT } from '@agents/components/EmptyState/EmptyState'
import type { VersionKey } from '@agents/entities/keys'
import { useVersionOptions } from '../../../AutomationPage/useVersionOptions'
import {
  type CreateSnapshotPublicationOptions,
  useCreateSnapshotFormData,
  useSnapshotPublications,
} from '../../ServicesPageProvider/ServicesPublicationOptionsProvider'
import { CREATE_SNAPSHOT_STEP_KEY } from '../../ServicesPageProvider/servicesSteps'
import { useResetStepsAfter } from '../../ServicesPageProvider/ServicesStepsProvider'
import { CreateSnapshotStepSections } from './CreateSnapshotStepSections'
import { getSnapshotVersionError, splitByBaselineVersion } from './snapshotForm'
import { getServicesOutsideSnapshots } from './snapshotPublications'
import { type CreateSnapshot, useCreateSnapshot } from './useCreateSnapshot'
import { useIsCreateSnapshotStepRunning } from './useCreateSnapshotStepStatus'
import { useSnapshotBaseline } from './useSnapshotBaseline'

const BASELINE_VERSION_TOOLTIP =
  'Released baseline version to compare against when publishing the selected services in this snapshot.'
const BASELINE_CHECK_ERROR = 'Cannot check which baseline packages hold this version. Open the list to try again.'
const SNAPSHOT_CREATION_FAILED_TITLE = 'Snapshot creation failed'
const SNAPSHOT_CREATION_FAILED_LINES: ReadonlyArray<string> = [
  'The snapshot could not be started.',
  'Check that the agent is available in the selected cloud and namespace and that you have access to the workspace, then try again',
]

export const CreateSnapshotStep: FC = memo(() => {
  const {
    createSnapshotFormData: { name, baseline, serviceKeys, searchValue },
    setCreateSnapshotFormData,
  } = useCreateSnapshotFormData()
  const {
    snapshotPublications,
    failedCreateSnapshotOptions,
    addSnapshotPublication,
    setFailedCreateSnapshotOptions,
  } = useSnapshotPublications()
  const createSnapshot = useCreateSnapshot({
    onCreated: snapshotPublication => {
      addSnapshotPublication(snapshotPublication)
      // The next snapshot starts from empty fields; the search stays
      setCreateSnapshotFormData(formData => ({ ...formData, name: '', baseline: '', serviceKeys: [] }))
    },
    onFailed: setFailedCreateSnapshotOptions,
  })
  const isRunning = useIsCreateSnapshotStepRunning()
  const resetStepsAfter = useResetStepsAfter()
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
  } = useSnapshotBaseline(baseline, baselineSearch)

  const nameError = getSnapshotVersionError(name, baseline)
  // Until the search of the selected version answers, a package that holds the version can lack it, and the split
  // would put its services under "Not Matching Baseline Version"
  const canSplitByBaselineVersion = name !== '' && baseline !== '' && isBaselineChecked

  const servicesOutsideSnapshots = useMemo(
    () => getServicesOutsideSnapshots(services, snapshotPublications),
    [services, snapshotPublications],
  )
  const baselineVersionSplit = useMemo(
    () => (canSplitByBaselineVersion ? splitByBaselineVersion(servicesOutsideSnapshots, baseline) : undefined),
    [canSplitByBaselineVersion, baseline, servicesOutsideSnapshots],
  )
  // A selected service that left "Matching Baseline Version" keeps its key in the form data and is not sent
  const selectedServiceKeys = useMemo(() => {
    if (!baselineVersionSplit) {
      return []
    }
    const matchingServiceKeys = new Set(baselineVersionSplit.matching.map(({ key }) => key))
    return serviceKeys.filter(key => matchingServiceKeys.has(key))
  }, [serviceKeys, baselineVersionSplit])

  const isCreateSnapshotEnabled = baselineVersionSplit !== undefined &&
    nameError === undefined &&
    !problem.isBlocking &&
    isNotEmpty(selectedServiceKeys) &&
    !isRunning

  const handleNameInputChange = (_: SyntheticEvent, value: string): void =>
    setCreateSnapshotFormData(formData => ({ ...formData, name: value }))

  const handleBaselineChange = (_: SyntheticEvent, value: VersionKey | null): void =>
    setCreateSnapshotFormData(formData => ({ ...formData, baseline: value ?? '' }))

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
    (selected: ServiceKey[]) => setCreateSnapshotFormData(formData => ({ ...formData, serviceKeys: selected })),
    [setCreateSnapshotFormData],
  )

  const handleSearchValueChange = (value: string): void =>
    setCreateSnapshotFormData(formData => ({ ...formData, searchValue: value }))

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    resetStepsAfter(CREATE_SNAPSHOT_STEP_KEY)
    createSnapshot({ name: name, baseline: baseline, serviceKeys: selectedServiceKeys })
  }

  const hasBaselineError = problem.hasProblems || isBaselineCheckFailed

  if (failedCreateSnapshotOptions) {
    return (
      <SnapshotCreationFailedState
        options={failedCreateSnapshotOptions}
        isRetrying={isRunning}
        onTryAgain={createSnapshot}
      />
    )
  }

  return (
    <Form onSubmit={handleSubmit}>
      <Toolbar>
        <VersionSelectorAutocomplete
          data-testid="SnapshotNameAutocomplete"
          freeSolo
          disabled={isRunning}
          // MUI counts an empty string as a value and would show the clear button in an empty field
          value={name || null}
          // A free-solo field keeps its text when the value is cleared, so the form data drives the text as well and
          // a created snapshot empties the field
          inputValue={name}
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
          // The info icon stays in the field, so the clear button would make three icons with the magnifier. An empty
          // field shows no clear button anyway, and a literal `true` would not let the empty field take `null`.
          disableClearable={baseline !== ''}
          disabled={isRunning}
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

        <CreateSnapshotButton
          data-testid="CreateSnapshotButton"
          type="submit"
          variant="contained"
          disabled={!isCreateSnapshotEnabled}
        >
          Create Snapshot
        </CreateSnapshotButton>

        <Search>
          <SearchBar value={searchValue} onValueChange={handleSearchValueChange} />
        </Search>
      </Toolbar>

      <CreateSnapshotStepSections
        services={services}
        servicesOutsideSnapshots={servicesOutsideSnapshots}
        areServicesLoading={areServicesLoading}
        baselineVersionSplit={baselineVersionSplit}
        baselineVersion={baseline}
        selectable={!isRunning}
        selected={selectedServiceKeys}
        onSelect={handleSelect}
        searchValue={searchValue}
      />
    </Form>
  )
})

CreateSnapshotStep.displayName = 'CreateSnapshotStep'

type SnapshotCreationFailedStateProps = {
  options: CreateSnapshotPublicationOptions
  isRetrying: boolean
  onTryAgain: CreateSnapshot
}

const SnapshotCreationFailedState: FC<SnapshotCreationFailedStateProps> = memo<SnapshotCreationFailedStateProps>(({
  options,
  isRetrying,
  onTryAgain,
}) => {
  const handleTryAgainClick = (): void => onTryAgain(options)

  return (
    <EmptyState
      variant={FAILED_EMPTY_STATE_VARIANT}
      title={SNAPSHOT_CREATION_FAILED_TITLE}
      lines={SNAPSHOT_CREATION_FAILED_LINES}
      action={
        <Button
          variant="contained"
          disabled={isRetrying}
          onClick={handleTryAgainClick}
          data-testid="RetrySnapshotCreationButton"
        >
          Try Again
        </Button>
      }
      data-testid="SnapshotCreationFailedState"
    />
  )
})

SnapshotCreationFailedState.displayName = 'SnapshotCreationFailedState'

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

// As in the design: the button stands 16 px after the fields, and the search takes the rest of the row
const Toolbar = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateRows: 'max-content',
  gridTemplateColumns: '200px 200px max-content 1fr',
  gap: theme.spacing(2),
}))

const CreateSnapshotButton = styled(Button)({
  width: 156,
  alignSelf: 'center',
})

const Search = styled(Box)({
  alignSelf: 'center',
  marginLeft: 'auto',
})

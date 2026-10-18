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

import { type FC, type HTMLAttributes, type ReactNode, memo } from 'react'
import {
  Box,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material'
import type { Control, UseFormSetValue } from 'react-hook-form'
import { Controller, useWatch } from 'react-hook-form'
import { LoadingButton } from '@mui/lab'
import { DialogForm } from './DialogForm'
import { VersionStatusChip } from './VersionStatusChip'
import { OptionItem } from './OptionItem'
import { Swapper } from './Swapper'
import { LatestRevisionMark } from './LatestRevisionMark'
import type { PackageKind } from '../entities/packages'
import type { Revision, Revisions } from '../entities/revisions'
import { REVISION_DELIMITER } from '../entities/versions'
import { VersionErrorFormMessage } from './ErrorIndicators/VersionErrorFormMessage'
import { VersionErrorIndicator } from './ErrorIndicators/VersionErrorIndicator'
import { VersionSelectorAutocomplete } from './Autocompletes/VersionSelectorAutocomplete'
import { useVersionProblemDetails } from '../hooks/versions/useVersionProblemDetails'
import { VERSION_PROBLEM_DIALOG_SURFACE } from '../hooks/versions/versionProblemDetails'
import { useParams } from 'react-router-dom'
import { usePackageSearchParam } from '../hooks/routes/package/usePackageSearchParam'
import type { TestableProps } from './Testable'

export type CompareRevisionsDialogFormData = {
  originalRevision: Revision | null
  changedRevision: Revision | null
}

export type CompareRevisionsDialogData = {
  control: Control<CompareRevisionsDialogFormData>
  setValue: UseFormSetValue<CompareRevisionsDialogFormData>
  originalRevisions: Revisions
  changedRevisions: Revisions
  isApiTypeFetching: boolean
  onSubmit: () => void
  onSwap: () => void
  isRevisionsLoading: boolean | undefined
}

export type CompareRevisionsDialogFormProps = CompareRevisionsDialogData & {
  open: boolean
  setOpen: (value: boolean) => void
  kind?: PackageKind
}

// First Order Component //
export const CompareRevisionsDialogForm: FC<CompareRevisionsDialogFormProps> = memo(({
  open,
  setOpen,
  control,
  onSubmit,
  onSwap,
  isApiTypeFetching,
  originalRevisions,
  changedRevisions,
  isRevisionsLoading,
  kind,
}) => {
  const { packageId: changedPackageKey } = useParams()
  const [packageSearchParam] = usePackageSearchParam()
  const originPackageKey = packageSearchParam ?? changedPackageKey
  const previousRevision = useWatch({ control: control, name: 'originalRevision' })
  const currentRevisions = useWatch({ control: control, name: 'changedRevision' })
  const {
    isBlocking: isPreviousRevisionBlocking,
    formHelperText: previousRevisionFormHelperText,
    hasProblems: previousRevisionHasProblems,
  } = useVersionProblemDetails({
    packageKey: originPackageKey,
    versionKey: previousRevision?.version,
    hasErrors: previousRevision?.hasErrors,
    changelogHasErrors: previousRevision?.changelogHasErrors,
    apiProcessorVersion: previousRevision?.apiProcessorVersion,
    kind: kind,
    surface: VERSION_PROBLEM_DIALOG_SURFACE.COMPARE_PREVIOUS_REVISION,
  })
  const {
    isBlocking: isCurrentRevisionBlocking,
    formHelperText: currentRevisionFormHelperText,
    hasProblems: currentRevisionHasProblems,
  } = useVersionProblemDetails({
    packageKey: originPackageKey,
    versionKey: currentRevisions?.version,
    hasErrors: currentRevisions?.hasErrors,
    changelogHasErrors: currentRevisions?.changelogHasErrors,
    apiProcessorVersion: currentRevisions?.apiProcessorVersion,
    kind: kind,
    surface: VERSION_PROBLEM_DIALOG_SURFACE.COMPARE_CURRENT_REVISION,
  })

  return (
    <DialogForm
      open={open}
      onClose={() => setOpen(false)}
      onSubmit={onSubmit}
      maxWidth="md"
    >
      <DialogTitle>
        Select Revisions To Compare
      </DialogTitle>

      <DialogContent sx={DIALOG_CONTENT_STYLES}>
        <Typography
          sx={{ gridArea: 'originalTitle' }}
          variant="button"
        >
          Previous
        </Typography>

        <Controller
          name="originalRevision"
          control={control}
          render={({ field: { value, onChange } }) => (
            <RevisionAutocomplete
              value={value}
              onChange={onChange}
              controllerName="originalRevision"
              revisions={originalRevisions}
              isLoading={isRevisionsLoading}
              error={isPreviousRevisionBlocking}
              indicator={previousRevisionHasProblems && previousRevision && (
                <VersionErrorIndicator
                  versionKey={previousRevision.version}
                  hasErrors={previousRevision.hasErrors}
                  changelogHasErrors={previousRevision.changelogHasErrors}
                  apiProcessorVersion={previousRevision.apiProcessorVersion}
                  kind={kind}
                />
              )}
              data-testid="PreviousRevisionAutocomplete"
            />
          )}
        />

        <Box sx={{ gridArea: 'swapper', alignSelf: 'center' }}>
          <Swapper onSwap={onSwap}/>
        </Box>

        <Typography
          sx={{ gridArea: 'changedTitle' }}
          variant="button"
        >
          Current
        </Typography>

        <Controller
          name="changedRevision"
          control={control}
          render={({ field: { value, onChange } }) => (
            <RevisionAutocomplete
              value={value}
              onChange={onChange}
              controllerName="changedRevision"
              revisions={changedRevisions}
              isLoading={isRevisionsLoading}
              error={isCurrentRevisionBlocking}
              indicator={currentRevisionHasProblems && currentRevisions && (
                <VersionErrorIndicator
                  versionKey={currentRevisions.version}
                  hasErrors={currentRevisions.hasErrors}
                  changelogHasErrors={currentRevisions.changelogHasErrors}
                  apiProcessorVersion={currentRevisions.apiProcessorVersion}
                  kind={kind}
                />
              )}
              data-testid="CurrentRevisionAutocomplete"
            />
          )}
        />
      </DialogContent>
      <Box sx={{ maxWidth: '692px', padding: '0 24px' }}>
        <VersionErrorFormMessage
          message={currentRevisionFormHelperText ?? previousRevisionFormHelperText}
        />
      </Box>
      <DialogActions>
        <LoadingButton
          variant="contained"
          type="submit"
          disabled={isPreviousRevisionBlocking || isCurrentRevisionBlocking}
          loading={isApiTypeFetching}
          data-testid="CompareButton"
        >
          Compare
        </LoadingButton>
        <Button variant="outlined" onClick={() => setOpen(false)} data-testid="CancelButton">
          Cancel
        </Button>
      </DialogActions>
    </DialogForm>
  )
})

CompareRevisionsDialogForm.displayName = 'CompareRevisionsDialogForm'

type RevisionAutocompleteProps = TestableProps & {
  value: Revision | null
  onChange: (value: Revision | null) => void
  controllerName: string
  revisions: Revisions
  isLoading: boolean | undefined
  error?: boolean
  indicator?: ReactNode
}

const RevisionAutocomplete: FC<RevisionAutocompleteProps> = memo<RevisionAutocompleteProps>(({
  value,
  onChange,
  controllerName,
  revisions,
  isLoading,
  error = false,
  indicator,
  'data-testid': dataTestId = 'RevisionAutocomplete',
}) => {
  return (
    <VersionSelectorAutocomplete
      sx={{ gridArea: controllerName }}
      inputIndicator={indicator}
      value={value ?? null}
      onChange={(_, newValue) => {
        onChange(newValue)
      }}
      options={isLoading ? [] : revisions}
      loading={isLoading}
      getOptionLabel={(option: Revision) => `${REVISION_DELIMITER}${option.revision}`}
      isOptionEqualToValue={(option: Revision, val: Revision) => option.revision === val.revision}
      renderOption={(props, option: Revision) => (
        <AutocompleteOption key={option.revision} props={props} revision={option} />
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Revision"
          required
          error={error}
        />
      )}
      data-testid={dataTestId}
    />
  )
})

RevisionAutocomplete.displayName = 'RevisionAutocomplete'

type AutocompleteOptionProps = {
  revision: Revision
  props: HTMLAttributes<HTMLLIElement>
}

const AutocompleteOption: FC<AutocompleteOptionProps> = memo<AutocompleteOptionProps>(({ revision, props }) => {
  return (
    <OptionItem
      props={props}
      title={`${REVISION_DELIMITER}${revision.revision}`}
      overflowTooltipPlacement="left"
      indicator={
        <>
          <LatestRevisionMark latest={revision.latestRevision}/>
          <VersionErrorIndicator
            versionKey={revision.version}
            hasErrors={revision.hasErrors}
            changelogHasErrors={revision.changelogHasErrors}
            apiProcessorVersion={revision.apiProcessorVersion}
            fontSize="extra-small"
            showTooltip={false}
          />
        </>
      }
      chip={<VersionStatusChip status={revision.status}/>}
    />
  )
})

AutocompleteOption.displayName = 'AutocompleteOption'

const DIALOG_CONTENT_STYLES = {
  display: 'grid',
  columnGap: 1,
  gridTemplateRows: 'repeat(2, max-content)',
  gridTemplateColumns: '300px max-content 300px',
  gridTemplateAreas: `
    'originalTitle      originalTitle   changedTitle'
    'originalRevision   swapper         changedRevision'
  `,
}

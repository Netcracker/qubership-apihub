import {
  Alert,
  Autocomplete,
  Box,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  ListItem,
  styled,
  TextField,
  Typography,
} from '@mui/material'
import { type FC, memo, useEffect, useState } from 'react'
import { type Control, Controller, useForm, type UseFormSetValue, useWatch } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { VersionSelectorAutocomplete } from '@netcracker/qubership-apihub-ui-shared/components/Autocompletes/VersionSelectorAutocomplete'
import { DialogForm } from '@netcracker/qubership-apihub-ui-shared/components/DialogForm'
import { Swapper } from '@netcracker/qubership-apihub-ui-shared/components/Swapper'
import { VersionOptionItem } from '@netcracker/qubership-apihub-ui-shared/components/VersionOptionItem'
import type { PackageVersion } from '@netcracker/qubership-apihub-ui-shared/entities/versions'

import type { LibraryVersion, MavenLibraryDto } from '@portal/entities/libraries'
import { API_CHANGES_PAGE } from '../../../../routes'
import { useLibraryVersions } from '../useLibraryVersions'
import { getPreviousLibraryVersion } from './javaapi/javaApi'
import { getLibraryVersionPath } from './libraryVersion'
import { getLibraryComparisonDefaultVersion, toLibraryVersionOption } from './libraryVersionOptions'
import { useComparisonLibraries } from './useComparisonLibraries'

type ComparisonSide = Readonly<{ libraryId: string; version: PackageVersion | null }>
type ComparisonFormData = { original: ComparisonSide; changed: ComparisonSide }
type CompareLibraryVersionsDialogProps = Readonly<{ version: LibraryVersion; onClose: () => void }>

export const CompareLibraryVersionsDialog: FC<CompareLibraryVersionsDialogProps> = memo(({ version, onClose }) => {
  const [query] = useSearchParams()
  const defaults = getPreviousLibraryVersion(query)
  const defaultLibraryId = defaults.previousLibraryId ?? version.libraryId
  const { libraries, isLoading, error } = useComparisonLibraries()
  const { versions: defaultVersions, isLoading: areDefaultVersionsLoading, error: defaultVersionsError } =
    useLibraryVersions(defaultLibraryId)
  const defaultPrevious = getLibraryComparisonDefaultVersion(version, defaultVersions, defaults)
  const { control, setValue, getValues, handleSubmit } = useForm<ComparisonFormData>({
    defaultValues: {
      original: {
        libraryId: defaultLibraryId,
        version: defaultPrevious ? toLibraryVersionOption(defaultPrevious) : null,
      },
      changed: { libraryId: version.libraryId, version: toLibraryVersionOption(version) },
    },
  })
  const [initialized, setInitialized] = useState(!areDefaultVersionsLoading && !defaultVersionsError)
  useEffect(() => {
    if (initialized || areDefaultVersionsLoading || defaultVersionsError) return
    const original = getValues('original')
    if (original.libraryId === defaultLibraryId && !original.version) {
      setValue('original.version', defaultPrevious ? toLibraryVersionOption(defaultPrevious) : null)
    }
    setInitialized(true)
  }, [
    initialized,
    areDefaultVersionsLoading,
    defaultVersionsError,
    defaultPrevious,
    defaultLibraryId,
    getValues,
    setValue,
  ])
  const original = useWatch({ control: control, name: 'original' })
  const changed = useWatch({ control: control, name: 'changed' })
  const navigate = useNavigate()
  const isSameVersion = original.libraryId === changed.libraryId && original.version?.key === changed.version?.key
  const onSwap = (): void => {
    const { original, changed } = getValues()
    setValue('original', changed)
    setValue('changed', original)
  }

  return (
    <DialogForm
      open
      maxWidth="md"
      onClose={onClose}
      onSubmit={handleSubmit(({ original, changed }) => {
        if (!original.version || !changed.version || isSameVersion) return
        navigate(
          `${getLibraryVersionPath(changed.libraryId, changed.version.key, API_CHANGES_PAGE)}?${new URLSearchParams({
            previousVersion: original.version.key,
            previousLibraryId: original.libraryId,
          })}`,
        )
        onClose()
      })}
    >
      <DialogTitle>Select Versions To Compare</DialogTitle>
      <CompareContent>
        <ComparisonSelectors
          side="original"
          title="Previous"
          control={control}
          setValue={setValue}
          libraries={libraries}
          isLoading={isLoading}
        />
        <Box sx={{ gridArea: 'swapper', alignSelf: 'center' }}>
          <Swapper onSwap={onSwap} disabledReason={initialized ? undefined : 'Loading versions'} />
        </Box>
        <ComparisonSelectors
          side="changed"
          title="Current"
          control={control}
          setValue={setValue}
          libraries={libraries}
          isLoading={isLoading}
        />
      </CompareContent>
      {error && <Alert severity="error">{error.message}</Alert>}
      {defaultVersionsError && <Alert severity="error">{defaultVersionsError.message}</Alert>}
      <DialogActions>
        <Button
          type="submit"
          variant="contained"
          disabled={!original.version || !changed.version || isSameVersion || isLoading || !!error}
          data-testid="CompareButton"
        >
          Compare
        </Button>
        <Button variant="outlined" onClick={onClose} data-testid="CancelButton">Cancel</Button>
      </DialogActions>
    </DialogForm>
  )
})
CompareLibraryVersionsDialog.displayName = 'CompareLibraryVersionsDialog'

type ComparisonSelectorsProps = Readonly<{
  side: 'original' | 'changed'
  title: 'Previous' | 'Current'
  control: Control<ComparisonFormData>
  setValue: UseFormSetValue<ComparisonFormData>
  libraries: ReadonlyArray<MavenLibraryDto>
  isLoading: boolean
}>

const ComparisonSelectors: FC<ComparisonSelectorsProps> = memo(
  ({ side, title, control, setValue, libraries, isLoading }) => {
    const libraryId = useWatch({ control: control, name: `${side}.libraryId` })
    const { versions, isLoading: areVersionsLoading, error } = useLibraryVersions(libraryId)
    const options = versions.map(toLibraryVersionOption)
    return (
      <>
        <Typography sx={{ gridArea: `${side}Title` }} variant="button">{title}</Typography>
        <Controller
          name={`${side}.libraryId`}
          control={control}
          render={({ field: { value, onChange } }) => (
            <Autocomplete
              sx={{ gridArea: `${side}Library` }}
              value={libraries.find(library => library.libraryId === value) ?? null}
              loading={isLoading}
              options={libraries}
              isOptionEqualToValue={(option, value) => option.libraryId === value.libraryId}
              getOptionLabel={library => library.name}
              renderOption={(props, library) => <ListItem {...props} key={library.libraryId}>{library.name}</ListItem>}
              renderInput={params => <TextField {...params} required label="Library" />}
              onChange={(_, library) => {
                setValue(`${side}.version`, null)
                onChange(library?.libraryId ?? '')
              }}
              data-testid={`${title}LibraryAutocomplete`}
            />
          )}
        />
        <Controller
          name={`${side}.version`}
          control={control}
          render={({ field: { value, onChange } }) => (
            <VersionSelectorAutocomplete
              sx={{ gridArea: `${side}Version` }}
              value={value}
              loading={areVersionsLoading}
              disabled={!libraryId || !!error}
              options={options}
              isOptionEqualToValue={(option, value) => option.key === value.key}
              getOptionLabel={version => version.key}
              renderOption={(props, version) => <VersionOptionItem key={version.key} props={props} version={version} />}
              renderInput={params => (
                <TextField {...params} required label="Version" error={!!error} helperText={error?.message} />
              )}
              onChange={(_, version) => onChange(version)}
              data-testid={`${title}VersionAutocomplete`}
            />
          )}
        />
      </>
    )
  },
)
ComparisonSelectors.displayName = 'ComparisonSelectors'

const CompareContent = styled(DialogContent)(({ theme }) => ({
  display: 'grid',
  columnGap: theme.spacing(1),
  gridTemplateColumns: '300px max-content 300px',
  gridTemplateRows: 'repeat(3, max-content)',
  gridTemplateAreas: `
    'originalTitle originalTitle changedTitle'
    'originalLibrary swapper changedLibrary'
    'originalVersion swapper changedVersion'
  `,
}))

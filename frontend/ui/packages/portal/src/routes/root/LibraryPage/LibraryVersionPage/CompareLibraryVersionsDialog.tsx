import { Alert, Button, DialogActions, DialogContent, DialogTitle, MenuItem, styled, TextField } from '@mui/material'
import { type FC, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'

import { DialogForm } from '@netcracker/qubership-apihub-ui-shared/components/DialogForm'

import type { LibraryVersionDto } from '@portal/entities/libraries'
import { useLibraryVersions } from '../useLibraryVersions'
import { getLibraryVersionPath } from './library-version'
import { useComparisonLibraries } from './useComparisonLibraries'

type CompareLibraryVersionsDialogProps = { version: LibraryVersionDto; onClose: () => void }

export const CompareLibraryVersionsDialog: FC<CompareLibraryVersionsDialogProps> = ({ version, onClose }) => {
  const [previousLibraryId, setPreviousLibraryId] = useState(version.libraryId)
  const { libraries, isLoading: areLibrariesLoading, error: librariesError } = useComparisonLibraries()
  const { versions, isLoading, error } = useLibraryVersions(previousLibraryId)
  const candidates = versions.filter(item =>
    previousLibraryId !== version.libraryId || item.version !== version.version,
  )
  const [selectedPrevious, setPrevious] = useState(version.previousVersion ?? '')
  const previous = candidates.some(item => item.version === selectedPrevious)
    ? selectedPrevious
    : candidates[0]?.version ?? ''
  const { handleSubmit } = useForm()
  const navigate = useNavigate()
  return (
    <DialogForm
      open
      width="530px"
      onClose={onClose}
      onSubmit={handleSubmit(() => {
        if (previous) {
          navigate(
            `${getLibraryVersionPath(version.libraryId, version.version, 'changes')}?${new URLSearchParams({
              previousVersion: previous,
              previousLibraryId: previousLibraryId,
            })}`,
          )
          onClose()
        }
      })}
    >
      <DialogTitle>Compare versions</DialogTitle>
      <CompareContent>
        <TextField label="Current version" value={version.version} disabled />
        <TextField
          select
          required
          label="Previous library"
          value={libraries.some(library => library.libraryId === previousLibraryId) ? previousLibraryId : ''}
          disabled={areLibrariesLoading || !!librariesError}
          onChange={event => {
            setPreviousLibraryId(event.target.value)
            setPrevious('')
          }}
        >
          {libraries.map(library => (
            <MenuItem key={library.libraryId} value={library.libraryId}>{library.name}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          required
          label="Previous version"
          value={previous}
          disabled={isLoading || !!error}
          onChange={event => setPrevious(event.target.value)}
        >
          {candidates.map(item => <MenuItem key={item.version} value={item.version}>{item.version}</MenuItem>)}
        </TextField>
        {(error || !isLoading && !candidates.length) && (
          <span>{error?.message ?? 'No other version is available to compare.'}</span>
        )}
        {librariesError && <Alert severity="error">{librariesError.message}</Alert>}
      </CompareContent>
      <DialogActions>
        <Button
          type="submit"
          variant="contained"
          disabled={!previous || isLoading || areLibrariesLoading || !!error || !!librariesError}
        >
          Compare
        </Button>
        <Button variant="outlined" onClick={onClose}>Cancel</Button>
      </DialogActions>
    </DialogForm>
  )
}
CompareLibraryVersionsDialog.displayName = 'CompareLibraryVersionsDialog'

const CompareContent = styled(DialogContent)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
}))

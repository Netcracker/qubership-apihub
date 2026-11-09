import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  MenuItem,
  styled,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { type FC, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'

import type { LibraryChangeDto, LibraryVersionDto } from '@portal/entities/libraries'
import { useLibraryChanges } from './useLibraryChanges'

const SEVERITIES = ['all', 'breaking', 'non-breaking', 'annotation'] as const
const CHANGE_TYPES = ['all', 'added', 'removed', 'changed', 'deprecated'] as const
const PAGE_SIZE = 25

export const LibraryChangesTab: FC<{ version: LibraryVersionDto }> = ({ version }) => {
  const [query] = useSearchParams()
  const [severity, setSeverity] = useState<typeof SEVERITIES[number]>('all')
  const [changeType, setChangeType] = useState<typeof CHANGE_TYPES[number]>('all')
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<LibraryChangeDto>()
  const { data, isLoading, error } = useLibraryChanges({
    libraryId: version.libraryId,
    version: version.version,
    previousLibraryId: query.get('previousLibraryId') ?? undefined,
    previousVersion: query.get('previousVersion') ?? undefined,
    classId: query.get('classId') ?? undefined,
    severity: severity === 'all' ? undefined : severity,
    changeType: changeType === 'all' ? undefined : changeType,
    page: page,
    limit: PAGE_SIZE,
  })
  const changes = data?.changes ?? []
  return (
    <>
      <BodyCard
        header="API Changes"
        action={
          <Filters>
            <TextField
              select
              label="Severity"
              value={severity}
              onChange={event => {
                setSeverity(SEVERITIES.find(value => value === event.target.value) ?? 'all')
                setPage(0)
              }}
            >
              {SEVERITIES.map(value => (
                <MenuItem key={value} value={value}>{value === 'all' ? 'All severities' : value}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Change type"
              value={changeType}
              onChange={event => {
                setChangeType(CHANGE_TYPES.find(value => value === event.target.value) ?? 'all')
                setPage(0)
              }}
            >
              {CHANGE_TYPES.map(value => (
                <MenuItem key={value} value={value}>{value === 'all' ? 'All change types' : value}</MenuItem>
              ))}
            </TextField>
          </Filters>
        }
        body={
          <>
            {error && <Alert severity="error">{error.message}</Alert>}
            {isLoading ? <LoadingIndicator /> : (
              <>
                {data && (
                  <Typography variant="body2">{data.comparison.previousVersion} → {data.comparison.version}</Typography>
                )}
                {!data && !error && (
                  <Alert severity="info">No comparison has been computed for this version pair.</Alert>
                )}
                {data && (
                  <TableContainer>
                    <Table aria-label="Java API changes">
                      <TableHead>
                        <TableRow>
                          {['Class / Method', 'Change type', 'Severity', 'Description'].map(title => (
                            <TableCell key={title}>{title}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {changes.map(change => (
                          <TableRow key={change.changeId}>
                            <TableCell>
                              <Link
                                component="button"
                                onClick={() => setSelected(change)}
                              >
                                {change.details?.qualifiedName ?? change.classId}
                                {change.methodId ? ` · ${change.methodId}` : ''}
                              </Link>
                            </TableCell>
                            <TableCell>{change.changeType}</TableCell>
                            <TableCell>
                              <Chip
                                label={change.severity}
                                color={change.severity === 'breaking'
                                  ? 'error'
                                  : change.severity === 'non-breaking'
                                  ? 'success'
                                  : 'default'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>{change.description}</TableCell>
                          </TableRow>
                        ))}
                        {!changes.length && (
                          <TableRow>
                            <TableCell colSpan={4}>No changes match your filters.</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </>
            )}
            {data && (
              <TablePagination
                component="div"
                count={-1}
                page={page}
                rowsPerPage={PAGE_SIZE}
                rowsPerPageOptions={[PAGE_SIZE]}
                onPageChange={(_, value) => setPage(value)}
                nextIconButtonProps={{ disabled: isLoading || changes.length < PAGE_SIZE }}
              />
            )}
          </>
        }
      />
      <Dialog open={!!selected} onClose={() => setSelected(undefined)} fullWidth maxWidth="md">
        <DialogTitle>{selected?.description}</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2">Previous signature</Typography>
          <Signature>{selected?.details?.oldSignature ?? '—'}</Signature>
          <Typography variant="subtitle2">Current signature</Typography>
          <Signature>{selected?.details?.newSignature ?? '—'}</Signature>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelected(undefined)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
LibraryChangesTab.displayName = 'LibraryChangesTab'

const Filters = styled(Box)(({ theme }) => ({ display: 'flex', gap: theme.spacing(1), minWidth: theme.spacing(35) }))
const Signature = styled(Typography)(({ theme }) => ({
  margin: theme.spacing(1, 0, 2),
  overflowWrap: 'anywhere',
  fontFamily: 'monospace',
}))

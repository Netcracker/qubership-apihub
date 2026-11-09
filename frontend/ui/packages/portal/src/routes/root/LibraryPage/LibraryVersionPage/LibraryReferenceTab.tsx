import {
  Alert,
  Box,
  Button,
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
import { useNavigate } from 'react-router-dom'

import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import { SearchBar } from '@netcracker/qubership-apihub-ui-shared/components/SearchBar'

import type { LibraryClassDto, LibraryVersionDto } from '@portal/entities/libraries'
import { getLibraryVersionPath } from './library-version'
import { useLibraryClasses } from './useLibraryClasses'

const KINDS = ['all', 'class', 'interface', 'enum', 'annotation', 'record'] as const
const PAGE_SIZE = 25

export const LibraryReferenceTab: FC<{ version: LibraryVersionDto }> = ({ version }) => {
  const [textFilter, setTextFilter] = useState('')
  const [kind, setKind] = useState<typeof KINDS[number]>('all')
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<LibraryClassDto>()
  const navigate = useNavigate()
  const { data, isLoading, error } = useLibraryClasses({
    libraryId: version.libraryId,
    version: version.version,
    textFilter: textFilter,
    kind: kind === 'all' ? undefined : kind,
    page: page,
    limit: PAGE_SIZE,
  })
  const classes = data?.classes ?? []

  return (
    <>
      <BodyCard
        header="API Reference"
        action={
          <Filters>
            <TextField
              select
              label="Kind"
              value={kind}
              onChange={event => {
                setKind(KINDS.find(value => value === event.target.value) ?? 'all')
                setPage(0)
              }}
            >
              {KINDS.map(value => <MenuItem key={value} value={value}>{value === 'all' ? 'All kinds' : value}
              </MenuItem>)}
            </TextField>
            <SearchBar
              placeholder="Search classes and methods"
              inputProps={{ 'aria-label': 'Search classes and methods' }}
              onValueChange={value => {
                setTextFilter(value)
                setPage(0)
              }}
            />
          </Filters>
        }
        body={
          <>
            {error && <Alert severity="error">{error.message}</Alert>}
            {isLoading ? <LoadingIndicator /> : (
              <TableContainer>
                <Table aria-label="Java API reference">
                  <TableHead>
                    <TableRow>
                      {['Class', 'Kind', 'Package', 'Method signature'].map(title => (
                        <TableCell key={title}>{title}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {classes.map(item => (
                      <TableRow key={`${item.classId}:${item.methodId ?? ''}`}>
                        <TableCell>
                          <Link
                            component="button"
                            onClick={() => setSelected(item)}
                          >
                            {item.qualifiedName}
                          </Link>
                        </TableCell>
                        <TableCell>{item.kind ?? '—'}</TableCell>
                        <TableCell>{item.packageName ?? '—'}</TableCell>
                        <TableCell>{item.signature ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                    {!classes.length && !error && (
                      <TableRow>
                        <TableCell colSpan={4}>No classes or methods match your filters.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            <TablePagination
              component="div"
              count={-1}
              page={page}
              rowsPerPage={PAGE_SIZE}
              rowsPerPageOptions={[PAGE_SIZE]}
              onPageChange={(_, value) => setPage(value)}
              nextIconButtonProps={{ disabled: isLoading || classes.length < PAGE_SIZE }}
            />
          </>
        }
      />
      <Dialog open={!!selected} onClose={() => setSelected(undefined)} fullWidth maxWidth="md">
        <DialogTitle>{selected?.qualifiedName}</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2">{selected?.kind} · {selected?.packageName}</Typography>
          <Signature>{selected?.signature ?? selected?.qualifiedName}</Signature>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              if (selected) {
                navigate(
                  `${getLibraryVersionPath(version.libraryId, version.version, 'changes')}?${new URLSearchParams({
                    classId: selected.classId,
                  })}`,
                )
              }
              setSelected(undefined)
            }}
          >
            View changes
          </Button>
          <Button onClick={() => setSelected(undefined)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
LibraryReferenceTab.displayName = 'LibraryReferenceTab'

const Filters = styled(Box)(({ theme }) => ({ display: 'flex', gap: theme.spacing(1), minWidth: theme.spacing(45) }))
const Signature = styled(Typography)(({ theme }) => ({
  marginTop: theme.spacing(2),
  overflowWrap: 'anywhere',
  fontFamily: 'monospace',
}))

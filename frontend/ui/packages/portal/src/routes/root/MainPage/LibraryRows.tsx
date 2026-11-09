import { Alert, Box, IconButton, Link, styled, TableCell, TableRow, Tooltip, Typography } from '@mui/material'
import type { FC, ReactNode } from 'react'
import { generatePath, NavLink } from 'react-router-dom'

import {
  ERROR_STATUS_MARKER_VARIANT,
  StatusMarker,
  SUCCESS_STATUS_MARKER_VARIANT,
} from '@netcracker/qubership-apihub-ui-shared/components/StatusMarker'
import { TextWithOverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/TextWithOverflowTooltip'
import type { Package } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { LayersIcon } from '@netcracker/qubership-apihub-ui-shared/icons/LayersIcon'
import { getTooltipMessage } from '@netcracker/qubership-apihub-ui-shared/utils/tooltip-message'

import { LibrarySettingsButton } from '@portal/components/LibrarySettingsButton'
import type { MavenLibraryDto } from '@portal/entities/libraries'
import { FavoriteIconButton } from '@portal/routes/root/MainPage/FavoriteIconButton'
import { useDisfavorLibrary, useFavorLibrary } from '@portal/routes/root/useLibrary'
import { LIBRARY_PAGE_PATH_PATTERN } from '../../../routes'

type LibraryRowsProps = {
  libraries: readonly MavenLibraryDto[]
  columns: readonly string[]
  error: Error | null
  level?: number
  tree?: boolean
  parents?: readonly Package[]
}

export const LibraryRows: FC<LibraryRowsProps> = (
  { libraries, columns, error, level = 0, tree = false, parents = [] },
) => {
  const { favorLibrary, isLoading: isFavoring, libraryId: favoringLibraryId } = useFavorLibrary()
  const { disfavorLibrary, isLoading: isDisfavoring, libraryId: disfavoringLibraryId } = useDisfavorLibrary()
  const isUpdatingFavorite = isFavoring || isDisfavoring

  const renderCell = (column: string, library: MavenLibraryDto): ReactNode => {
    switch (column) {
      case 'favorite':
        return (
          <IconButton
            size="small"
            aria-label={library.isFavorite ? 'Remove library from favorites' : 'Add library to favorites'}
            disabled={isUpdatingFavorite}
            onClick={() => {
              if (isUpdatingFavorite) return
              library.isFavorite ? disfavorLibrary(library.libraryId) : favorLibrary(library.libraryId)
            }}
          >
            <FavoriteIconButton
              isFavorite={library.isFavorite}
              isFetching={isFavoring && favoringLibraryId === library.libraryId ||
                isDisfavoring && disfavoringLibraryId === library.libraryId}
            />
          </IconButton>
        )
      case 'name': {
        return (
          <LibraryName sx={{ pl: tree ? level * 3.5 + 3 : 0 }}>
            <LayersIcon />
            <TextWithOverflowTooltip tooltipText={library.name}>
              <Link
                component={NavLink}
                to={generatePath(LIBRARY_PAGE_PATH_PATTERN, { libraryId: encodeURIComponent(library.libraryId) })}
              >
                {library.name}
              </Link>
            </TextWithOverflowTooltip>
            <LibraryActions>
              <LibrarySettingsButton libraryId={library.libraryId} />
            </LibraryActions>
          </LibraryName>
        )
      }
      case 'lastVersion': {
        const version = library.latestRelease ?? '―'
        return <TextWithOverflowTooltip tooltipText={version}>{version}</TextWithOverflowTooltip>
      }
      case 'bwcErrors': {
        const count = library.breakingChangesCount
        if (count === undefined) return undefined
        const variant = count > 0 ? ERROR_STATUS_MARKER_VARIANT : SUCCESS_STATUS_MARKER_VARIANT
        const tooltip = count > 0
          ? getTooltipMessage({ type: variant, count: count })
          : 'The latest release version has no breaking changes compared to the previous version'
        return (
          <Tooltip placement="right" title={tooltip}>
            <LibraryBwcStatus>
              <StatusMarker value={variant} />
              <Typography noWrap variant="inherit">{count}</Typography>
            </LibraryBwcStatus>
          </Tooltip>
        )
      }
      case 'id':
        return <TextWithOverflowTooltip tooltipText={library.libraryId}>{library.libraryId}</TextWithOverflowTooltip>
      case 'description':
        return (
          <TextWithOverflowTooltip tooltipText={library.description}>{library.description}</TextWithOverflowTooltip>
        )
      case 'group': {
        const parent = parents.find(item => item.key === library.parentPackageId)
        const path = parent
          ? [...(parent.parents ?? []), parent].map(item => item.name).join(' / ')
          : library.parentPackageId
        return <TextWithOverflowTooltip tooltipText={path}>{path}</TextWithOverflowTooltip>
      }
      default:
        return undefined
    }
  }

  return (
    <>
      {error && (
        <TableRow>
          <TableCell colSpan={columns.length}>
            <Alert severity="error">Libraries could not be loaded. {error.message}</Alert>
          </TableCell>
        </TableRow>
      )}
      {libraries.map(library => (
        <LibraryRow key={library.libraryId} hover data-testid={`LibraryRow-${library.libraryId}`}>
          {columns.map(column => (
            <TableCell key={column} data-testid={`Cell-${column}`}>
              {renderCell(column, library)}
            </TableCell>
          ))}
        </LibraryRow>
      ))}
    </>
  )
}
LibraryRows.displayName = 'LibraryRows'

const LibraryName = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
}))

const LibraryActions = styled(Box)({ marginLeft: 'auto', flexShrink: 0 })
const LibraryBwcStatus = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  width: 'min-content',
}))
const LibraryRow = styled(TableRow)({ '&:focus-within .hoverable': { visibility: 'visible' } })

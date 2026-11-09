import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined'
import { Alert, Box, Button, Menu, MenuItem, styled, Tooltip, Typography } from '@mui/material'
import { type FC, useState } from 'react'
import { NavLink } from 'react-router-dom'

import { SearchBar } from '@netcracker/qubership-apihub-ui-shared/components/SearchBar'
import { VersionStatusChip } from '@netcracker/qubership-apihub-ui-shared/components/VersionStatusChip'
import { PUBLISH_STATUSES } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'

import type { LibraryVersionDto } from '@portal/entities/libraries'
import { useLibraryVersions } from '../useLibraryVersions'
import { getLibraryVersionPath } from './library-version'

export const LibraryVersionSelector: FC<{ version: LibraryVersionDto }> = ({ version }) => {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [search, setSearch] = useState('')
  const { versions, isLoading, error } = useLibraryVersions(version.libraryId)
  const filtered = versions.filter(item =>
    [item.version, ...item.labels].some(text => text.toLowerCase().includes(search.toLowerCase())),
  )
  return (
    <>
      <Tooltip title={version.version}>
        <SelectorButton
          aria-label="Select library version"
          aria-haspopup="menu"
          aria-expanded={!!anchor}
          onClick={event => setAnchor(event.currentTarget)}
          endIcon={<KeyboardArrowDownOutlinedIcon />}
          data-testid="LibraryVersionSelector"
        >
          <Typography noWrap variant="subtitle3" color="primary">{version.version}</Typography>
        </SelectorButton>
      </Tooltip>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        <SearchArea>
          <SearchBar
            placeholder="Search versions"
            inputProps={{ 'aria-label': 'Search library version selector' }}
            onValueChange={setSearch}
          />
        </SearchArea>
        {error && <Alert severity="error">{error.message}</Alert>}
        {filtered.map(item => (
          <MenuItem
            key={item.version}
            component={NavLink}
            to={getLibraryVersionPath(version.libraryId, item.version)}
            onClick={() => setAnchor(null)}
            selected={version.version === item.version}
          >
            <MenuVersion title={item.version}>{item.version}</MenuVersion>
            <VersionStatusChip status={item.status} label={PUBLISH_STATUSES.get(item.status)} />
          </MenuItem>
        ))}
        {!filtered.length && !error && (
          <MenuItem disabled>{isLoading ? 'Loading…' : 'No versions match your search.'}</MenuItem>
        )}
      </Menu>
    </>
  )
}
LibraryVersionSelector.displayName = 'LibraryVersionSelector'

const SelectorButton = styled(Button)(({ theme }) => ({
  minWidth: 0,
  height: 20,
  maxWidth: theme.spacing(46),
  padding: 0,
  marginLeft: theme.spacing(1),
}))
const SearchArea = styled(Box)(({ theme }) => ({ padding: theme.spacing(1, 2) }))
const MenuVersion = styled(Box)(({ theme }) => ({
  maxWidth: theme.spacing(60),
  marginRight: theme.spacing(2),
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}))

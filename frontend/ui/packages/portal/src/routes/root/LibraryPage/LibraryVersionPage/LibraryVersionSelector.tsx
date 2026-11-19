import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined'
import { TabContext, TabList, TabPanel } from '@mui/lab'
import { Alert, Box, Button, styled, Tab } from '@mui/material'
import { type FC, memo, useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { MenuButtonItems } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/MenuButton'
import {
  NAVIGATION_PLACEHOLDER_AREA,
  NO_SEARCH_RESULTS,
  Placeholder,
} from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { SearchBar } from '@netcracker/qubership-apihub-ui-shared/components/SearchBar'
import { VersionTitle } from '@netcracker/qubership-apihub-ui-shared/components/Titles/VersionTitle'
import { VersionsTable } from '@netcracker/qubership-apihub-ui-shared/components/VersionsTable'
import {
  DRAFT_VERSION_STATUS,
  RELEASE_VERSION_STATUS,
  type VersionStatus,
} from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import type { PackageVersion } from '@netcracker/qubership-apihub-ui-shared/entities/versions'

import type { LibraryVersion } from '@portal/entities/libraries'
import { useLibraryVersions } from '../useLibraryVersions'
import { getLibraryVersionPath } from './library-version'
import { selectLibraryVersions, toLibraryVersionOption } from './libraryVersionOptions'

export const LibraryVersionSelector: FC<Readonly<{ version: LibraryVersion }>> = memo(({ version }) => {
  const [anchor, setAnchor] = useState<HTMLElement>()
  const [searchValue, setSearchValue] = useState('')
  const [activeTab, setActiveTab] = useState<VersionStatus>(RELEASE_VERSION_STATUS)
  const { versions, isLoading, error } = useLibraryVersions(version.libraryId)
  const navigate = useNavigate()
  const options = useMemo(() => selectLibraryVersions(versions, activeTab, searchValue).map(toLibraryVersionOption), [
    versions,
    activeTab,
    searchValue,
  ])
  const onClickVersion = useCallback((selected: PackageVersion | undefined) => {
    if (!selected) return
    navigate(getLibraryVersionPath(version.libraryId, selected.key))
    setAnchor(undefined)
  }, [navigate, version.libraryId])

  return (
    <Selector data-testid="VersionSelector">
      <SelectorButton
        aria-label="Select library version"
        aria-haspopup="menu"
        aria-expanded={!!anchor}
        variant="text"
        onClick={event => setAnchor(event.currentTarget)}
        endIcon={<KeyboardArrowDownOutlinedIcon />}
      >
        <VersionTitle version={version.version} revision={undefined} latestRevision subtitleVariant />
        <MenuButtonItems
          anchorEl={anchor}
          open={!!anchor}
          onClick={event => event.stopPropagation()}
          onClose={() => setAnchor(undefined)}
        >
          <SelectorContent>
            <TabContext value={activeTab}>
              <TabList sx={{ mb: 1, gridArea: 'tabs' }} onChange={(_, value) => setActiveTab(value)}>
                <Tab label="Release" value={RELEASE_VERSION_STATUS} data-testid="ReleaseButton" />
                <Tab label="Draft" value={DRAFT_VERSION_STATUS} data-testid="DraftButton" />
              </TabList>
              <VersionsPanel value={activeTab}>
                {error ? <Alert severity="error">{error.message}</Alert> : (
                  <Placeholder
                    invisible={options.length > 0 || isLoading}
                    area={NAVIGATION_PLACEHOLDER_AREA}
                    message={searchValue ? NO_SEARCH_RESULTS : 'No versions to display'}
                  >
                    <VersionsTable
                      value={options}
                      versionStatus={activeTab}
                      onClickVersion={onClickVersion}
                      isLoading={isLoading}
                    />
                  </Placeholder>
                )}
              </VersionsPanel>
            </TabContext>
            <Box gridArea="searchbar" sx={{ mb: 1 }}>
              <SearchBar onValueChange={setSearchValue} data-testid="VersionSearchBar" />
            </Box>
          </SelectorContent>
        </MenuButtonItems>
      </SelectorButton>
    </Selector>
  )
})
LibraryVersionSelector.displayName = 'LibraryVersionSelector'

const Selector = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  overflow: 'hidden',
  marginLeft: theme.spacing(1),
}))
const SelectorButton = styled(Button)(({ theme }) => ({
  minWidth: theme.spacing(0.5),
  height: 20,
  padding: 0,
  boxShadow: 'none',
  '&:hover': { boxShadow: 'none' },
}))
const SelectorContent = styled(Box)(({ theme }) => ({
  padding: theme.spacing(0, 2, 2),
  width: 600,
  overflow: 'hidden',
  display: 'grid',
  gap: theme.spacing(1),
  gridTemplateAreas: '\'tabs\' \'searchbar\' \'content\'',
}))
const VersionsPanel = styled(TabPanel)(({ theme }) => ({
  maxHeight: 300,
  width: '100%',
  paddingRight: theme.spacing(1),
  gridArea: 'content',
}))

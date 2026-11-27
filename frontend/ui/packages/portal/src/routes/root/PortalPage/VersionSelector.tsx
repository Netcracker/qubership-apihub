import { useCurrentPackage } from '@portal/components/CurrentPackageProvider'
import { useAsyncInvalidatePackageVersionContentByVersion } from '@portal/routes/root/usePackageVersionContent'
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined'
import { TabContext, TabList, TabPanel } from '@mui/lab'
import { Box, Button, Tab } from '@mui/material'
import { MenuButtonItems } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/MenuButton'
import {
  NAVIGATION_PLACEHOLDER_AREA,
  NO_SEARCH_RESULTS,
  Placeholder,
} from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { SearchBar } from '@netcracker/qubership-apihub-ui-shared/components/SearchBar'
import { VersionTitle } from '@netcracker/qubership-apihub-ui-shared/components/Titles/VersionTitle'
import { VersionsTable } from '@netcracker/qubership-apihub-ui-shared/components/VersionsTable'
import type { VersionStatus } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import {
  DRAFT_VERSION_STATUS,
  RELEASE_VERSION_STATUS,
} from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import type { PackageVersion } from '@netcracker/qubership-apihub-ui-shared/entities/versions'
import { usePackageVersions } from '@netcracker/qubership-apihub-ui-shared/hooks/versions/usePackageVersions'
import { isEmpty, isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { getSplittedVersionKey } from '@netcracker/qubership-apihub-ui-shared/utils/versions'
import type { FC, ReactNode } from 'react'
import { memo, useCallback, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useNavigation } from '../../NavigationProvider'
import {
  useFullMainVersion,
  useIsLatestRevision,
  useSetFullMainVersion,
  useSetIsLatestRevision,
} from './FullMainVersionProvider'
import { ClientValidationStatuses, useApiQualityClientValidationStatus } from './VersionPage/ApiQualityValidationSummaryProvider'
import { useVersionListSort } from './useVersionListSort'
import { VersionSortSelector } from './VersionSortSelector'

export const VersionSelector: FC = memo(() => {
  const [searchValue, setSearchValue] = useState('')
  const [anchor, setAnchor] = useState<HTMLElement>()
  const [activeTab, setActiveTab] = useState<VersionTab>(RELEASE_TAB)
  const statuses = useMemo(() => [VERSION_STATUS_MAP[activeTab]], [activeTab])
  const { packageId } = useParams()
  const [versionListSort, setVersionListSort] = useVersionListSort(packageId!)

  const { versions, areVersionsLoading } = usePackageVersions({
    status: statuses,
    textFilter: searchValue,
    sortBy: versionListSort.sortBy,
    sortOrder: versionListSort.sortOrder,
  })

  // Sorting makes no sense for a tab without versions; with no search results the tab still has versions
  const isSortDisabled = !areVersionsLoading && isEmpty(versions) && !searchValue

  const { navigateToOverview } = useNavigation()
  const setFullMainVersion = useSetFullMainVersion()
  const setIsLatestRevision = useSetIsLatestRevision()
  const invalidatePackageVersionContent = useAsyncInvalidatePackageVersionContentByVersion()

  const [, setClientValidationStatus] = useApiQualityClientValidationStatus()
  const currentPackage = useCurrentPackage()

  const onClickVersion = useCallback(async (version: PackageVersion | undefined) => {
    const { key, latestRevision } = version ?? {}
    const { versionKey } = getSplittedVersionKey(key)

    /* This solution is applied because redirecting before invalidation is complete leads to
    redundant displaying Outdated Revision Notification */
    await invalidatePackageVersionContent(versionKey)

    setClientValidationStatus?.(ClientValidationStatuses.CHECKING)

    setIsLatestRevision(latestRevision)
    setFullMainVersion(key)

    navigateToOverview({ packageKey: packageId!, versionKey: versionKey })
    setAnchor(undefined)
  }, [invalidatePackageVersionContent, navigateToOverview, packageId, setClientValidationStatus, setFullMainVersion, setIsLatestRevision])

  const selectorContent = useMemo(() =>
    <>
      <Placeholder
        invisible={isNotEmpty(versions) || areVersionsLoading}
        area={NAVIGATION_PLACEHOLDER_AREA}
        message={searchValue ? NO_SEARCH_RESULTS : 'No versions to display'}
      >
        <VersionsTable
          value={versions!}
          onClickVersion={onClickVersion}
          isLoading={areVersionsLoading}
          sortBy={versionListSort.sortBy}
          kind={currentPackage?.kind}
        />
      </Placeholder>
    </>, [areVersionsLoading, currentPackage?.kind, onClickVersion, searchValue, versionListSort.sortBy, versions])

  return (
    <Box display="flex" alignItems="center" gap={2} overflow="hidden" data-testid="VersionSelector">
      <Button
        sx={{ minWidth: 4, height: 20, p: 0, boxShadow: 'none', '&:hover': { boxShadow: 'none' } }}
        variant="text"
        onClick={({ currentTarget }) => setAnchor(currentTarget)}
        endIcon={<KeyboardArrowDownOutlinedIcon />}
      >
        <VersionSelectorTitle />
        <MenuButtonItems
          anchorEl={anchor}
          open={!!anchor}
          onClick={event => event.stopPropagation()}
          onClose={() => setAnchor(undefined)}
        >
          <Box
            sx={{ p: 2, pt: 0 }}
            width="600px"
            overflow="hidden"
            display="grid"
            gap={1}
            gridTemplateAreas="
              'tabs'
              'searchbar'
              'content'
            "
          >
            <TabContext value={activeTab}>
              <TabList
                sx={{ mb: 1, gridArea: 'tabs' }}
                onChange={(_, value) => setActiveTab(value)}
              >
                <Tab label="Release" value={RELEASE_TAB} data-testid="ReleaseButton" />
                <Tab label="Draft" value={DRAFT_TAB} data-testid="DraftButton" />
              </TabList>
              {ACTIVE_TAB_CONTENT_MAP[activeTab](selectorContent)}
            </TabContext>

            <Box
              gridArea="searchbar"
              overflow="hidden"
              display="grid"
              gap={1}
              gridTemplateColumns="1fr auto"
              sx={{ mb: 1 }}
            >
              <SearchBar onValueChange={setSearchValue} data-testid="VersionSearchBar" />
              <VersionSortSelector
                value={versionListSort}
                onChange={setVersionListSort}
                disabled={isSortDisabled}
              />
            </Box>
          </Box>
        </MenuButtonItems>
      </Button>
    </Box>
  )
})

const RELEASE_TAB = 'release'
const DRAFT_TAB = 'draft'

type VersionTab =
  | typeof RELEASE_TAB
  | typeof DRAFT_TAB

export const VERSION_STATUS_MAP: Record<VersionTab, VersionStatus> = {
  [RELEASE_TAB]: RELEASE_VERSION_STATUS,
  [DRAFT_TAB]: DRAFT_VERSION_STATUS,
}

const tabContentStyle = { maxHeight: '300px', width: '100%', pr: 1, gridArea: 'content' }

const ACTIVE_TAB_CONTENT_MAP: Record<VersionTab, (content: ReactNode) => ReactNode> = {
  [RELEASE_TAB]: (content) => (
    <TabPanel sx={tabContentStyle} value={RELEASE_TAB}>
      {content}
    </TabPanel>
  ),
  [DRAFT_TAB]: (content) => (
    <TabPanel sx={tabContentStyle} value={DRAFT_TAB}>
      {content}
    </TabPanel>
  ),
}

const VersionSelectorTitle: FC = memo(() => {
  const fullVersion = useFullMainVersion()
  const latestRevision = useIsLatestRevision()
  const { versionKey, revisionKey } = getSplittedVersionKey(fullVersion)

  return (
    <VersionTitle
      version={versionKey}
      revision={revisionKey}
      latestRevision={latestRevision}
    />
  )
})

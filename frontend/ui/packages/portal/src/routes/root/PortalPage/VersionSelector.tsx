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

import type { FC, ReactNode } from 'react'
import * as React from 'react'
import { memo, useCallback, useMemo, useState } from 'react'
import { Box, Button, Tab } from '@mui/material'
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined'
import { TabContext, TabList, TabPanel } from '@mui/lab'
import { useParams } from 'react-router-dom'
import { usePackageVersions } from '@netcracker/qubership-apihub-ui-shared/hooks/versions/usePackageVersions'
import { useNavigation } from '../../NavigationProvider'
import {
  useFullMainVersion,
  useIsLatestRevision,
  useSetFullMainVersion,
  useSetIsLatestRevision,
} from './FullMainVersionProvider'
import {
  NAVIGATION_PLACEHOLDER_AREA,
  NO_SEARCH_RESULTS,
  Placeholder,
} from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { MenuButtonItems } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/MenuButton'
import type { PackageVersion } from '@netcracker/qubership-apihub-ui-shared/entities/versions'
import { SearchBar } from '@netcracker/qubership-apihub-ui-shared/components/SearchBar'
import type { VersionStatus } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import {
  ARCHIVED_VERSION_STATUS,
  DRAFT_VERSION_STATUS,
  RELEASE_VERSION_STATUS,
} from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import { getSplittedVersionKey } from '@netcracker/qubership-apihub-ui-shared/utils/versions'
import { useAsyncInvalidatePackageVersionContentByVersion } from '@apihub/routes/root/usePackageVersionContent'
import { VersionsTable } from '@netcracker/qubership-apihub-ui-shared/components/VersionsTable'
import type { PackageVersionsSortBy, SortOrder } from '@netcracker/qubership-apihub-ui-shared/types/sorting'
import { ASC_ORDER, DESC_ORDER, SORT_BY_CREATED_AT, SORT_BY_VERSION } from '@netcracker/qubership-apihub-ui-shared/types/sorting'
import { VersionTitle } from '@netcracker/qubership-apihub-ui-shared/components/Titles/VersionTitle'

export const VersionSelector: FC = memo(() => {
  const [searchValue, setSearchValue] = useState('')
  const [anchor, setAnchor] = useState<HTMLElement>()
  const [activeTab, setActiveTab] = useState<VersionTab>(RELEASE_TAB)

  const [versions, isLoading] = usePackageVersions({
    status: VERSION_STATUS_MAP[activeTab],
    textFilter: searchValue,
    sortBy: VERSION_SORT_MAP[activeTab].sortBy,
    sortOrder: VERSION_SORT_MAP[activeTab].sortOrder,
  })

  const { navigateToOverview } = useNavigation()
  const { packageId } = useParams()
  const setFullMainVersion = useSetFullMainVersion()
  const setIsLatestRevision = useSetIsLatestRevision()
  const invalidatePackageVersionContent = useAsyncInvalidatePackageVersionContentByVersion()

  const onClickVersion = useCallback(async (version: PackageVersion | undefined) => {
    const { key, latestRevision } = version ?? {}
    const { versionKey } = getSplittedVersionKey(key)

    /* This solution is applied because redirecting before invalidation is complete leads to
    redundant displaying Outdated Revision Notification */
    await invalidatePackageVersionContent(versionKey)

    setIsLatestRevision(latestRevision)
    setFullMainVersion(key)

    navigateToOverview({ packageKey: packageId!, versionKey: versionKey })
    setAnchor(undefined)
  }, [invalidatePackageVersionContent, navigateToOverview, packageId, setFullMainVersion, setIsLatestRevision])

  const selectorContent = useMemo(() =>
    <>
      <Placeholder
        invisible={isNotEmpty(versions) || isLoading}
        area={NAVIGATION_PLACEHOLDER_AREA}
        message={searchValue ? NO_SEARCH_RESULTS : 'No versions to display'}
      >
        <VersionsTable
          value={versions!}
          versionStatus={VERSION_STATUS_MAP[activeTab]}
          onClickVersion={onClickVersion}
          isLoading={isLoading}/>
      </Placeholder>
    </>, [versions, isLoading, searchValue, activeTab, onClickVersion])

  return (
    <Box display="flex" alignItems="center" gap={2} overflow="hidden" data-testid="VersionSelector">
      <Button
        sx={{ minWidth: 4, height: 20, p: 0, boxShadow: 'none', '&:hover': { boxShadow: 'none' } }}
        variant="text"
        onClick={({ currentTarget }) => setAnchor(currentTarget)}
        endIcon={<KeyboardArrowDownOutlinedIcon/>}
      >
        <VersionSelectorTitle/>
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
                <Tab label="Release" value={RELEASE_TAB} data-testid="ReleaseButton"/>
                <Tab label="Draft" value={DRAFT_TAB} data-testid="DraftButton"/>
                <Tab label="Archived" value={ARCHIVED_TAB} data-testid="ArchivedButton"/>
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
              <SearchBar onValueChange={setSearchValue} data-testid="VersionSearchBar"/>
            </Box>
          </Box>
        </MenuButtonItems>
      </Button>
    </Box>
  )
})

const RELEASE_TAB = 'release'
const DRAFT_TAB = 'draft'
const ARCHIVED_TAB = 'archived'

type VersionTab =
  | typeof RELEASE_TAB
  | typeof DRAFT_TAB
  | typeof ARCHIVED_TAB

export const VERSION_STATUS_MAP: Record<VersionTab, VersionStatus> = {
  [RELEASE_TAB]: RELEASE_VERSION_STATUS,
  [DRAFT_TAB]: DRAFT_VERSION_STATUS,
  [ARCHIVED_TAB]: ARCHIVED_VERSION_STATUS,
}

type VersionSort = {
  sortBy: PackageVersionsSortBy
  sortOrder: SortOrder
}

export const VERSION_SORT_MAP: Record<VersionTab, VersionSort> = {
  [RELEASE_TAB]: { sortBy: SORT_BY_VERSION, sortOrder: DESC_ORDER },
  [DRAFT_TAB]: { sortBy: SORT_BY_CREATED_AT, sortOrder: DESC_ORDER },
  [ARCHIVED_TAB]: { sortBy: SORT_BY_VERSION, sortOrder: ASC_ORDER },
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
  [ARCHIVED_TAB]: (content) => (
    <TabPanel sx={tabContentStyle} value={ARCHIVED_TAB}>
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

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

import type { FC } from 'react'
import { memo, useEffect, useMemo, useState } from 'react'
import { Box, Tab } from '@mui/material'
import { useEvent } from 'react-use'
import { TabContext, TabList, TabPanel } from '@mui/lab'
import type { SearchResultTab } from './GlobalSearchTextProvider'
import {
  DOCUMENTS_TAB,
  OPERATIONS_TAB,
  PACKAGES_TAB,
  useGlobalSearchActiveTab,
  useGlobalSearchText,
  useSetGlobalSearchActiveTab,
  useSetGlobalSearchText,
} from './GlobalSearchTextProvider'
import { SearchResultTabLabel } from './SearchResultTabLabel'
import { useOperationsGlobalSearch } from './useOperationsGlobalSearch'
import { useDocumentsGlobalSearch } from './useDocumentsGlobalSearch'
import { usePackagesGlobalSearch } from './usePackagesGlobalSearch'
import { ApiOperationsSearchList } from './ApiOperationsSearchList'
import { DocumentSearchList } from './DocumentSearchList'
import { PackageSearchList } from './PackageSearchList'
import { SearchResultSkeleton } from './SearchResultSkeleton'
import type { GlobalSearchPanelDetails } from '@apihub/routes/EventBusProvider'
import { APPLY_GLOBAL_SEARCH_FILTERS } from '@apihub/routes/EventBusProvider'
import type { Level, SearchCriteria } from '@apihub/entities/global-search'
import { DOCUMENT_LEVEL, OPERATION_LEVEL, PACKAGE_LEVEL } from '@apihub/entities/global-search'
import { getOptionalBody } from '@netcracker/qubership-apihub-ui-shared/utils/request-bodies'
import { SearchBar } from '@netcracker/qubership-apihub-ui-shared/components/SearchBar'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import {
  CONTENT_PLACEHOLDER_AREA,
  NO_SEARCH_RESULTS,
  Placeholder,
} from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'

export const SearchResults: FC = memo(() => {
  const searchText = useGlobalSearchText()
  const setSearchText = useSetGlobalSearchText()

  const activeTab = useGlobalSearchActiveTab()
  const setActiveTab = useSetGlobalSearchActiveTab()

  const [apiSpecificSearchMode, setApiSpecificSearchMode] = useState(false)

  const [filters, setFilters] = useState<Omit<SearchCriteria, 'searchString'>>()
  useEvent(APPLY_GLOBAL_SEARCH_FILTERS, ({
    detail: {
      filters,
      apiSearchMode,
    },
  }: CustomEvent<GlobalSearchPanelDetails>): void => {
    setApiSpecificSearchMode(apiSearchMode)
    filters && setFilters(getOptionalBody(filters))
  })

  const currentLevel = useMemo(() => SEARCH_LEVEL_MAP[activeTab], [activeTab])

  const [{ operations }, isInitialOperationsLoading, fetchNextOperationsPage, isNextOperationsPageFetching, hasNextOperationsPage] = useOperationsGlobalSearch(
    filters
      ? { criteria: { ...filters, searchString: searchText }, enabled: currentLevel === OPERATION_LEVEL }
      : { criteria: { searchString: searchText }, enabled: currentLevel === OPERATION_LEVEL },
  )

  const [{ documents }, isInitialDocumentsLoading, fetchNextDocumentsPage, isNextDocumentsPageFetching, hasNextDocumentsPage] = useDocumentsGlobalSearch(
    filters
      ? { criteria: { ...filters, searchString: searchText }, enabled: currentLevel === DOCUMENT_LEVEL }
      : { criteria: { searchString: searchText }, enabled: currentLevel === DOCUMENT_LEVEL },
  )

  const [{ packages }, isInitialPackagesLoading, fetchNextPackagesPage, isNextPackagesPageFetching, hasNextPackagesPage] = usePackagesGlobalSearch(
    filters
      ? { criteria: { ...filters, searchString: searchText }, enabled: currentLevel === PACKAGE_LEVEL }
      : { criteria: { searchString: searchText }, enabled: currentLevel === PACKAGE_LEVEL },
  )

  useEffect(() => {apiSpecificSearchMode && setActiveTab(OPERATIONS_TAB)}, [apiSpecificSearchMode, setActiveTab])

  return (
    <Box
      height="100%"
      width="100%"
      overflow="hidden"
      display="grid"
      gridTemplateRows="auto auto 1fr"
      gridTemplateAreas="
        'searchBar'
        'tabs'
        'content'
    "
    >
      <Box gridArea="searchBar">
        <SearchBar
          value={searchText}
          onValueChange={setSearchText}
        />
      </Box>

      <TabContext value={activeTab}>
        <TabList
          sx={{ mt: 1, mb: 1, gridArea: 'tabs' }}
          onChange={(_, value) => setActiveTab(value)}
        >
          <Tab
            label={
              <SearchResultTabLabel
                key={OPERATION_LEVEL}
                label="API Operations"
                results={operations}
                isLoading={isInitialOperationsLoading}
              />
            }
            value={OPERATIONS_TAB}
            data-testid="ApiOperationsTabButton"
          />
          <Tab
            label={
              <SearchResultTabLabel
                key={DOCUMENT_LEVEL}
                label="Documents"
                results={documents}
                isLoading={isInitialDocumentsLoading}
              />
            }
            value={DOCUMENTS_TAB}
            data-testid="DocumentsTabButton"
          />
          <Tab
            label={
              <SearchResultTabLabel
                key={PACKAGE_LEVEL}
                label="Packages"
                results={packages}
                isLoading={isInitialPackagesLoading}
              />
            }
            value={PACKAGES_TAB}
            data-testid="PackagesTabButton"
          />
        </TabList>


        <TabPanel sx={tabPanelStyle} value={OPERATIONS_TAB}>
          {
            isInitialOperationsLoading
              ? <SearchResultSkeleton/>
              : isNotEmpty(operations)
                ? <ApiOperationsSearchList
                  value={operations}
                  searchText={searchText}
                  fetchNextPage={fetchNextOperationsPage}
                  isNextPageFetching={isNextOperationsPageFetching}
                  hasNextPage={hasNextOperationsPage}
                />
                : <Placeholder
                  invisible={isNotEmpty(operations)}
                  area={CONTENT_PLACEHOLDER_AREA}
                  message={searchText ? NO_SEARCH_RESULTS : 'No operations to display'}
                  testId="NoOperationsPlaceholder"
                />
          }
        </TabPanel>


        <TabPanel sx={tabPanelStyle} value={DOCUMENTS_TAB}>
          {
            isInitialDocumentsLoading
              ? <SearchResultSkeleton/>
              : isNotEmpty(documents)
                ? <DocumentSearchList
                  value={documents}
                  searchText={searchText}
                  fetchNextPage={fetchNextDocumentsPage}
                  isNextPageFetching={isNextDocumentsPageFetching}
                  hasNextPage={hasNextDocumentsPage}
                />
                : <Placeholder
                  invisible={isNotEmpty(documents)}
                  area={CONTENT_PLACEHOLDER_AREA}
                  message={searchText ? NO_SEARCH_RESULTS : 'No documents to display'}
                  testId="NoDocumentsPlaceholder"
                />
          }
        </TabPanel>


        <TabPanel sx={tabPanelStyle} value={PACKAGES_TAB}>
          {
            isInitialPackagesLoading
              ? <SearchResultSkeleton/>
              : isNotEmpty(packages)
                ? <PackageSearchList
                  value={packages}
                  searchText={searchText}
                  fetchNextPage={fetchNextPackagesPage}
                  isNextPageFetching={isNextPackagesPageFetching}
                  hasNextPage={hasNextPackagesPage}
                />
                : <Placeholder
                  invisible={isNotEmpty(packages)}
                  area={CONTENT_PLACEHOLDER_AREA}
                  message={searchText ? NO_SEARCH_RESULTS : 'No packages to display'}
                  testId="NoPackagesPlaceholder"
                />
          }
        </TabPanel>

      </TabContext>
    </Box>
  )
})

const tabPanelStyle = { height: '100%', width: '100%', overflow: 'scroll', pr: 1, gridArea: 'content' }

export const SEARCH_LEVEL_MAP: Record<SearchResultTab, Level> = {
  [PACKAGES_TAB]: PACKAGE_LEVEL,
  [OPERATIONS_TAB]: OPERATION_LEVEL,
  [DOCUMENTS_TAB]: DOCUMENT_LEVEL,
}

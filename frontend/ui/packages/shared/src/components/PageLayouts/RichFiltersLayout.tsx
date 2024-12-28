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

import { LayoutWithSidebar } from './LayoutWithSidebar'
import type { FC, MutableRefObject, ReactNode } from 'react'
import { memo, useMemo } from 'react'
import { Box } from '@mui/material'
import { SearchBar } from '../SearchBar'
import { SelectorWithIcons } from '../SelectorWithIcons'
import type { TestableProps } from '../Testable'
import { useStateWithExternal } from '../../hooks/common/useStateWithExternal'
import type { Key } from '../../entities/keys'
import { FilterButton } from '../Buttons/FilterButton'
import { SidebarPanel } from '../Panels/SidebarPanel'

export type ViewSelectorOptions = ReadonlyArray<{
  icon: ReactNode
  value: Key
  tooltip: string
}>

export type VersionOperationsLayoutProps = {
  body: ReactNode
  title: ReactNode
  viewMode?: Key
  viewOptions?: ViewSelectorOptions
  additionalActions?: ReactNode
  hideFiltersPanel?: boolean
  filtersApplied?: boolean
  exportButton?: ReactNode
  bodyRef?: MutableRefObject<HTMLDivElement | null>
  searchPlaceholder?: string
  setSearchValue?: (value: string) => void
  onOperationsViewChange?: (newViewMode: Key | undefined) => void
  onClickFilterButton?: (value: boolean) => void
  filters: ReactNode
} & TestableProps

// First Order Component //
export const RichFiltersLayout: FC<VersionOperationsLayoutProps> = memo<VersionOperationsLayoutProps>(({
  body,
  title,
  viewMode,
  viewOptions = [],
  onOperationsViewChange,
  hideFiltersPanel = false,
  filtersApplied = false,
  exportButton,
  additionalActions,
  bodyRef,
  onClickFilterButton,
  searchPlaceholder = 'Search',
  setSearchValue,
  filters,
  testId,
}) => {

  const [hiddenFiltersPanel, setHiddenFiltersPanel] = useStateWithExternal<boolean>(hideFiltersPanel, hideFiltersPanel, onClickFilterButton)
  const [selectedViewMode, setSelectedViewMode] = useStateWithExternal<Key | undefined>(viewMode, viewMode, onOperationsViewChange)

  const viewSelector = useMemo(() => {
    if (viewOptions.length <= 1) {
      return null
    }
    const [firstView, secondView] = viewOptions

    return (
      <SelectorWithIcons<Key>
        mode={selectedViewMode ?? firstView.value}
        firstIcon={firstView.icon}
        firstValue={firstView.value}
        firstTooltip={firstView.tooltip}
        secondIcon={secondView.icon}
        secondValue={secondView.value}
        secondTooltip={secondView.tooltip}
        onChange={(_, value) => setSelectedViewMode(value)}
      />
    )
  }, [selectedViewMode, setSelectedViewMode, viewOptions])

  const actions = useMemo(() => (
    <Box display="flex" alignItems="center" gap={2} ml="auto">
      {additionalActions}

      <SearchBar
        placeholder={searchPlaceholder}
        onValueChange={setSearchValue}
        data-testid="SearchOperations"
      />

      <FilterButton
        selected={hiddenFiltersPanel}
        onSelect={() => setHiddenFiltersPanel(!hiddenFiltersPanel)}
        showBadge={filtersApplied}
      />

      {viewSelector}

      {exportButton}
    </Box>
  ), [additionalActions, exportButton, filtersApplied, hiddenFiltersPanel, searchPlaceholder, setHiddenFiltersPanel, setSearchValue, viewSelector])

  return (
    <LayoutWithSidebar
      header={title}
      action={actions}
      sidebar={!hiddenFiltersPanel && (
        <SidebarPanel
          body={filters}
          withDivider
        />
      )}
      body={
        <Box height="100%" ref={bodyRef}>
          {body}
        </Box>
      }
      testId={testId}
    />
  )
})

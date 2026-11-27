import MenuOutlinedIcon from '@mui/icons-material/MenuOutlined'
import { Alert } from '@mui/material'
import type { ResizeCallback } from 're-resizable'
import { type FC, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import type { JavaApiClassListItem } from '@netcracker/qubership-apihub-api-doc-viewer'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import { RichFiltersLayout } from '@netcracker/qubership-apihub-ui-shared/components/PageLayouts/RichFiltersLayout'
import { ListBox } from '@netcracker/qubership-apihub-ui-shared/components/Panels/ListBox'
import { PageTitle } from '@netcracker/qubership-apihub-ui-shared/components/Titles/PageTitle'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { useResizeObserver } from '@netcracker/qubership-apihub-ui-shared/hooks/common/useResizeObserver'
import { SegmentItemIcon } from '@netcracker/qubership-apihub-ui-shared/icons/SegmentItemIcon'
import {
  DETAILED_OPERATIONS_VIEW_MODE,
  LIST_OPERATIONS_VIEW_MODE,
} from '@netcracker/qubership-apihub-ui-shared/types/views'
import { NAVIGATION_MAX_WIDTH } from '@netcracker/qubership-apihub-ui-shared/utils/page-layouts'

import { type LibraryVersion, LibraryVersionBuildStatuses } from '@portal/entities/libraries'
import { usePortalPageSettingsContext } from '@portal/routes/PortalPageSettingsProvider'
import {
  getJavaReferenceLink,
  isJavaReferenceTargetHidden,
  JAVA_TYPE_FILTER_SEARCH_PARAM,
  toLibraryClassKinds,
} from './javaapi/javaApi'
import { JavaClassListView } from './javaapi/JavaClassListView'
import { JavaClassListWithPreview } from './javaapi/JavaClassListWithPreview'
import { JavaTypeFilter, useJavaTypeFilter } from './javaapi/JavaTypeFilter'
import { toLibraryClassListItems } from './javaapi/libraryClassDocument'
import { JAVA_CLASS_SEARCH_PARAM } from './javaapi/useSelectedJavaClass'
import { LibraryVersionBuildError } from './LibraryVersionBuildError'
import { useLibraryClassPages } from './useLibraryClasses'
import { useLibraryClassDetails } from './useLibraryJavaClass'

const VIEW_OPTIONS = [
  { icon: <MenuOutlinedIcon fontSize="small" />, value: LIST_OPERATIONS_VIEW_MODE, tooltip: 'List view' },
  { icon: <SegmentItemIcon />, value: DETAILED_OPERATIONS_VIEW_MODE, tooltip: 'Detailed view' },
]
const SUBPAGE_MARGIN = 24

export const LibraryReferenceTab: FC<Readonly<{ version: LibraryVersion }>> = memo(({ version }) => {
  const [searchValue, setSearchValue] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedName = searchParams.get(JAVA_CLASS_SEARCH_PARAM)
  const [javaType] = useJavaTypeFilter()
  const {
    hideFiltersPanel,
    toggleHideFiltersPanel,
    operationsViewMode,
    toggleOperationsViewMode,
    previewSize,
    togglePreviewSize,
  } = usePortalPageSettingsContext()
  // A type in the URL (a click on a type name or link) shows the detailed view for that navigation only; the saved
  // mode, shared with the package Operations tab, changes only through the view toggle
  const viewMode = selectedName !== null ? DETAILED_OPERATIONS_VIEW_MODE : operationsViewMode
  const {
    data: pagedClasses,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useLibraryClassPages(version.libraryId, version.version, {
    // TODO(libraries-backend): textFilter must match `.` against the `$` of nested classes, or a search such as
    // `PropertyNamingStrategies.SnakeCaseStrategy` finds nothing (backend question 22)
    textFilter: searchValue.trim() || undefined,
    kinds: toLibraryClassKinds(javaType),
  })
  const classes = useMemo(() => toLibraryClassListItems(pagedClasses ?? []), [pagedClasses])
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const [bodyWidth, setBodyWidth] = useState<number>()
  useResizeObserver(bodyRef, setBodyWidth)
  // Only a new target (a link to a type) may clear the search and the type filter. Otherwise picking a filter that
  // hides the type in the URL would clear itself: the type stays in the URL while the filters change.
  const [revealedName, setRevealedName] = useState<string | null>(null)
  const targetName = selectedName !== revealedName ? selectedName : null
  const loadedTarget = classes.find(({ className }) => className === selectedName)
  const { data: targetDetails } = useLibraryClassDetails(
    loadedTarget ? undefined : version.libraryId,
    version.version,
    selectedName ?? undefined,
  )
  const target = useMemo(
    () => loadedTarget ?? (targetDetails ? toLibraryClassListItems([targetDetails])[0] : undefined),
    [loadedTarget, targetDetails],
  )
  const resetFilters = isJavaReferenceTargetHidden(targetName ? target : undefined, searchValue, javaType)

  useEffect(() => {
    if (!resetFilters && (target || targetDetails === null || selectedName === null)) setRevealedName(selectedName)
  }, [target, targetDetails, resetFilters, selectedName])

  useEffect(() => {
    if (!resetFilters) return
    setSearchValue('')
    setSearchParams(params => {
      params.delete(JAVA_TYPE_FILTER_SEARCH_PARAM)
      return params
    }, { replace: true })
  }, [resetFilters, setSearchParams])

  const prepareLinkFn = useCallback(
    (javaClass: JavaApiClassListItem) =>
      getJavaReferenceLink(version.libraryId, version.version, javaClass.className, javaType),
    [version.libraryId, version.version, javaType],
  )
  const onViewChange = (value: Key | undefined): void => {
    if (!value) return
    if (value === LIST_OPERATIONS_VIEW_MODE) {
      setSearchParams(params => {
        params.delete(JAVA_CLASS_SEARCH_PARAM)
        return params
      }, { replace: true })
    }
    toggleOperationsViewMode(value)
  }
  // Save the drawn width: the list bounds can clamp the preview away from its saved size
  const onResize: ResizeCallback = (_, __, element) => togglePreviewSize(element.offsetWidth)
  const maxPreviewWidth = bodyWidth !== undefined
    ? bodyWidth - SUBPAGE_MARGIN
    : NAVIGATION_MAX_WIDTH

  let body = (
    <ListBox>
      <JavaClassListView
        classes={classes}
        prepareLinkFn={prepareLinkFn}
        fetchNextPage={fetchNextPage}
        hasNextPage={hasNextPage}
        isNextPageFetching={isFetchingNextPage}
      />
    </ListBox>
  )
  if (version.metadata?.buildStatus === LibraryVersionBuildStatuses.ERROR) {
    body = <LibraryVersionBuildError version={version} />
  } else if (isLoading) body = <LoadingIndicator />
  else if (error) body = <Alert severity="error">{error.message}</Alert>
  else if (viewMode === DETAILED_OPERATIONS_VIEW_MODE) {
    body = (
      <JavaClassListWithPreview
        libraryId={version.libraryId}
        version={version.version}
        classes={classes}
        fetchNextPage={fetchNextPage}
        hasNextPage={hasNextPage}
        isNextPageFetching={isFetchingNextPage}
        prepareLinkFn={prepareLinkFn}
        initialSize={previewSize}
        handleResize={onResize}
        maxPreviewWidth={maxPreviewWidth}
      />
    )
  }

  return (
    <RichFiltersLayout
      title={<PageTitle title="API Reference" />}
      searchPlaceholder="Search Java types"
      searchValue={searchValue}
      setSearchValue={setSearchValue}
      hideFiltersPanel={hideFiltersPanel}
      onClickFilterButton={toggleHideFiltersPanel}
      filtersApplied={!!javaType}
      filters={<JavaTypeFilter />}
      viewMode={viewMode}
      viewOptions={VIEW_OPTIONS}
      onOperationsViewChange={onViewChange}
      hideExport
      bodyRef={bodyRef}
      body={body}
      data-testid="LibraryReferenceTab"
    />
  )
})
LibraryReferenceTab.displayName = 'LibraryReferenceTab'

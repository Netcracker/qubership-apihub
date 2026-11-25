import MenuOutlinedIcon from '@mui/icons-material/MenuOutlined'
import { Alert } from '@mui/material'
import type { ResizeCallback } from 're-resizable'
import { type FC, memo, useCallback, useEffect, useRef, useState } from 'react'
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
import { getJavaReferenceClasses, getJavaReferenceLink, JAVA_TYPE_FILTER_SEARCH_PARAM } from './javaapi/javaApi'
import { JavaClassListView } from './javaapi/JavaClassListView'
import { JavaClassListWithPreview } from './javaapi/JavaClassListWithPreview'
import { JavaTypeFilter, useJavaTypeFilter } from './javaapi/JavaTypeFilter'
import { JAVA_CLASS_SEARCH_PARAM } from './javaapi/useSelectedJavaClass'
import { LibraryVersionBuildError } from './LibraryVersionBuildError'
import { useLibraryJavaApiReport } from './useLibraryJavaApi'

const VIEW_OPTIONS = [
  { icon: <MenuOutlinedIcon fontSize="small" />, value: LIST_OPERATIONS_VIEW_MODE, tooltip: 'List view' },
  { icon: <SegmentItemIcon />, value: DETAILED_OPERATIONS_VIEW_MODE, tooltip: 'Detailed view' },
]
const SUBPAGE_MARGIN = 24

export const LibraryReferenceTab: FC<Readonly<{ version: LibraryVersion }>> = memo(({ version }) => {
  const [searchValue, setSearchValue] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedName = searchParams.get(JAVA_CLASS_SEARCH_PARAM)
  const { data, isLoading, error } = useLibraryJavaApiReport(version.libraryId, version.version)
  const [javaType] = useJavaTypeFilter()
  const {
    hideFiltersPanel,
    toggleHideFiltersPanel,
    operationsViewMode,
    toggleOperationsViewMode,
    previewSize,
    togglePreviewSize,
  } = usePortalPageSettingsContext()
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const [bodyWidth, setBodyWidth] = useState<number>()
  useResizeObserver(bodyRef, setBodyWidth)
  // Only a new target (a link to a type) may clear the search and the type filter. Otherwise picking a filter that
  // hides the type in the URL would clear itself: the type stays in the URL while the filters change.
  const [revealedName, setRevealedName] = useState<string | null>(null)
  const targetName = selectedName !== revealedName ? selectedName : null
  const { classes, resetFilters } = getJavaReferenceClasses(data?.classes ?? [], searchValue, javaType, targetName)

  useEffect(() => {
    if (data && !resetFilters) setRevealedName(selectedName)
  }, [data, resetFilters, selectedName])

  // A type in the URL (a click on a type name or link) shows the detailed view for that navigation only; the saved
  // mode, shared with the package Operations tab, changes only through the view toggle
  const viewMode = selectedName !== null ? DETAILED_OPERATIONS_VIEW_MODE : operationsViewMode

  useEffect(() => {
    if (!resetFilters) return
    setSearchValue('')
    setSearchParams(params => {
      params.delete(JAVA_TYPE_FILTER_SEARCH_PARAM)
      return params
    }, { replace: true })
  }, [resetFilters, setSearchParams])

  const prepareLinkFn = useCallback(
    (javaClass: JavaApiClassListItem) => getJavaReferenceLink(version.libraryId, version.version, javaClass.className),
    [version.libraryId, version.version],
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
  const onResize: ResizeCallback = (_, __, ___, delta) => togglePreviewSize(previewSize + delta.width)
  const maxPreviewWidth = bodyWidth !== undefined
    ? bodyWidth - SUBPAGE_MARGIN
    : NAVIGATION_MAX_WIDTH

  let body = (
    <ListBox>
      <JavaClassListView classes={classes} prepareLinkFn={prepareLinkFn} />
    </ListBox>
  )
  if (version.metadata?.buildStatus === LibraryVersionBuildStatuses.ERROR) {
    body = <LibraryVersionBuildError version={version} />
  } else if (isLoading) body = <LoadingIndicator />
  else if (error) body = <Alert severity="error">{error.message}</Alert>
  else if (!data) body = <Alert severity="info">No JavaAPI report is available for this version.</Alert>
  else if (viewMode === DETAILED_OPERATIONS_VIEW_MODE) {
    body = (
      <JavaClassListWithPreview
        libraryId={version.libraryId}
        version={version.version}
        classes={classes}
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

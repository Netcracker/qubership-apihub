import MenuOutlinedIcon from '@mui/icons-material/MenuOutlined'
import { Alert } from '@mui/material'
import type { ResizeCallback } from 're-resizable'
import { type FC, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import { RichFiltersLayout } from '@netcracker/qubership-apihub-ui-shared/components/PageLayouts/RichFiltersLayout'
import { ListBox } from '@netcracker/qubership-apihub-ui-shared/components/Panels/ListBox'
import { PageTitle } from '@netcracker/qubership-apihub-ui-shared/components/Titles/PageTitle'
import { useResizeObserver } from '@netcracker/qubership-apihub-ui-shared/hooks/common/useResizeObserver'
import { SegmentItemIcon } from '@netcracker/qubership-apihub-ui-shared/icons/SegmentItemIcon'
import {
  DETAILED_OPERATIONS_VIEW_MODE,
  LIST_OPERATIONS_VIEW_MODE,
} from '@netcracker/qubership-apihub-ui-shared/types/views'
import { NAVIGATION_MAX_WIDTH } from '@netcracker/qubership-apihub-ui-shared/utils/page-layouts'

import type { LibraryVersionDto } from '@portal/entities/libraries'
import { useSetBackwardLocationContext } from '@portal/routes/BackwardLocationProvider'
import { usePortalPageSettingsContext } from '@portal/routes/PortalPageSettingsProvider'
import { filterJavaClasses, getJavaClassPageLink } from './javaapi/java-api'
import { JavaClassListView } from './javaapi/JavaClassListView'
import { JavaClassListWithPreview } from './javaapi/JavaClassListWithPreview'
import { JavaTypeFilter, useJavaTypeFilter } from './javaapi/JavaTypeFilter'
import { useLibraryJavaApiReport } from './useLibraryJavaApi'

const VIEW_OPTIONS = [
  { icon: <MenuOutlinedIcon fontSize="small" />, value: LIST_OPERATIONS_VIEW_MODE, tooltip: 'List view' },
  { icon: <SegmentItemIcon />, value: DETAILED_OPERATIONS_VIEW_MODE, tooltip: 'Detailed view' },
]
const SUBPAGE_MARGIN = 24

export const LibraryReferenceTab: FC<{ version: LibraryVersionDto }> = ({ version }) => {
  const [searchValue, setSearchValue] = useState('')
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
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  const setBackwardLocation = useSetBackwardLocationContext()
  const classes = filterJavaClasses(data?.classes ?? [], searchValue, javaType)
  const openClass = (className: string): void => {
    setBackwardLocation(previous => ({ ...previous, fromOperation: { pathname, search } }))
    navigate(getJavaClassPageLink(version.libraryId, version.version, className))
  }
  const onResize: ResizeCallback = (_, __, ___, delta) => togglePreviewSize(previewSize + delta.width)
  const maxPreviewWidth = bodyWidth !== undefined
    ? bodyWidth - SUBPAGE_MARGIN
    : NAVIGATION_MAX_WIDTH

  let body = (
    <ListBox>
      <JavaClassListView classes={classes} onOpen={openClass} />
    </ListBox>
  )
  if (isLoading) body = <LoadingIndicator />
  else if (error) body = <Alert severity="error">{error.message}</Alert>
  else if (!data) body = <Alert severity="info">No JavaAPI report is available for this version.</Alert>
  else if (operationsViewMode === DETAILED_OPERATIONS_VIEW_MODE) {
    body = (
      <JavaClassListWithPreview
        document={data.document}
        classes={classes}
        allClasses={data.classes}
        onOpen={openClass}
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
      setSearchValue={setSearchValue}
      hideFiltersPanel={hideFiltersPanel}
      onClickFilterButton={toggleHideFiltersPanel}
      filtersApplied={!!javaType}
      filters={<JavaTypeFilter />}
      viewMode={operationsViewMode}
      viewOptions={VIEW_OPTIONS}
      onOperationsViewChange={value => value && toggleOperationsViewMode(value)}
      hideExport
      bodyRef={bodyRef}
      body={body}
      data-testid="LibraryReferenceTab"
    />
  )
}
LibraryReferenceTab.displayName = 'LibraryReferenceTab'

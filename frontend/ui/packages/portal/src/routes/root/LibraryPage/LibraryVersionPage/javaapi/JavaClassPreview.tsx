import { Alert, Box, styled } from '@mui/material'
import { type FC, memo, useMemo, useState } from 'react'

import {
  type JavaApiClassListItem,
  type JavaApiNavigationLinkBuilder,
  JavaClassViewer,
} from '@netcracker/qubership-apihub-api-doc-viewer'
import '@netcracker/qubership-apihub-api-doc-viewer/dist/style.css'
import { ContractPreviewPanel } from '@netcracker/qubership-apihub-ui-shared/components/ContractPreviewPanel'
import { JsonRawSpecView } from '@netcracker/qubership-apihub-ui-shared/components/SpecificationDialog/JsonRawSpecView'
import {
  DOC_SPEC_VIEW_MODE,
  RAW_SPEC_VIEW_MODE,
  type SpecViewMode,
} from '@netcracker/qubership-apihub-ui-shared/components/SpecViewToggler'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'

import { useLibraryClassDetails, useLibraryJavaClass } from '../useLibraryJavaClass'
import { JavaClassNavigationLink } from './JavaClassNavigationLink'
import { JavaClassTitleWithMeta } from './JavaClassTitleWithMeta'
import { JavaClassViewModeToggler } from './JavaClassViewModeToggler'
import { toLibraryClassListItems } from './libraryClassDocument'

type JavaClassPreviewProps = Readonly<{
  libraryId: Key
  version: string
  className: string | undefined
  javaClass: JavaApiClassListItem | undefined
  navigationLinkBuilder: JavaApiNavigationLinkBuilder
  maxWidthHeaderToolbar: number
}>

export const JavaClassPreview: FC<JavaClassPreviewProps> = memo<JavaClassPreviewProps>(({
  libraryId,
  version,
  className,
  javaClass,
  navigationLinkBuilder,
  maxWidthHeaderToolbar,
}) => {
  const { data, isLoading, error } = useLibraryJavaClass(libraryId, version, className ?? '', 'report')
  const { data: details } = useLibraryClassDetails(libraryId, version, className)
  const titleClass = useMemo(
    () => javaClass ?? (details ? toLibraryClassListItems([details])[0] : undefined),
    [javaClass, details],
  )
  const [viewMode, setViewMode] = useState<SpecViewMode>(DOC_SPEC_VIEW_MODE)
  const classKey = useMemo(() => (className ? { className } : undefined), [className])
  const rawData = data?.raw
  let content = classKey && data && (
    <ViewerBox data-testid="JavaApiClassViewer">
      <ViewerScrollBox>
        <JavaClassViewer
          source={data.document}
          classKey={classKey}
          navigationLinkBuilder={navigationLinkBuilder}
          navigationLinkComponent={JavaClassNavigationLink}
          noHeading
        />
      </ViewerScrollBox>
    </ViewerBox>
  )
  if (viewMode === RAW_SPEC_VIEW_MODE) content = <JsonRawSpecView data={rawData} />
  if (details === null) content = <Alert severity="info">Java type not found.</Alert>
  if (error) content = <Alert severity="error">{error.message}</Alert>
  return (
    <ContractPreviewPanel
      title={titleClass && (
        <JavaClassTitleWithMeta
          onlyTitle
          javaClass={titleClass}
        />
      )}
      action={<JavaClassViewModeToggler mode={viewMode} onChange={setViewMode} />}
      isLoading={!!className && isLoading}
      hasContent={!!className && (!!data || !!error)}
      maxWidthHeaderToolbar={maxWidthHeaderToolbar}
      data-testid="JavaClassPreview"
    >
      {content}
    </ContractPreviewPanel>
  )
})
JavaClassPreview.displayName = 'JavaClassPreview'

// The top padding sits outside the scrolling box, as in the operation preview, so it stays while the class scrolls
const ViewerBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  paddingTop: theme.spacing(1),
}))

const ViewerScrollBox = styled(Box)(({ theme }) => ({
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  padding: theme.spacing(0, 2, 1),
}))

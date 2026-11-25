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

import { useLibraryJavaClass } from '../useLibraryJavaClass'
import { JavaClassNavigationLink } from './JavaClassNavigationLink'
import { JavaClassTitleWithMeta } from './JavaClassTitleWithMeta'
import { JavaClassViewModeToggler } from './JavaClassViewModeToggler'

type JavaClassPreviewProps = Readonly<{
  libraryId: Key
  version: string
  javaClass: JavaApiClassListItem | undefined
  navigationLinkBuilder: JavaApiNavigationLinkBuilder
  maxWidthHeaderToolbar: number
}>

export const JavaClassPreview: FC<JavaClassPreviewProps> = memo<JavaClassPreviewProps>(({
  libraryId,
  version,
  javaClass,
  navigationLinkBuilder,
  maxWidthHeaderToolbar,
}) => {
  const { data, isLoading, error } = useLibraryJavaClass(libraryId, version, javaClass?.className ?? '', 'report')
  const [viewMode, setViewMode] = useState<SpecViewMode>(DOC_SPEC_VIEW_MODE)
  const classKey = useMemo(() => javaClass && { className: javaClass.className }, [javaClass])
  const rawData = data?.raw
  let content = classKey && data && (
    <ViewerBox data-testid="JavaApiClassViewer">
      <JavaClassViewer
        source={data.document}
        classKey={classKey}
        navigationLinkBuilder={navigationLinkBuilder}
        navigationLinkComponent={JavaClassNavigationLink}
        noHeading
      />
    </ViewerBox>
  )
  if (viewMode === RAW_SPEC_VIEW_MODE) content = <JsonRawSpecView data={rawData} />
  if (error) content = <Alert severity="error">{error.message}</Alert>
  return (
    <ContractPreviewPanel
      title={javaClass && (
        <JavaClassTitleWithMeta
          onlyTitle
          javaClass={javaClass}
        />
      )}
      action={<JavaClassViewModeToggler mode={viewMode} onChange={setViewMode} />}
      isLoading={!!javaClass && isLoading}
      hasContent={!!javaClass && (!!data || !!error)}
      maxWidthHeaderToolbar={maxWidthHeaderToolbar}
      data-testid="JavaClassPreview"
    >
      {content}
    </ContractPreviewPanel>
  )
})
JavaClassPreview.displayName = 'JavaClassPreview'

const ViewerBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1, 2),
  height: '100%',
  overflow: 'auto',
}))

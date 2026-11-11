import { Box, styled } from '@mui/material'
import { type FC, useMemo, useState } from 'react'

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

import type { LibraryJavaApiDocumentDto } from '@portal/entities/libraries'
import { JavaClassNavigationLink } from './JavaClassNavigationLink'
import { JavaClassTitleWithMeta } from './JavaClassTitleWithMeta'
import { JavaClassViewModeToggler } from './JavaClassViewModeToggler'

type JavaClassPreviewProps = {
  document: LibraryJavaApiDocumentDto
  javaClass: JavaApiClassListItem | undefined
  navigationLinkBuilder: JavaApiNavigationLinkBuilder
  onOpen: (className: string) => void
  maxWidthHeaderToolbar: number
}

export const JavaClassPreview: FC<JavaClassPreviewProps> = ({
  document,
  javaClass,
  navigationLinkBuilder,
  onOpen,
  maxWidthHeaderToolbar,
}) => {
  const [viewMode, setViewMode] = useState<SpecViewMode>(DOC_SPEC_VIEW_MODE)
  const classKey = useMemo(() => javaClass && { className: javaClass.className }, [javaClass])
  const rawData = useMemo(
    () => javaClass && { className: javaClass.className, elements: javaClass.elements },
    [javaClass],
  )
  return (
    <ContractPreviewPanel
      title={javaClass && (
        <JavaClassTitleWithMeta
          onlyTitle
          javaClass={javaClass}
          onTitleClick={() => onOpen(javaClass.className)}
        />
      )}
      action={<JavaClassViewModeToggler mode={viewMode} onChange={setViewMode} />}
      isLoading={false}
      hasContent={!!javaClass}
      maxWidthHeaderToolbar={maxWidthHeaderToolbar}
      data-testid="JavaClassPreview"
    >
      {viewMode === RAW_SPEC_VIEW_MODE
        ? <JsonRawSpecView data={rawData} />
        : classKey && (
          <ViewerBox data-testid="JavaApiClassViewer">
            <JavaClassViewer
              source={document}
              classKey={classKey}
              navigationLinkBuilder={navigationLinkBuilder}
              navigationLinkComponent={JavaClassNavigationLink}
              noHeading
            />
          </ViewerBox>
        )}
    </ContractPreviewPanel>
  )
}
JavaClassPreview.displayName = 'JavaClassPreview'

const ViewerBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1, 2),
  height: '100%',
  overflow: 'auto',
}))

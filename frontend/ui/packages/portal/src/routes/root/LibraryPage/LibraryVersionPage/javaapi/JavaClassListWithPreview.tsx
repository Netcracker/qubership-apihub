import type { ResizeCallback } from 're-resizable'
import { type FC, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

import type { JavaApiClassListItem, JavaApiNavigationLinkBuilder } from '@netcracker/qubership-apihub-api-doc-viewer'
import { MetaClickableListWithPreview } from '@netcracker/qubership-apihub-ui-shared/components/MetaClickableListWithPreview'

import type { LibraryJavaApiDocumentDto } from '@portal/entities/libraries'
import { JAVA_CLASSES_EMPTY_MESSAGE } from './java-api'
import { JavaClassPreview } from './JavaClassPreview'
import { JavaClassTitleWithMeta } from './JavaClassTitleWithMeta'
import { JAVA_CLASS_SEARCH_PARAM, useSelectedJavaClass } from './useSelectedJavaClass'

type JavaClassListWithPreviewProps = {
  document: LibraryJavaApiDocumentDto
  classes: ReadonlyArray<JavaApiClassListItem>
  allClasses: ReadonlyArray<JavaApiClassListItem>
  onOpen: (className: string) => void
  initialSize: number
  handleResize: ResizeCallback
  maxPreviewWidth: number
}

export const JavaClassListWithPreview: FC<JavaClassListWithPreviewProps> = ({
  document,
  classes,
  allClasses,
  onOpen,
  initialSize,
  handleResize,
  maxPreviewWidth,
}) => {
  const [selectedClass, selectClass] = useSelectedJavaClass(allClasses, classes)
  const [searchParams] = useSearchParams()
  const navigationLinkBuilder: JavaApiNavigationLinkBuilder = useCallback((className: string) => {
    const params = new URLSearchParams(searchParams)
    params.set(JAVA_CLASS_SEARCH_PARAM, className)
    return `?${params}`
  }, [searchParams])
  return (
    <MetaClickableListWithPreview<JavaApiClassListItem>
      items={classes}
      getItemKey={getClassKey}
      renderTitle={renderTitle}
      onRowClick={selectClass}
      selectedItemKey={selectedClass?.className}
      initialSize={initialSize}
      handleResize={handleResize}
      maxWidth={maxPreviewWidth}
      emptyMessage={JAVA_CLASSES_EMPTY_MESSAGE}
      previewComponent={
        <JavaClassPreview
          document={document}
          javaClass={selectedClass}
          navigationLinkBuilder={navigationLinkBuilder}
          onOpen={onOpen}
          maxWidthHeaderToolbar={initialSize}
        />
      }
    />
  )
}
JavaClassListWithPreview.displayName = 'JavaClassListWithPreview'

function getClassKey(javaClass: JavaApiClassListItem): string {
  return javaClass.className
}

function renderTitle(javaClass: JavaApiClassListItem): JSX.Element {
  return <JavaClassTitleWithMeta javaClass={javaClass} />
}

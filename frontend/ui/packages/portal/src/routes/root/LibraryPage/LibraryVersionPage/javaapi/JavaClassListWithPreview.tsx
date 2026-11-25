import type { Path } from '@remix-run/router'
import type { ResizeCallback } from 're-resizable'
import { type FC, memo, useCallback } from 'react'

import type { JavaApiClassListItem } from '@netcracker/qubership-apihub-api-doc-viewer'
import { MetaClickableListWithPreview } from '@netcracker/qubership-apihub-ui-shared/components/MetaClickableListWithPreview'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'

import { JAVA_CLASSES_EMPTY_MESSAGE } from './javaApi'
import { JavaClassPreview } from './JavaClassPreview'
import { JavaClassTitleWithMeta } from './JavaClassTitleWithMeta'
import { useJavaClassNavigationLinkBuilder } from './useJavaClassNavigationLinkBuilder'
import { useSelectedJavaClass } from './useSelectedJavaClass'

type JavaClassListWithPreviewProps = Readonly<{
  libraryId: Key
  version: string
  classes: ReadonlyArray<JavaApiClassListItem>
  prepareLinkFn: (javaClass: JavaApiClassListItem) => Partial<Path>
  initialSize: number
  handleResize: ResizeCallback
  maxPreviewWidth: number
}>

export const JavaClassListWithPreview: FC<JavaClassListWithPreviewProps> = memo<JavaClassListWithPreviewProps>(({
  libraryId,
  version,
  classes,
  prepareLinkFn,
  initialSize,
  handleResize,
  maxPreviewWidth,
}) => {
  const [selectedClass, selectClass] = useSelectedJavaClass(classes)
  const navigationLinkBuilder = useJavaClassNavigationLinkBuilder()
  const renderTitle = useCallback(
    (javaClass: JavaApiClassListItem, link?: Partial<Path>) => (
      <JavaClassTitleWithMeta javaClass={javaClass} link={link} />
    ),
    [],
  )
  return (
    <MetaClickableListWithPreview<JavaApiClassListItem>
      items={classes}
      getItemKey={getClassKey}
      renderTitle={renderTitle}
      prepareLinkFn={prepareLinkFn}
      onRowClick={selectClass}
      selectedItemKey={selectedClass?.className}
      initialSize={initialSize}
      handleResize={handleResize}
      maxWidth={maxPreviewWidth}
      emptyMessage={JAVA_CLASSES_EMPTY_MESSAGE}
      previewComponent={
        <JavaClassPreview
          libraryId={libraryId}
          version={version}
          javaClass={selectedClass}
          navigationLinkBuilder={navigationLinkBuilder}
          maxWidthHeaderToolbar={initialSize}
        />
      }
    />
  )
})
JavaClassListWithPreview.displayName = 'JavaClassListWithPreview'

function getClassKey(javaClass: JavaApiClassListItem): string {
  return javaClass.className
}

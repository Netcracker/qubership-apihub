import type { FC } from 'react'
import { memo, useCallback } from 'react'
import fileDownload from 'js-file-download'
import { UnsupportedFilePlaceholder } from '../UnsupportedFilePlaceholder'
import type { Spec } from '../../entities/specs'

export type UnsupportedViewerProps = {
  value: string
  spec: Spec
}

export const UnsupportedViewer: FC<UnsupportedViewerProps> = memo<UnsupportedViewerProps>(({ value, spec }) => {

  const downloadSpec = useCallback(() => {
    fileDownload(value, spec.name + spec.extension)
  }, [spec, value])

  return (
    <UnsupportedFilePlaceholder
      message="Preview is not available"
      onDownload={downloadSpec}
    />
  )
})

import { Box } from '@mui/material'
import type { SxProps } from '@mui/system'
import type { FC } from 'react'
import { memo } from 'react'
import { EXTENSION_TO_TYPE_LANGUAGE_MAP } from '../types/languages'
import type { FileExtension } from '../utils/files'
import type { SpecType } from '../utils/specs'
import type { SpecItemUri } from '../utils/specifications'
import { ModuleFetchingErrorBoundary } from './ModuleFetchingErrorBoundary/ModuleFetchingErrorBoundary'
import { MonacoDiffEditor } from './MonacoDiffEditor'

export type RawDiffViewProps = {
  beforeValue: BeforeSpecContent
  afterValue: AfterSpecContent
  extension: FileExtension
  type: SpecType
  selectedUri?: SpecItemUri
  sx?: SxProps
}

type BeforeSpecContent = string
type AfterSpecContent = string

export const RawSpecDiffView: FC<RawDiffViewProps> = memo<RawDiffViewProps>(({
  beforeValue,
  afterValue,
  type,
  extension,
  selectedUri,
  sx,
}) => {
  return (
    <ModuleFetchingErrorBoundary>
      <Box height="100%" minWidth={0} sx={sx} data-testid="RawDiffView">
        <MonacoDiffEditor
          before={beforeValue}
          after={afterValue}
          type={type}
          language={EXTENSION_TO_TYPE_LANGUAGE_MAP[extension]}
          selectedUri={selectedUri}
        />
      </Box>
    </ModuleFetchingErrorBoundary>
  )
})

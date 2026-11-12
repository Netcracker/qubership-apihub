import type { FC } from 'react'
import { memo } from 'react'
import type { SxProps } from '@mui/material'
import { Box } from '@mui/material'
import { MonacoEditor } from '../MonacoEditor'
import type { SpecType } from '../../utils/specs'
import type { FileExtension } from '../../utils/files'
import type { SpecItemUri } from '../../utils/specifications'
import { EXTENSION_TO_TYPE_LANGUAGE_MAP } from '../../types/languages'
import { ModuleFetchingErrorBoundary } from '../ModuleFetchingErrorBoundary/ModuleFetchingErrorBoundary'

export type RawSpecViewProps = {
  value: SpecContent
  extension: SpecExtension
  type: SpecType
  selectedUri?: SpecItemUri
  sx?: SxProps
  searchPhrase?: string
  onSearchPhraseChange?: (value: string | undefined) => void
}

type SpecContent = string
type SpecExtension = FileExtension

export const RawSpecView: FC<RawSpecViewProps> = /* @__PURE__ */ memo<RawSpecViewProps>((
  {
    value,
    extension,
    type,
    selectedUri,
    sx,
    searchPhrase,
    onSearchPhraseChange,
  },
) => {
  return (
    <ModuleFetchingErrorBoundary>
      <Box mx={-4} height="100%" minWidth={0} sx={sx} data-testid="RawView">
        <MonacoEditor
          value={value}
          type={type}
          language={EXTENSION_TO_TYPE_LANGUAGE_MAP[extension]}
          selectedUri={selectedUri}
          searchPhrase={searchPhrase}
          onSearchPhraseChange={onSearchPhraseChange}
        />
      </Box>
    </ModuleFetchingErrorBoundary>
  )
})

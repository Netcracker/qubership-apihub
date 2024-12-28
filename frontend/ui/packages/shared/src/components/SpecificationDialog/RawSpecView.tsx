/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { FC } from 'react'
import { memo } from 'react'
import type { SxProps } from '@mui/material'
import { Box } from '@mui/material'
import { MonacoEditor } from '../MonacoEditor'
import type { SpecType } from '../../utils/specs'
import type { FileExtension } from '../../utils/files'
import { EXTENSION_TO_TYPE_LANGUAGE_MAP } from '../../types/languages'

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
type SpecItemUri = string
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
  )
})

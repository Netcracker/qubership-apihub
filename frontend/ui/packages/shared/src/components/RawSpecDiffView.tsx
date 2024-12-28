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
import { Box } from '@mui/material'
import type { SxProps } from '@mui/system'
import type { FileExtension } from '../utils/files'
import { EXTENSION_TO_TYPE_LANGUAGE_MAP } from '../types/languages'
import type { SpecType } from '../utils/specs'
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
type SpecItemUri = string

export const RawSpecDiffView: FC<RawDiffViewProps> = memo<RawDiffViewProps>(({
  beforeValue,
  afterValue,
  type,
  extension,
  selectedUri,
  sx,
}) => {
  return (
    <Box height="100%" minWidth={0} sx={sx} data-testid="RawDiffView">
      <MonacoDiffEditor
        before={beforeValue}
        after={afterValue}
        type={type}
        language={EXTENSION_TO_TYPE_LANGUAGE_MAP[extension]}
        selectedUri={selectedUri}
      />
    </Box>
  )
})

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

import 'monaco-editor/esm/vs/editor/editor.all.js'
import 'monaco-editor/esm/vs/language/json/monaco.contribution'
import 'monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution'
import 'monaco-editor/esm/vs/basic-languages/markdown/markdown.contribution'
import 'monaco-editor/esm/vs/basic-languages/protobuf/protobuf.contribution'

import type { FC } from 'react'
import { memo } from 'react'
import { useMonacoDiffEditorElement } from './useMonacoDiffEditorElement'
import type { SpecItemUri } from '@netcracker/qubership-apihub-ui-shared/utils/specifications'

export type MonacoDiffEditorElementProps = {
  before: string
  after: string
  selectedUri?: SpecItemUri
}

const MonacoDiffEditorElement: FC<MonacoDiffEditorElementProps> = memo<MonacoDiffEditorElementProps>(({
  before,
  after,
  selectedUri,
}) => {
  const element = useMonacoDiffEditorElement({ before, after, selectedUri })

  return (
    <div
      ref={element}
      style={{ height: '100%' }}
    />
  )
})

export default MonacoDiffEditorElement

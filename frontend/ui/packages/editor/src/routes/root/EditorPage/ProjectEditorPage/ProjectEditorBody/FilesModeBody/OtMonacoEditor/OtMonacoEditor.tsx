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
import 'monaco-editor/esm/vs/basic-languages/protobuf/protobuf.contribution'
import 'monaco-editor/esm/vs/basic-languages/markdown/markdown.contribution'
import '@netcracker/qubership-apihub-ui-shared/components/MonacoEditor/index.css'

import type { FC } from 'react'
import { memo, useEffect } from 'react'
import { useOtMonaco } from './useOtMonaco'
import { WSMonacoEditor } from './ws-monaco'
import type { SpecType } from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import type { SpecItemUri } from '@netcracker/qubership-apihub-ui-shared/utils/specifications'
import { useAuthorization } from '@netcracker/qubership-apihub-ui-shared/hooks/authorization'
import type { DocumentSnapshotEventData } from '@apihub/entities/ws-file-events'
import type { FileProblem } from '@apihub/entities/file-problems'
import {
  useConnectedUsers,
  useConnecting,
  useFileEditingWebSocket,
  useUserCursors,
} from '../../../FileEditingWebSocketProvider'
import { useFileSearchParam } from '../../../../../useFileSearchParam'
import type { LanguageType } from '@netcracker/qubership-apihub-ui-shared/types/languages'

export type OtMonacoEditorProps = {
  initialDocument: DocumentSnapshotEventData
  fileType: SpecType
  language?: LanguageType
  readonly?: boolean
  problems?: FileProblem[]
  selectedUri?: SpecItemUri
  onChange?: (content: string) => void
}

const OtMonacoEditor: FC<OtMonacoEditorProps> = memo<OtMonacoEditorProps>(({
  initialDocument,
  fileType,
  language,
  readonly,
  problems,
  selectedUri,
  onChange,
}) => {
  const [element, editor] = useOtMonaco({
    value: initialDocument.document[0],
    type: fileType,
    language: language,
    readonly: readonly,
    problems: problems,
    selectedUri: selectedUri,
    setMonacoContent: onChange,
  })

  const connecting = useConnecting()
  const cursors = useUserCursors()
  const connectedUsers = useConnectedUsers()

  const [authorization] = useAuthorization()

  const websocket = useFileEditingWebSocket()

  const [fileId] = useFileSearchParam()

  useEffect(() => {
    if (editor && fileId && websocket) {
      const { key = '', name = '' } = authorization?.user ?? {}

      const wsMonacoEditor = new WSMonacoEditor(
        {
          announcementDuration: Infinity,
          websocket: websocket,
          initialDocument: initialDocument,
          editor: editor,
          userId: key,
          userName: name,
          users: connectedUsers,
          cursors: cursors,
        },
      )

      return () => {
        wsMonacoEditor?.dispose()
      }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorization?.user, editor, readonly, initialDocument, websocket])

  useEffect(() => {
    editor?.updateOptions({ readOnly: readonly || connecting })
  }, [connecting, editor, readonly])

  return (
    <div
      ref={element}
      style={{ height: '100%' }}
    />
  )
})

export default OtMonacoEditor

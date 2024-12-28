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

import { setDiagnosticsOptions } from 'monaco-yaml'
import type { editor as Editor, IDisposable } from 'monaco-editor'
import { Uri } from 'monaco-editor'
import {
  OPENAPI_2_0_SPEC_TYPE,
  OPENAPI_3_0_SPEC_TYPE,
  OPENAPI_3_1_SPEC_TYPE,
} from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import { JSON_FILE_EXTENSION, YAML_FILE_EXTENSION, YML_FILE_EXTENSION } from '@netcracker/qubership-apihub-ui-shared/utils/files'

export function preconfigureOtMonaco(): void {
  const getFileMasks = (schema: string, ...extensions: string[]): string[] => {
    return extensions.map(extension => `${schema}/*${extension}`)
  }

  setDiagnosticsOptions({
    enableSchemaRequest: true,
    hover: true,
    completion: true,
    validate: true,
    format: true,
    schemas: [
      {
        uri: '/schemas/openapi/2.0.json',
        fileMatch: getFileMasks(OPENAPI_2_0_SPEC_TYPE, YAML_FILE_EXTENSION, YML_FILE_EXTENSION, JSON_FILE_EXTENSION),
      },
      {
        uri: '/schemas/openapi/3.0.json',
        fileMatch: getFileMasks(OPENAPI_3_0_SPEC_TYPE, YAML_FILE_EXTENSION, YML_FILE_EXTENSION, JSON_FILE_EXTENSION),
      },
      {
        uri: '/schemas/openapi/3.1.json',
        fileMatch: getFileMasks(OPENAPI_3_1_SPEC_TYPE, YAML_FILE_EXTENSION, YML_FILE_EXTENSION, JSON_FILE_EXTENSION),
      },
    ],
  })
}

// https://github.com/microsoft/monaco-editor/issues/3354#issuecomment-1271778606
export function registerLinkOpener(
  editor: Editor.IStandaloneCodeEditor | null,
  onLinkClick: (url: string | URL) => void,
): IDisposable {
  const linkDetector = editor?.getContribution('editor.linkDetector')
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const customOpener = linkDetector?.openerService._openers.unshift({
    open: async (resource: Uri | string) => {
      if (typeof resource === 'string') {
        resource = Uri.parse(resource)
      }
      const openInCurrentTab = resource.authority === location.host
      openInCurrentTab && onLinkClick(`?${resource.query}`)
      return openInCurrentTab
    },
  })
  return {
    dispose: () => {
      customOpener?.()
    },
  }
}

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

import type { editor as Editor } from 'monaco-editor'
import { editor, languages } from 'monaco-editor'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { registerLinkOpener } from './configurator'
import registerLinkProvider = languages.registerLinkProvider
import ILinksList = languages.ILinksList
import ITextModel = editor.ITextModel

export function useRegisterLinks(
  editor: Editor.IStandaloneCodeEditor | null,
  origin?: string,
  pathname?: string,
  currentBranch?: string,
  mode?: string,
  fileKey?: string,
): void {
  const navigate = useNavigate()

  useEffect(() => {
    if (pathname && currentBranch && mode && fileKey && origin) {
      const linkProvider = registerLinkProvider(['yaml', 'json'], {
        provideLinks(model: ITextModel): ILinksList {
          const foundMatches = model.findMatches(
            '(?<=\\$ref:)\\s?["\'](.*)?["\']',
            false,
            true,
            false,
            null,
            true,
          )
          return {
            links: foundMatches
              .filter(({ matches }) => matches && !matches[1].startsWith('#/'))
              .map(({ matches, range }) => ({
                range: range,
                url: `${origin}${pathname}?branch=${encodeURIComponent(currentBranch)}&mode=${mode}&file=${encodeURIComponent(calculateAbsoluteFilePath(matches?.[1] ?? '', fileKey ?? ''))}`,
              })),
          }
        },
      })
      const linkOpener = registerLinkOpener(editor, navigate)

      return () => {
        linkProvider.dispose()
        linkOpener.dispose()
      }
    }
  }, [currentBranch, editor, fileKey, mode, navigate, origin, pathname])
}

function calculateAbsoluteFilePath(refPath: string, fileKey: string): string {
  const path = new URL(refPath, `file:///${fileKey}`).href
  return `${path.split('file:///')[1].split('#')[0]}`
}

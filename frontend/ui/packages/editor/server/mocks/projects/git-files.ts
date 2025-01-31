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

import type { GitFilesDto } from '../git-files/types'

export const GIT_FILES: Record<string, GitFilesDto> = {
  '/': {
    files: [
      {
        name: 'main',
        isFolder: true,
      },
      {
        name: 'full-openapi.example.yaml',
        isFolder: true,
      },
      {
        name: 'readme.md',
        isFolder: false,
      },
      {
        name: 'sample.postman_collection.yaml',
        isFolder: false,
      },
    ],
  },
  '/main': {
    files: [
      {
        name: 'test',
        isFolder: true,
      },
    ],
  },
  '/main/test': {
    files: [
      {
        name: 'api',
        isFolder: true,
      },
    ],
  },
  '/main/test/api': {
    files: [
      {
        name: 'my',
        isFolder: true,
      },
    ],
  },
  '/main/test/api/my': {
    files: [
      {
        name: 'very',
        isFolder: true,
      },
    ],
  },
  '/main/test/api/my/very': {
    files: [
      {
        name: 'special',
        isFolder: true,
      },
    ],
  },
  '/main/test/api/my/very/special': {
    files: [
      {
        name: 'folder',
        isFolder: true,
      },
    ],
  },
  '/main/test/api/my/very/special/folder': {
    files: [
      {
        name: 'some-loooooooooong-name.yaml',
        isFolder: false,
      },
    ],
  },
  '/openapi': {
    files: [
      {
        name: 'full-openapi.example.yaml',
        isFolder: true,
      },
      {
        name: 'petstore-opeenapi.yaml',
        isFolder: false,
      },
    ],
  },
}

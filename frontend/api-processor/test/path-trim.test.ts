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

import { trimPath } from '../src/utils/path'

const PATHS = [
  ['servers', 0, 'url'],
  ['paths', '/path2', 'put', 'responses', 200],
  ['components', 'schemas', 'UpgradeRequest', 'type'],
  ['components', 'responses', 200, 'content'],
  ['components', 'headers', 'content-range', 'description'],
  ['security', 0, 'oAuthSample'],
  ['externalDocs', 'description'],
]

const TRIMMED_PATHS = [
  ['servers', 0],
  ['paths', '/path2'],
  ['components', 'schemas', 'UpgradeRequest'],
  ['components', 'responses', 200],
  ['components', 'headers', 'content-range'],
  ['security', 0],
  ['externalDocs'],
]

describe('Path trim test', () => {
  test('Path trim test', async () => {
    PATHS.forEach((path, index) => {
      expect(trimPath(path)).toEqual(TRIMMED_PATHS[index])
    })
  })
})

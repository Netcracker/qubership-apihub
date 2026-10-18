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

import {
  APIHUB_API_COMPATIBILITY_KIND_BWC,
  APIHUB_API_COMPATIBILITY_KIND_NO_BWC,
  ApihubApiCompatibilityKind,
  BuildResult,
  Labels,
} from '../src'
import { buildPackageFromContent } from './helpers'

const BWC = APIHUB_API_COMPATIBILITY_KIND_BWC
const NO_BWC = APIHUB_API_COMPATIBILITY_KIND_NO_BWC

const FILE_ID = 'spec.gql'
// Two operations
const SPEC = `type Query {
  fruits: String
  vegetables: String
}`

// Difference from `apiKinds.test.ts`:
//   - `apiKinds.test.ts` covers REST and asserts only the DOCUMENT apiKind, exhaustively
//     exercising the shared `calculateFileApiKind` resolution (uppercase / experimental / invalid /
//     priority between the sources).
//   - This file covers the GraphQL-specific bit that resolution does NOT: every OPERATION of the
//     document inherits the document apiKind (`graphql.operation.ts`). It therefore keeps one
//     representative of each source (default / file label / version label / build config) and checks
//     document + all operations, instead of re-testing the shared resolver.
describe('GraphQL build api-kind', () => {
  // Document apiKind + apiKind of every operation — they must all match.
  const documentAndOperationsApiKind = (result: BuildResult): (ApihubApiCompatibilityKind | undefined)[] => {
    const document = result.documents.get(FILE_ID)
    const operations = Array.from(result.operations.values())
    return [document?.apiKind, ...operations.map(operation => operation.apiKind)]
  }

  it.each<{ id: string; desc: string; fileLabels?: Labels; versionLabels?: Labels; xApiKind?: string; expected: ApihubApiCompatibilityKind }>([
    { id: 'default', desc: 'no labels → BWC by default', expected: BWC },
    { id: 'file-nb', desc: 'file label no-BWC', fileLabels: ['apihub/x-api-kind: no-BWC'], expected: NO_BWC },
    { id: 'version-nb', desc: 'version label no-BWC', versionLabels: ['apihub/x-api-kind: no-BWC'], expected: NO_BWC },
    { id: 'config-nb', desc: 'build config xApiKind no-BWC', xApiKind: 'no-BWC', expected: NO_BWC },
  ])('should apply $desc to the document and all its operations', async ({ id, fileLabels, versionLabels, xApiKind, expected }) => {
    const result = await buildPackageFromContent(`gql-build-apikind/${id}`, FILE_ID, SPEC, fileLabels, versionLabels, xApiKind)

    const apiKinds = documentAndOperationsApiKind(result)
    expect(apiKinds).toHaveLength(3) // document + 2 operations
    for (const apiKind of apiKinds) {
      expect(apiKind).toEqual(expected)
    }
  })
})

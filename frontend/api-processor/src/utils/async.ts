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
import { normalize } from '@netcracker/qubership-apihub-api-unifier'
import { v3 as AsyncAPIV3 } from '@asyncapi/parser/esm/spec-types'
import { FIRST_REFERENCE_KEY_PROPERTY, INLINE_REFS_FLAG } from '../consts'
import { removeComponents } from './operations.utils'

export async function asyncFunction(fun: () => void): Promise<null> {
  return new Promise((resolve, reject) =>
    setTimeout(() => {
      try {
        fun()
        resolve(null)
      } catch (error) {
        reject(error)
      }
    }),
  )
}

export function normalizeAsyncApiToRefsDocument(sourceDocument: AsyncAPIV3.AsyncAPIObject): AsyncAPIV3.AsyncAPIObject {
  return normalize(
    removeComponents(sourceDocument),
    {
      mergeAllOf: false,
      firstReferenceKeyProperty: FIRST_REFERENCE_KEY_PROPERTY,
      inlineRefsFlag: INLINE_REFS_FLAG,
      source: sourceDocument,
    },
  ) as AsyncAPIV3.AsyncAPIObject
}

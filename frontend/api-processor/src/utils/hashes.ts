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

import objectHash, { NotUndefined } from 'object-hash'
import { isObject } from './objects'

export type ObjectHashCache = WeakMap<object, string>

export const _calculateMd5Hash = (value: NotUndefined): string => {
  // object hash works only with object keys available in Object.keys() method
  return objectHash(value, { algorithm: 'md5' })
}

export const calculateHash = (
  value: unknown,
  objectHashCache?: ObjectHashCache,
): string => {
  if (value === undefined) return ''

  if (!objectHashCache || !isObject(value)) {
    return _calculateMd5Hash(value)
  }

  const cachedHash = objectHashCache.get(value)
  if (cachedHash) {
    return cachedHash
  }

  const hash = _calculateMd5Hash(value)
  objectHashCache.set(value, hash)
  return hash
}

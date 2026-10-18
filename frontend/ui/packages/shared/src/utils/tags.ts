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

import { DEFAULT_TAG, EMPTY_TAG } from '../entities/operations'

export function areDefaultTags(tags: readonly string[] | undefined): boolean {
  return !tags || tags.includes(EMPTY_TAG) || tags.includes(DEFAULT_TAG)
}

export function containsTag(
  tags: readonly string[] | undefined,
  tag?: string,
): boolean | undefined {

  return tags?.includes(tag ?? EMPTY_TAG)
}

export function isAppliedSearchValueForTag(tag: string, searchValue: string): boolean {
  const [tagLower, searchValueLower] = [tag.toLowerCase(), searchValue.toLowerCase()]
  return tagLower.includes(searchValueLower)
}

export function isEmptyTag(tag?: string): boolean {
  return tag === DEFAULT_TAG
}

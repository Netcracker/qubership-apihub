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

import { LIKE_TYPE_INCLUDE_PROPERTIES_GROUP_RELATION } from 'main/domain/like/type'
import {
  HasIdentityLike,
  HasPrimaryLike,
  HasReferenceFromGroupToClassLike,
  HasTypeLike,
} from 'main/domain/like/base'
import { createCustomEqual } from 'fast-equals'
import { equalsByIdentity, equalsByPrimary, equalsByReferenceFromGroupToClass } from 'main/domain/like/base-equals'
import { IsEqualFunction } from 'main/domain/base'

export interface IncludePropertiesGroupRelationLike extends HasIdentityLike, HasTypeLike<typeof LIKE_TYPE_INCLUDE_PROPERTIES_GROUP_RELATION>, HasPrimaryLike, HasReferenceFromGroupToClassLike {
}

export const equalsIncludePropertiesGroupRelationByLayout: IsEqualFunction<IncludePropertiesGroupRelationLike> = createCustomEqual({
  createCustomConfig: () => ({
    areObjectsEqual: equalsIncludePropertiesGroupRelationLikeByLayoutImpl,
  }),
})

export const equalsIncludePropertiesGroupRelationByVisual: IsEqualFunction<IncludePropertiesGroupRelationLike> = createCustomEqual({
  createCustomConfig: () => ({
    areObjectsEqual: equalsIncludePropertiesGroupRelationLikeByVisualImpl,
  }),
})

function equalsIncludePropertiesGroupRelationLikeByLayoutImpl(first: IncludePropertiesGroupRelationLike, second: IncludePropertiesGroupRelationLike): boolean {
  return equalsByIdentity(first, second)
    && equalsByReferenceFromGroupToClass(first, second)
}

function equalsIncludePropertiesGroupRelationLikeByVisualImpl(first: IncludePropertiesGroupRelationLike, second: IncludePropertiesGroupRelationLike): boolean {
  return equalsByPrimary(first, second)
}